"""
Debts and Loans Routes
"""

from datetime import date
from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import func

from app.extensions import db, limiter
from app.models.debt import Debt

debts_bp = Blueprint(
    "debts",
    __name__,
    url_prefix="/api/debts",
)


@debts_bp.get("")
@jwt_required()
def get_debts():
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    debt_type = request.args.get("type")      # "lent" or "borrowed"
    status = request.args.get("status")        # "pending", "partial", "settled"
    search = request.args.get("search", "").strip()

    query = (
        db.select(Debt)
        .where(
            Debt.organization_id == organization_id,
            Debt.user_id == user_id,
        )
        .order_by(Debt.created_at.desc())
    )

    if debt_type:
        query = query.where(Debt.type == debt_type)
    if status:
        query = query.where(Debt.status == status)
    if search:
        query = query.where(Debt.person_name.ilike(f"%{search}%"))

    debts = db.session.execute(query).scalars().all()

    # Calculate summary metrics for all debts of this user
    all_debts_query = db.select(Debt).where(
        Debt.organization_id == organization_id,
        Debt.user_id == user_id,
    )
    all_debts = db.session.execute(all_debts_query).scalars().all()

    total_lent = sum(float(d.amount) for d in all_debts if d.type == "lent")
    total_lent_paid = sum(float(d.paid_amount or 0) for d in all_debts if d.type == "lent")
    total_lent_pending = max(0.0, total_lent - total_lent_paid)

    total_borrowed = sum(float(d.amount) for d in all_debts if d.type == "borrowed")
    total_borrowed_paid = sum(float(d.paid_amount or 0) for d in all_debts if d.type == "borrowed")
    total_borrowed_pending = max(0.0, total_borrowed - total_borrowed_paid)

    # Net balance: (what people owe me) - (what I owe people)
    net_balance = total_lent_pending - total_borrowed_pending

    return {
        "success": True,
        "debts": [d.to_dict() for d in debts],
        "summary": {
            "total_lent": round(total_lent, 2),
            "total_lent_paid": round(total_lent_paid, 2),
            "total_lent_pending": round(total_lent_pending, 2),
            "total_borrowed": round(total_borrowed, 2),
            "total_borrowed_paid": round(total_borrowed_paid, 2),
            "total_borrowed_pending": round(total_borrowed_pending, 2),
            "net_balance": round(net_balance, 2),
            "total_records": len(debts),
        },
    }, 200


@debts_bp.post("")
@jwt_required()
@limiter.limit("60 per minute")
def create_debt():
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    data = request.get_json() or {}
    person_name = str(data.get("person_name", "")).strip()
    debt_type = str(data.get("type", "lent")).strip()
    raw_amount = data.get("amount")
    raw_paid = data.get("paid_amount", 0)
    due_date_str = data.get("due_date")
    phone = str(data.get("phone", "")).strip()
    notes = data.get("notes")

    if not person_name or raw_amount is None:
        return {"success": False, "message": "Person name and amount are required"}, 400

    try:
        amount = float(raw_amount)
        if amount <= 0:
            return {"success": False, "message": "Amount must be greater than zero"}, 400
    except (ValueError, TypeError):
        return {"success": False, "message": "Invalid amount"}, 400

    paid_amount = 0.0
    try:
        if raw_paid:
            paid_amount = max(0.0, float(raw_paid))
    except (ValueError, TypeError):
        paid_amount = 0.0

    due_date = None
    if due_date_str:
        try:
            due_date = date.fromisoformat(due_date_str)
        except (ValueError, TypeError):
            due_date = None

    if paid_amount >= amount:
        status = "settled"
    elif paid_amount > 0:
        status = "partial"
    else:
        status = "pending"

    debt = Debt(
        organization_id=organization_id,
        user_id=user_id,
        person_name=person_name,
        phone=phone or None,
        type=debt_type if debt_type in ["lent", "borrowed"] else "lent",
        amount=amount,
        paid_amount=paid_amount,
        due_date=due_date,
        status=status,
        notes=notes,
    )

    db.session.add(debt)
    db.session.commit()

    return {
        "success": True,
        "message": "Debt record created successfully",
        "debt": debt.to_dict(),
    }, 201


