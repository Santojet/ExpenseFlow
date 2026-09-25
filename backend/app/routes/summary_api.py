from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import func
from app.extensions import db
from app.models.expense import Expense
from app.models.salary import Salary

summary_bp = Blueprint('summary', __name__, url_prefix='/api/summary')

@summary_bp.get('/monthly')
@jwt_required()
def monthly_summary():
    """Return expense & salary totals for a specific month (YYYY-MM).
    Query param: month=2024-09
    """
    claims = get_jwt()
    organization_id = claims.get('organization_id')
    user_id = int(get_jwt_identity())
    role = claims.get('role', 'user')

    month = request.args.get('month')
    if not month:
        return jsonify({
            'success': False,
            'message': 'month query param required (YYYY-MM)'
        }), 400

    # total expenses for the month
    expense_total = db.session.execute(
        db.select(func.coalesce(func.sum(Expense.amount), 0))
        .where(
            Expense.organization_id == organization_id,
            Expense.expense_date.startswith(month)
        )
        .where(
            Expense.user_id == user_id if role not in ('admin', 'super_admin') else True
        )
    ).scalar_one()

    # total salary for the month
    salary_total = db.session.execute(
        db.select(func.coalesce(func.sum(Salary.amount), 0))
        .where(
            Salary.organization_id == organization_id,
            func.strftime('%Y-%m', Salary.salary_month) == month
        )
        .where(
            Salary.user_id == user_id if role not in ('admin', 'super_admin') else True
        )
    ).scalar_one()

    return jsonify({
        'success': True,
        'month': month,
        'expense_total': float(expense_total),
        'salary_total': float(salary_total),
        'net_balance': float(salary_total) - float(expense_total)
    })
