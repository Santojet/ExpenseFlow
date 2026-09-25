"""
Savings Goal Routes — GET/POST/PUT/DELETE financial targets
"""

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from datetime import date

from app.extensions import db
from app.models.savings_goal import SavingsGoal
from app.models.salary import Salary
from app.models.expense import Expense
from sqlalchemy import func

goals_bp = Blueprint(
    "goals",
    __name__,
    url_prefix="/api/goals",
)


def goal_response(goal, current_savings=0.0):
    target = float(goal.target_amount)
    pct = round(min(100, (current_savings / target * 100)), 1) if target > 0 else 0
    return {
        "id": goal.id,
        "title": goal.title,
        "target_amount": target,
        "target_date": goal.target_date.isoformat() if goal.target_date else None,
        "description": goal.description,
        "is_active": goal.is_active,
        "current_savings": round(current_savings, 2),
        "remaining": round(max(0, target - current_savings), 2),
        "percentage": pct,
        "is_achieved": current_savings >= target,
    }


def _compute_savings(organization_id, user_id):
    """Net savings = total paid salary - total expenses"""
    paid_salary = db.session.execute(
        db.select(func.coalesce(func.sum(Salary.amount), 0))
        .where(
            Salary.organization_id == organization_id,
            Salary.user_id == user_id,
            Salary.status == "paid",
        )
    ).scalar_one()

    total_expenses = db.session.execute(
        db.select(func.coalesce(func.sum(Expense.amount), 0))
        .where(
            Expense.organization_id == organization_id,
            Expense.user_id == user_id,
        )
    ).scalar_one()

    return max(0, float(paid_salary) - float(total_expenses))


@goals_bp.get("")
@jwt_required()
def get_goals():
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    goals = db.session.execute(
        db.select(SavingsGoal)
        .where(
            SavingsGoal.organization_id == organization_id,
            SavingsGoal.user_id == user_id,
        )
        .order_by(SavingsGoal.created_at.desc())
    ).scalars().all()

    current_savings = _compute_savings(organization_id, user_id)

    return {
        "success": True,
        "goals": [goal_response(g, current_savings) for g in goals],
        "current_savings": round(current_savings, 2),
    }, 200


@goals_bp.post("")
@jwt_required()
def create_goal():
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    data = request.get_json() or {}

    title = str(data.get("title", "")).strip()
    target_amount = data.get("target_amount")
    target_date_str = data.get("target_date")
    description = data.get("description")

    if not title or target_amount is None:
        return {"success": False, "message": "Title and target amount are required"}, 400

    try:
        target_amount = float(target_amount)
    except (ValueError, TypeError):
        return {"success": False, "message": "Invalid target amount"}, 400

    if target_amount <= 0:
        return {"success": False, "message": "Target amount must be greater than zero"}, 400

    target_date = None
    if target_date_str:
        try:
            target_date = date.fromisoformat(target_date_str)
        except (ValueError, TypeError):
            return {"success": False, "message": "Invalid target date"}, 400

    goal = SavingsGoal(
        organization_id=organization_id,
        user_id=user_id,
        title=title,
        target_amount=target_amount,
        target_date=target_date,
        description=description,
        is_active=True,
    )
    db.session.add(goal)
    db.session.commit()

    current_savings = _compute_savings(organization_id, user_id)
    return {"success": True, "message": "Goal created", "goal": goal_response(goal, current_savings)}, 201


@goals_bp.put("/<int:goal_id>")
@jwt_required()
def update_goal(goal_id):
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    goal = db.session.execute(
        db.select(SavingsGoal).where(
            SavingsGoal.id == goal_id,
            SavingsGoal.organization_id == organization_id,
            SavingsGoal.user_id == user_id,
        )
    ).scalar_one_or_none()

    if not goal:
        return {"success": False, "message": "Goal not found"}, 404

    data = request.get_json() or {}

    if "title" in data:
        goal.title = str(data["title"]).strip()
    if "target_amount" in data:
        try:
            goal.target_amount = float(data["target_amount"])
        except (ValueError, TypeError):
            return {"success": False, "message": "Invalid target amount"}, 400
    if "target_date" in data:
        if data["target_date"]:
            try:
                goal.target_date = date.fromisoformat(data["target_date"])
            except (ValueError, TypeError):
                return {"success": False, "message": "Invalid target date"}, 400
        else:
            goal.target_date = None
    if "description" in data:
        goal.description = data["description"]
    if "is_active" in data:
        goal.is_active = bool(data["is_active"])

    db.session.commit()

    current_savings = _compute_savings(organization_id, user_id)
    return {"success": True, "message": "Goal updated", "goal": goal_response(goal, current_savings)}, 200


@goals_bp.delete("/<int:goal_id>")
@jwt_required()
def delete_goal(goal_id):
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    goal = db.session.execute(
        db.select(SavingsGoal).where(
            SavingsGoal.id == goal_id,
            SavingsGoal.organization_id == organization_id,
            SavingsGoal.user_id == user_id,
        )
    ).scalar_one_or_none()

    if not goal:
        return {"success": False, "message": "Goal not found"}, 404

    db.session.delete(goal)
    db.session.commit()

    return {"success": True, "message": "Goal deleted"}, 200