@debts_bp.put("/<int:debt_id>")
@jwt_required()
@limiter.limit("60 per minute")
def update_debt(debt_id):
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    debt = db.session.execute(
        db.select(Debt).where(
            Debt.id == debt_id,
            Debt.organization_id == organization_id,
            Debt.user_id == user_id,
        )
    ).scalar_one_or_none()

    if not debt:
        return {"success": False, "message": "Debt record not found"}, 404

    data = request.get_json() or {}
    if "person_name" in data:
        debt.person_name = str(data["person_name"]).strip()
    if "phone" in data:
        debt.phone = str(data["phone"]).strip() or None
    if "type" in data and data["type"] in ["lent", "borrowed"]:
        debt.type = data["type"]
    if "amount" in data:
        try:
            amt = float(data["amount"])
            if amt > 0:
                debt.amount = amt
        except (ValueError, TypeError):
            pass
    if "paid_amount" in data:
        try:
            debt.paid_amount = max(0.0, float(data["paid_amount"]))
        except (ValueError, TypeError):
            pass
    if "due_date" in data:
        if data["due_date"]:
            try:
                debt.due_date = date.fromisoformat(data["due_date"])
            except (ValueError, TypeError):
                pass
        else:
            debt.due_date = None
    if "notes" in data:
        debt.notes = data["notes"]

    # Re-evaluate status
    if debt.paid_amount >= float(debt.amount):
        debt.status = "settled"
    elif debt.paid_amount > 0:
        debt.status = "partial"
    else:
        debt.status = "pending"

    db.session.commit()

    return {
        "success": True,
        "message": "Debt record updated successfully",
        "debt": debt.to_dict(),
    }, 200


@debts_bp.post("/<int:debt_id>/pay")
@jwt_required()
@limiter.limit("60 per minute")
def record_payment(debt_id):
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    debt = db.session.execute(
        db.select(Debt).where(
            Debt.id == debt_id,
            Debt.organization_id == organization_id,
            Debt.user_id == user_id,
        )
    ).scalar_one_or_none()

    if not debt:
        return {"success": False, "message": "Debt record not found"}, 404

    data = request.get_json() or {}
    raw_amount = data.get("amount")
    notes = data.get("notes")

    try:
        payment = float(raw_amount)
        if payment <= 0:
            return {"success": False, "message": "Payment amount must be greater than zero"}, 400
    except (ValueError, TypeError):
        return {"success": False, "message": "Invalid payment amount"}, 400

    current_paid = float(debt.paid_amount or 0.0)
    new_paid = current_paid + payment
    debt.paid_amount = new_paid

    if new_paid >= float(debt.amount):
        debt.status = "settled"
    else:
        debt.status = "partial"

    if notes:
        existing_notes = debt.notes or ""
        debt.notes = f"{existing_notes}\n[Payment Tk {payment:.2f}: {notes}]".strip()

    db.session.commit()

    return {
        "success": True,
        "message": f"Payment of {payment:.2f} recorded successfully",
        "debt": debt.to_dict(),
    }, 200


@debts_bp.delete("/<int:debt_id>")
@jwt_required()
@limiter.limit("60 per minute")
def delete_debt(debt_id):
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    debt = db.session.execute(
        db.select(Debt).where(
            Debt.id == debt_id,
            Debt.organization_id == organization_id,
            Debt.user_id == user_id,
        )
    ).scalar_one_or_none()

    if not debt:
        return {"success": False, "message": "Debt record not found"}, 404

    db.session.delete(debt)
    db.session.commit()

    return {"success": True, "message": "Debt record deleted successfully"}, 200
