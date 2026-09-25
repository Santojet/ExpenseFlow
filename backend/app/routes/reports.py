from flask import Blueprint
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import func

from app.extensions import db
from app.models.expense import Expense
from app.models.salary import Salary


reports_bp = Blueprint(
    "reports",
    __name__,
    url_prefix="/api/reports",
)


@reports_bp.get("/summary")
@jwt_required()
def report_summary():
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    if not organization_id:
        return {
            "success": False,
            "message": "Organization information missing",
        }, 400

    # -------------------------
    # Total Expenses
    # -------------------------

    total_expenses = db.session.execute(
        db.select(func.coalesce(func.sum(Expense.amount), 0))
        .where(
            Expense.organization_id == organization_id,
            Expense.user_id == user_id,
        )
    ).scalar_one()

    # -------------------------
    # Total Salary
    # -------------------------

    total_salary = db.session.execute(
        db.select(func.coalesce(func.sum(Salary.amount), 0))
        .where(
            Salary.organization_id == organization_id,
            Salary.user_id == user_id,
        )
    ).scalar_one()

    # -------------------------
    # Paid Salary
    # -------------------------

    paid_salary = db.session.execute(
        db.select(func.coalesce(func.sum(Salary.amount), 0))
        .where(
            Salary.organization_id == organization_id,
            Salary.user_id == user_id,
            Salary.status == "paid",
        )
    ).scalar_one()

    # -------------------------
    # Pending Salary
    # -------------------------

    pending_salary = db.session.execute(
        db.select(func.coalesce(func.sum(Salary.amount), 0))
        .where(
            Salary.organization_id == organization_id,
            Salary.user_id == user_id,
            Salary.status == "pending",
        )
    ).scalar_one()

    # -------------------------
    # Category Wise Expenses
    # -------------------------

    category_rows = db.session.execute(
        db.select(
            Expense.category,
            func.sum(Expense.amount),
        )
        .where(
            Expense.organization_id == organization_id,
            Expense.user_id == user_id,
        )
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
    ).all()

    category_expenses = [
        {
            "category": category,
            "amount": float(amount),
        }
        for category, amount in category_rows
    ]

    # -------------------------
    # Net Balance
    # -------------------------

    net_balance = float(paid_salary) - float(total_expenses)

    return {
        "success": True,
        "summary": {
            "total_expenses": float(total_expenses),
            "total_salary": float(total_salary),
            "paid_salary": float(paid_salary),
            "pending_salary": float(pending_salary),
            "net_balance": net_balance,
        },
        "category_expenses": category_expenses,
    }, 200


@reports_bp.get("/monthly")
@jwt_required()
def monthly_report():
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())
    role = claims.get("role", "user")

    if not organization_id:
        return {"success": False, "message": "Organization information missing"}, 400

    # -------------------------
    # Monthly Expenses
    # -------------------------
    exp_query = (
        db.select(
            func.strftime("%Y-%m", Expense.expense_date).label("month"),
            func.sum(Expense.amount).label("total"),
        )
        .where(Expense.organization_id == organization_id)
        .group_by(func.strftime("%Y-%m", Expense.expense_date))
        .order_by(func.strftime("%Y-%m", Expense.expense_date))
    )
    if role not in ("admin", "super_admin"):
        exp_query = exp_query.where(Expense.user_id == user_id)

    expense_rows = db.session.execute(exp_query).all()

    # -------------------------
    # Monthly Salary
    # -------------------------
    sal_query = (
        db.select(
            func.strftime("%Y-%m", Salary.salary_month).label("month"),
            func.sum(Salary.amount).label("total"),
        )
        .where(Salary.organization_id == organization_id)
        .group_by(func.strftime("%Y-%m", Salary.salary_month))
        .order_by(func.strftime("%Y-%m", Salary.salary_month))
    )
    if role not in ("admin", "super_admin"):
        sal_query = sal_query.where(Salary.user_id == user_id)

    salary_rows = db.session.execute(sal_query).all()

    # Merge by month
    monthly = {}
    for month, total in expense_rows:
        monthly.setdefault(month, {"month": month, "expenses": 0, "salary": 0})
        monthly[month]["expenses"] = float(total)
    for month, total in salary_rows:
        monthly.setdefault(month, {"month": month, "expenses": 0, "salary": 0})
        monthly[month]["salary"] = float(total)

    return {
        "success": True,
        "monthly": sorted(monthly.values(), key=lambda x: x["month"]),
    }, 200


@reports_bp.get("/export")
@jwt_required()
def export_report():
    import csv
    from io import StringIO
    from flask import Response

    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())
    role = claims.get("role", "user")

    if not organization_id:
        return {"success": False, "message": "Organization information missing"}, 400

    exp_query = db.select(Expense).where(Expense.organization_id == organization_id)
    if role not in ("admin", "super_admin"):
        exp_query = exp_query.where(Expense.user_id == user_id)
    
    exp_query = exp_query.order_by(Expense.expense_date.desc())
    expenses = db.session.execute(exp_query).scalars().all()

    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(["ID", "Title", "Amount", "Category", "Date", "Description"])
    for exp in expenses:
        cw.writerow([
            exp.id,
            exp.title,
            float(exp.amount),
            exp.category,
            exp.expense_date.isoformat(),
            exp.description or ""
        ])

    output = si.getvalue()
    return Response(
        output,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=expenses_export.csv"}
    )
