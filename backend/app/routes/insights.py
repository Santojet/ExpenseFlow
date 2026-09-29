"""
Insights Routes — Smart Analytics, Predictions, Gamification & What-If Planner
"""

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from datetime import date, timedelta
from sqlalchemy import func
from collections import defaultdict
import calendar

from app.extensions import db
from app.models.expense import Expense
from app.models.salary import Salary
from app.models.budget import Budget
from app.models.savings_goal import SavingsGoal

insights_bp = Blueprint(
    "insights",
    __name__,
    url_prefix="/api/insights",
)


def _get_monthly_expenses(org_id, user_id, months=6):
    """Returns dict: {'2026-08': 12500.0, '2026-09': 14200.0}"""
    results = {}
    today = date.today()
    for i in range(months):
        # Go back i months from current
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        month_key = f"{year}-{month:02d}"
        last_day = calendar.monthrange(year, month)[1]
        month_start = f"{month_key}-01"
        month_end = f"{month_key}-{last_day:02d}"

        total = db.session.execute(
            db.select(func.coalesce(func.sum(Expense.amount), 0))
            .where(
                Expense.organization_id == org_id,
                Expense.user_id == user_id,
                Expense.expense_date >= month_start,
                Expense.expense_date <= month_end,
            )
        ).scalar_one()
        results[month_key] = float(total)
    return results


def _get_category_breakdown(org_id, user_id, month_key):
    """Returns category-wise spending for a given month."""
    last_day = calendar.monthrange(int(month_key[:4]), int(month_key[5:7]))[1]
    month_start = f"{month_key}-01"
    month_end = f"{month_key}-{last_day:02d}"

    rows = db.session.execute(
        db.select(Expense.category, func.sum(Expense.amount))
        .where(
            Expense.organization_id == org_id,
            Expense.user_id == user_id,
            Expense.expense_date >= month_start,
            Expense.expense_date <= month_end,
        )
        .group_by(Expense.category)
    ).all()

    return {row[0]: float(row[1]) for row in rows}


def _get_daily_pattern(org_id, user_id, days=60):
    """Returns day-of-week spending averages."""
    since = date.today() - timedelta(days=days)
    rows = db.session.execute(
        db.select(Expense.expense_date, Expense.amount)
        .where(
            Expense.organization_id == org_id,
            Expense.user_id == user_id,
            Expense.expense_date >= since.isoformat(),
        )
    ).all()

    day_totals = defaultdict(float)
    day_counts = defaultdict(int)
    for row in rows:
        dow = row[0].weekday()  # 0=Monday, 6=Sunday
        day_totals[dow] += float(row[1])
        day_counts[dow] += 1

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    return {
        day_names[d]: round(day_totals[d] / max(1, day_counts[d]), 2)
        for d in range(7)
    }


@insights_bp.get("/predict")
@jwt_required()
def predict_spending():
    """
    Predict next month's spending using weighted average of past months.
    More recent months get higher weight.
    """
    claims = get_jwt()
    org_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    monthly = _get_monthly_expenses(org_id, user_id, months=6)
    values = list(monthly.values())  # most recent first

    if not any(v > 0 for v in values):
        return {
            "success": True,
            "prediction": None,
            "message": "Not enough data to predict",
            "months_analyzed": 0,
        }, 200

    # Weighted average: recent months have higher weight
    weights = [6, 5, 4, 3, 2, 1][:len(values)]
    weighted_sum = sum(v * w for v, w in zip(values, weights))
    total_weight = sum(w for v, w in zip(values, weights) if v > 0)
    prediction = weighted_sum / total_weight if total_weight > 0 else 0

    # Predict next month
    today = date.today()
    next_month = today.month + 1
    next_year = today.year
    if next_month > 12:
        next_month = 1
        next_year += 1
    next_month_key = f"{next_year}-{next_month:02d}"

    # Get current month category breakdown for category-level predictions
    current_month = today.strftime("%Y-%m")
    current_breakdown = _get_category_breakdown(org_id, user_id, current_month)

    # Scale category predictions proportionally
    current_total = sum(current_breakdown.values()) or 1
    category_predictions = {
        cat: round(amt / current_total * prediction, 2)
        for cat, amt in current_breakdown.items()
    }

    # Historical data for chart
    historical = [
        {"month": k, "amount": v}
        for k, v in sorted(monthly.items())
    ]

    return {
        "success": True,
        "prediction": round(prediction, 2),
        "next_month": next_month_key,
        "category_predictions": category_predictions,
        "historical": historical,
        "months_analyzed": len([v for v in values if v > 0]),
        "trend": "increasing" if len(values) >= 2 and values[0] > values[1] else "decreasing",
    }, 200


