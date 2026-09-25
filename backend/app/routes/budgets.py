"""
Budget Routes — GET/POST/PUT/DELETE monthly spending limits
"""

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models.budget import Budget
from app.models.expense import Expense
from sqlalchemy import func

budgets_bp = Blueprint(
    "budgets",
    __name__,
    url_prefix="/api/budgets",
)


def budget_response(budget, spent=0.0):
    limit = float(budget.monthly_limit)
    pct = round((spent / limit * 100), 1) if limit > 0 else 0
    return {
        "id": budget.id,
        "category": budget.category,
        "month": budget.month,
        "monthly_limit": limit,
        "spent": round(spent, 2),
        "remaining": round(max(0, limit - spent), 2),
        "percentage": pct,
        "is_over": spent > limit,
        "is_warning": pct >= 80 and spent <= limit,
    }


@budgets_bp.get("")
@jwt_required()
def get_budgets():
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    month = request.args.get("month")  # optional filter e.g. "2026-09"

    query = (
        db.select(Budget)
        .where(
            Budget.organization_id == organization_id,
            Budget.user_id == user_id,
        )
        .order_by(Budget.month.desc(), Budget.category)
    )

    if month:
        query = query.where(Budget.month == month)

    budgets = db.session.execute(query).scalars().all()

    # For each budget, compute how much was spent in that month/category
    result = []
    for b in budgets:
        month_start = f"{b.month}-01"
        month_end_parts = b.month.split("-")
        import calendar
        last_day = calendar.monthrange(int(month_end_parts[0]), int(month_end_parts[1]))[1]
        month_end = f"{b.month}-{last_day:02d}"

        spent = db.session.execute(
            db.select(func.coalesce(func.sum(Expense.amount), 0))
            .where(
                Expense.organization_id == organization_id,
                Expense.user_id == user_id,
                Expense.category == b.category,
                Expense.expense_date >= month_start,
                Expense.expense_date <= month_end,
            )
        ).scalar_one()

        result.append(budget_response(b, float(spent)))

    return {"success": True, "budgets": result}, 200


@budgets_bp.post("")
@jwt_required()
def create_or_update_budget():
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    data = request.get_json() or {}

    category = str(data.get("category", "")).strip()
    month = str(data.get("month", "")).strip()  # "YYYY-MM"
    monthly_limit = data.get("monthly_limit")

    if not category or not month or monthly_limit is None:
        return {"success": False, "message": "Category, month and monthly_limit are required"}, 400

    try:
        monthly_limit = float(monthly_limit)
    except (ValueError, TypeError):
        return {"success": False, "message": "Invalid monthly_limit"}, 400

    if monthly_limit <= 0:
        return {"success": False, "message": "Monthly limit must be greater than zero"}, 400

    # Validate month format
    if len(month) != 7 or month[4] != "-":
        return {"success": False, "message": "Month must be in YYYY-MM format"}, 400

    # Upsert: update if exists, else create
    existing = db.session.execute(
        db.select(Budget).where(
            Budget.organization_id == organization_id,
            Budget.user_id == user_id,
            Budget.category == category,
            Budget.month == month,
        )
    ).scalar_one_or_none()

    if existing:
        existing.monthly_limit = monthly_limit
        db.session.commit()
        return {"success": True, "message": "Budget updated", "budget": budget_response(existing)}, 200

    budget = Budget(
        organization_id=organization_id,
        user_id=user_id,
        category=category,
        month=month,
        monthly_limit=monthly_limit,
    )
    db.session.add(budget)
    db.session.commit()

    return {"success": True, "message": "Budget created", "budget": budget_response(budget)}, 201


@budgets_bp.delete("/<int:budget_id>")
@jwt_required()
def delete_budget(budget_id):
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    budget = db.session.execute(
        db.select(Budget).where(
            Budget.id == budget_id,
            Budget.organization_id == organization_id,
            Budget.user_id == user_id,
        )
    ).scalar_one_or_none()

    if not budget:
        return {"success": False, "message": "Budget not found"}, 404

    db.session.delete(budget)
    db.session.commit()

    return {"success": True, "message": "Budget deleted"}, 200
