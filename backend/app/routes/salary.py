from datetime import date

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db, limiter
from app.models.salary import Salary


salary_bp = Blueprint(
    "salary",
    __name__,
    url_prefix="/api/salaries",
)


@salary_bp.post("")
@jwt_required()
@limiter.limit("60 per minute")
def create_salary():
    data = request.get_json() or {}

    amount = data.get("amount")
    salary_month = data.get("salary_month")
    payment_date = data.get("payment_date")
    status = str(data.get("status", "paid")).strip()
    description = data.get("description")

    if amount is None or not salary_month:
        return {
            "success": False,
            "message": "Amount and salary month are required",
        }, 400

    try:
        amount = float(amount)
        salary_month = date.fromisoformat(salary_month)

        if payment_date:
            payment_date = date.fromisoformat(payment_date)

    except (ValueError, TypeError):
        return {
            "success": False,
            "message": "Invalid amount or date",
        }, 400

    if amount <= 0:
        return {
            "success": False,
            "message": "Amount must be greater than zero",
        }, 400

    if status not in ["paid", "pending"]:
        return {
            "success": False,
            "message": "Status must be paid or pending",
        }, 400

    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    if not organization_id:
        return {
            "success": False,
            "message": "Organization information missing",
        }, 400

    salary = Salary(
        organization_id=organization_id,
        user_id=user_id,
        amount=amount,
        salary_month=salary_month,
        payment_date=payment_date,
        status=status,
        description=description,
    )

    db.session.add(salary)
    db.session.commit()

    return {
        "success": True,
        "message": "Salary created successfully",
        "salary": {
            "id": salary.id,
            "amount": float(salary.amount),
            "salary_month": salary.salary_month.isoformat(),
            "payment_date": (
                salary.payment_date.isoformat()
                if salary.payment_date
                else None
            ),
            "status": salary.status,
            "description": salary.description,
        },
    }, 201


@salary_bp.get("")
@jwt_required()
def get_salaries():
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())
    role = claims.get("role", "user")

    target_user_id = request.args.get("user_id", type=int)

    query = (
        db.select(Salary)
        .where(Salary.organization_id == organization_id)
        .order_by(Salary.salary_month.desc())
    )

    # Admin inspecting specific user:
    if target_user_id and role in ("admin", "super_admin"):
        query = query.where(Salary.user_id == target_user_id)
    else:
        # Strict privacy: Every user (including Admin/Super Admin) sees ONLY their own salary
        query = query.where(Salary.user_id == user_id)

    salaries = db.session.execute(query).scalars().all()

    result = []
    for salary in salaries:
        result.append({
            "id": salary.id,
            "amount": float(salary.amount),
            "salary_month": salary.salary_month.isoformat(),
            "payment_date": (
                salary.payment_date.isoformat()
                if salary.payment_date
                else None
            ),
            "status": salary.status,
            "description": salary.description,
            "user_id": salary.user_id,
        })

    return {
        "success": True,
        "salaries": result,
        "is_admin_view": False,
    }, 200


@salary_bp.put("/<int:salary_id>")
@jwt_required()
@limiter.limit("60 per minute")
def update_salary(salary_id):
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    salary = db.session.execute(
        db.select(Salary).where(
            Salary.id == salary_id,
            Salary.organization_id == organization_id,
            Salary.user_id == user_id,
        )
    ).scalar_one_or_none()

    if not salary:
        return {
            "success": False,
            "message": "Salary not found",
        }, 404

    data = request.get_json() or {}

    if "amount" in data:
        try:
            salary.amount = float(data["amount"])
        except (ValueError, TypeError):
            return {
                "success": False,
                "message": "Invalid amount",
            }, 400

        if salary.amount <= 0:
            return {
                "success": False,
                "message": "Amount must be greater than zero",
            }, 400

    if "salary_month" in data:
        try:
            salary.salary_month = date.fromisoformat(
                data["salary_month"]
            )
        except (ValueError, TypeError):
            return {
                "success": False,
                "message": "Invalid salary month",
            }, 400

    if "payment_date" in data:
        try:
            salary.payment_date = (
                date.fromisoformat(data["payment_date"])
                if data["payment_date"]
                else None
            )
        except (ValueError, TypeError):
            return {
                "success": False,
                "message": "Invalid payment date",
            }, 400

    if "status" in data:
        status = str(data["status"]).strip()

        if status not in ["paid", "pending"]:
            return {
                "success": False,
                "message": "Status must be paid or pending",
            }, 400

        salary.status = status

    if "description" in data:
        salary.description = data["description"]

    db.session.commit()

    return {
        "success": True,
        "message": "Salary updated successfully",
        "salary": {
            "id": salary.id,
            "amount": float(salary.amount),
            "salary_month": salary.salary_month.isoformat(),
            "payment_date": (
                salary.payment_date.isoformat()
                if salary.payment_date
                else None
            ),
            "status": salary.status,
            "description": salary.description,
        },
    }, 200


@salary_bp.delete("/<int:salary_id>")
@jwt_required()
@limiter.limit("60 per minute")
def delete_salary(salary_id):
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    salary = db.session.execute(
        db.select(Salary).where(
            Salary.id == salary_id,
            Salary.organization_id == organization_id,
            Salary.user_id == user_id,
        )
    ).scalar_one_or_none()

    if not salary:
        return {
            "success": False,
            "message": "Salary not found",
        }, 404

    db.session.delete(salary)
    db.session.commit()

    return {
        "success": True,
        "message": "Salary deleted successfully",
    }, 200