@insights_bp.get("/whatif")
@jwt_required()
def what_if_planner():
    """
    Simulate: if I save X extra per month, when do I reach my goals?
    ?monthly_saving=2000&months=12
    """
    claims = get_jwt()
    org_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    monthly_saving = request.args.get("monthly_saving", 0, type=float)
    sim_months = request.args.get("months", 12, type=int)
    sim_months = min(max(sim_months, 1), 120)  # 1–120 months cap

    # Current savings
    paid_salary = db.session.execute(
        db.select(func.coalesce(func.sum(Salary.amount), 0))
        .where(Salary.organization_id == org_id, Salary.user_id == user_id, Salary.status == "paid")
    ).scalar_one()

    total_expenses = db.session.execute(
        db.select(func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.organization_id == org_id, Expense.user_id == user_id)
    ).scalar_one()

    current_savings = max(0, float(paid_salary) - float(total_expenses))

    # Average monthly expense (last 3 months)
    monthly_data = _get_monthly_expenses(org_id, user_id, months=3)
    avg_monthly_expense = sum(monthly_data.values()) / max(1, len([v for v in monthly_data.values() if v > 0]))

    # Projection timeline
    projection = []
    running_savings = current_savings
    today = date.today()
    for i in range(1, sim_months + 1):
        month = today.month + i
        year = today.year
        while month > 12:
            month -= 12
            year += 1
        month_key = f"{year}-{month:02d}"
        running_savings += monthly_saving
        projection.append({
            "month": month_key,
            "savings": round(running_savings, 2),
        })

    # Goals analysis
    goals = db.session.execute(
        db.select(SavingsGoal).where(
            SavingsGoal.organization_id == org_id,
            SavingsGoal.user_id == user_id,
            SavingsGoal.is_active == True,
        )
    ).scalars().all()

    goal_analysis = []
    for g in goals:
        target = float(g.target_amount)
        remaining = max(0, target - current_savings)
        if monthly_saving > 0:
            months_needed = remaining / monthly_saving
            achievement_date = date.today() + timedelta(days=int(months_needed * 30.5))
        else:
            months_needed = None
            achievement_date = None
        goal_analysis.append({
            "id": g.id,
            "title": g.title,
            "target_amount": target,
            "current_savings": round(current_savings, 2),
            "remaining": round(remaining, 2),
            "months_needed": round(months_needed, 1) if months_needed is not None else None,
            "achievement_date": achievement_date.isoformat() if achievement_date else None,
            "is_already_achieved": current_savings >= target,
        })

    return {
        "success": True,
        "current_savings": round(current_savings, 2),
        "monthly_saving_input": monthly_saving,
        "avg_monthly_expense": round(avg_monthly_expense, 2),
        "total_extra_saved": round(monthly_saving * sim_months, 2),
        "projection": projection,
        "goal_analysis": goal_analysis,
    }, 200


@insights_bp.get("/alerts")
@jwt_required()
def get_budget_alerts():
    """
    Return budget alert status — over budget, near limit, upcoming recurring expenses.
    """
    claims = get_jwt()
    org_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    today = date.today()
    current_month = today.strftime("%Y-%m")

    # Get all budgets for current month
    budgets = db.session.execute(
        db.select(Budget).where(
            Budget.organization_id == org_id,
            Budget.user_id == user_id,
            Budget.month == current_month,
        )
    ).scalars().all()

    alerts = []
    for b in budgets:
        last_day = calendar.monthrange(today.year, today.month)[1]
        month_start = f"{current_month}-01"
        month_end = f"{current_month}-{last_day:02d}"

        spent = float(db.session.execute(
            db.select(func.coalesce(func.sum(Expense.amount), 0))
            .where(
                Expense.organization_id == org_id,
                Expense.user_id == user_id,
                Expense.category == b.category,
                Expense.expense_date >= month_start,
                Expense.expense_date <= month_end,
            )
        ).scalar_one())

        limit = float(b.monthly_limit)
        pct = (spent / limit * 100) if limit > 0 else 0

        if pct >= 100:
            alerts.append({
                "type": "over_budget",
                "severity": "danger",
                "category": b.category,
                "spent": round(spent, 2),
                "limit": limit,
                "percentage": round(pct, 1),
                "message": f"❌ {b.category} budget exceeded! Spent ৳{spent:,.0f} of ৳{limit:,.0f}",
            })
        elif pct >= 80:
            alerts.append({
                "type": "near_limit",
                "severity": "warning",
                "category": b.category,
                "spent": round(spent, 2),
                "limit": limit,
                "percentage": round(pct, 1),
                "message": f"⚠️ {b.category} is at {pct:.0f}% of budget. Only ৳{limit-spent:,.0f} left.",
            })

    # Upcoming recurring expenses (next 7 days)
    in_seven = today + timedelta(days=7)
    upcoming = db.session.execute(
        db.select(Expense).where(
            Expense.organization_id == org_id,
            Expense.user_id == user_id,
            Expense.is_recurring == True,
            Expense.next_due_date != None,
            Expense.next_due_date >= today,
            Expense.next_due_date <= in_seven,
        ).order_by(Expense.next_due_date)
    ).scalars().all()

    for u in upcoming:
        days_left = (u.next_due_date - today).days
        alerts.append({
            "type": "upcoming_recurring",
            "severity": "info",
            "category": u.category,
            "title": u.title,
            "amount": float(u.amount),
            "due_date": u.next_due_date.isoformat(),
            "days_left": days_left,
            "message": f"🔄 '{u.title}' due in {days_left} day(s) — ৳{u.amount:,.0f}",
        })

    return {
        "success": True,
        "alerts": alerts,
        "alert_count": len(alerts),
        "has_danger": any(a["severity"] == "danger" for a in alerts),
    }, 200


@insights_bp.get("/gamification")
@jwt_required()
def get_gamification():
    """
    Gamification: streaks, badges, level, and financial health score.
    """
    claims = get_jwt()
    org_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    today = date.today()

    # ── Budget Adherence Score (0-30) ─────────────────────────────────────────
    current_month = today.strftime("%Y-%m")
    budgets = db.session.execute(
        db.select(Budget).where(
            Budget.organization_id == org_id,
            Budget.user_id == user_id,
            Budget.month == current_month,
        )
    ).scalars().all()

    budget_score = 0
    budget_details = []
    if budgets:
        within_count = 0
        for b in budgets:
            last_day = calendar.monthrange(today.year, today.month)[1]
            spent = float(db.session.execute(
                db.select(func.coalesce(func.sum(Expense.amount), 0))
                .where(
                    Expense.organization_id == org_id,
                    Expense.user_id == user_id,
                    Expense.category == b.category,
                    Expense.expense_date >= f"{current_month}-01",
                    Expense.expense_date <= f"{current_month}-{last_day:02d}",
                )
            ).scalar_one())
            if spent <= float(b.monthly_limit):
                within_count += 1
            budget_details.append({
                "category": b.category,
                "within": spent <= float(b.monthly_limit)
            })
        budget_score = int((within_count / len(budgets)) * 30)
    else:
        budget_score = 15  # neutral if no budgets set

    # ── Savings Rate Score (0-30) ─────────────────────────────────────────────
    paid_salary = float(db.session.execute(
        db.select(func.coalesce(func.sum(Salary.amount), 0))
        .where(Salary.organization_id == org_id, Salary.user_id == user_id, Salary.status == "paid")
    ).scalar_one())

    total_expenses = float(db.session.execute(
        db.select(func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.organization_id == org_id, Expense.user_id == user_id)
    ).scalar_one())

    net_savings = max(0, paid_salary - total_expenses)
    savings_rate = (net_savings / paid_salary * 100) if paid_salary > 0 else 0
    savings_score = min(30, int(savings_rate / 100 * 30 * 3))  # 10% savings = ~9/30

    # ── Expense Tracking Consistency Score (0-20) ─────────────────────────────
    # How many of the last 30 days had at least one expense logged?
    thirty_days_ago = today - timedelta(days=30)
    expense_dates = db.session.execute(
        db.select(Expense.expense_date)
        .where(
            Expense.organization_id == org_id,
            Expense.user_id == user_id,
            Expense.expense_date >= thirty_days_ago.isoformat(),
        )
        .distinct()
    ).scalars().all()
    active_days = len(set(expense_dates))
    consistency_score = min(20, int(active_days / 30 * 20))

    # ── Goals Progress Score (0-20) ───────────────────────────────────────────
    goals = db.session.execute(
        db.select(SavingsGoal).where(
            SavingsGoal.organization_id == org_id,
            SavingsGoal.user_id == user_id,
            SavingsGoal.is_active == True,
        )
    ).scalars().all()

    goals_score = 0
    if goals:
        achieved = sum(1 for g in goals if net_savings >= float(g.target_amount))
        goals_score = min(20, int((achieved / len(goals)) * 20) + (5 if goals else 0))
    else:
        goals_score = 10  # neutral

    # ── Total Health Score ────────────────────────────────────────────────────
    total_score = budget_score + savings_score + consistency_score + goals_score

    # Level & Rank
    if total_score >= 85:
        level = "💎 Diamond Saver"
        level_num = 5
    elif total_score >= 70:
        level = "🥇 Gold Saver"
        level_num = 4
    elif total_score >= 55:
        level = "🥈 Silver Saver"
        level_num = 3
    elif total_score >= 35:
        level = "🥉 Bronze Saver"
        level_num = 2
    else:
        level = "🌱 Beginner"
        level_num = 1

    # ── Badges ───────────────────────────────────────────────────────────────
    badges = []

    if budget_score == 30:
        badges.append({"id": "budget_master", "name": "Budget Master", "icon": "🎯", "desc": "All budgets on track!"})
    if savings_rate >= 20:
        badges.append({"id": "super_saver", "name": "Super Saver", "icon": "💰", "desc": "Saving 20%+ of income"})
    if savings_rate >= 10:
        badges.append({"id": "smart_saver", "name": "Smart Saver", "icon": "🧠", "desc": "Saving 10%+ of income"})
    if active_days >= 25:
        badges.append({"id": "tracking_pro", "name": "Tracking Pro", "icon": "📊", "desc": "Logged expenses 25+ days"})
    if total_expenses == 0 and paid_salary > 0:
        badges.append({"id": "zero_spend", "name": "Zero Spender", "icon": "🏆", "desc": "No expenses recorded!"})
    if len(goals) > 0:
        badges.append({"id": "goal_setter", "name": "Goal Setter", "icon": "🎯", "desc": "Has active savings goals"})
    if any(net_savings >= float(g.target_amount) for g in goals):
        badges.append({"id": "goal_crusher", "name": "Goal Crusher!", "icon": "🏅", "desc": "Achieved a savings goal!"})

    # ── Expense Streak (consecutive days with expenses) ───────────────────────
    streak = 0
    check_date = today
    while True:
        has_expense = db.session.execute(
            db.select(func.count(Expense.id))
            .where(
                Expense.organization_id == org_id,
                Expense.user_id == user_id,
                Expense.expense_date == check_date.isoformat(),
            )
        ).scalar_one()
        if has_expense > 0:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break
        if streak > 365:
            break

    # ── Behavioral Insights ───────────────────────────────────────────────────
    daily_pattern = _get_daily_pattern(org_id, user_id, days=60)
    max_spend_day = max(daily_pattern, key=daily_pattern.get) if daily_pattern else None
    min_spend_day = min(daily_pattern, key=daily_pattern.get) if daily_pattern else None

    behavioral_insights = []
    if max_spend_day:
        behavioral_insights.append({
            "type": "peak_day",
            "insight": f"📅 You spend most on {max_spend_day}s (avg ৳{daily_pattern[max_spend_day]:,.0f})",
        })
    if min_spend_day and daily_pattern.get(min_spend_day, 0) > 0:
        behavioral_insights.append({
            "type": "low_day",
            "insight": f"🌿 {min_spend_day} is your most frugal day (avg ৳{daily_pattern[min_spend_day]:,.0f})",
        })

    # Weekend vs weekday comparison
    weekday_avg = sum(daily_pattern.get(d, 0) for d in ["Monday", "Tuesday", "Wednesday", "Thursday"]) / 4
    weekend_avg = sum(daily_pattern.get(d, 0) for d in ["Friday", "Saturday", "Sunday"]) / 3
    if weekend_avg > weekday_avg * 1.3 and weekday_avg > 0:
        behavioral_insights.append({
            "type": "weekend_splurge",
            "insight": f"⚠️ Weekend Splurge detected! You spend {((weekend_avg/weekday_avg)-1)*100:.0f}% more on weekends.",
        })

    return {
        "success": True,
        "score": total_score,
        "score_breakdown": {
            "budget_adherence": budget_score,
            "savings_rate": savings_score,
            "tracking_consistency": consistency_score,
            "goals_progress": goals_score,
        },
        "level": level,
        "level_num": level_num,
        "badges": badges,
        "streak": streak,
        "savings_rate": round(savings_rate, 1),
        "active_tracking_days": active_days,
        "behavioral_insights": behavioral_insights,
        "daily_pattern": daily_pattern,
    }, 200
