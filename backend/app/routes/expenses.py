import os
import uuid
from datetime import date
from werkzeug.utils import secure_filename

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db, limiter
from app.models.expense import Expense

expenses_bp = Blueprint(
    "expenses",
    __name__,
    url_prefix="/api/expenses",
)


def expense_response(expense):
    user_name = None
    try:
        user_rel = getattr(expense, "user", None)
        if user_rel:
            user_name = user_rel.full_name or user_rel.username
    except Exception:
        user_name = None

    return {
        "id": expense.id,
        "user_id": expense.user_id,
        "user_name": user_name,
        "title": expense.title,
        "amount": float(expense.amount),
        "category": expense.category,
        "expense_date": expense.expense_date.isoformat(),
        "description": expense.description,
        "quantity": float(expense.quantity) if expense.quantity is not None else None,
        "unit_price": float(expense.unit_price) if expense.unit_price is not None else None,
        "is_recurring": bool(expense.is_recurring) if expense.is_recurring is not None else False,
        "recurrence_frequency": expense.recurrence_frequency,
        "receipt_url": expense.receipt_url,
        "next_due_date": expense.next_due_date.isoformat() if expense.next_due_date else None,
    }


def _is_valid_magic_bytes(header: bytes, ext: str) -> bool:
    if ext == "png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    if ext in ("jpg", "jpeg"):
        return header.startswith(b"\xff\xd8\xff")
    if ext == "gif":
        return header.startswith(b"GIF87a") or header.startswith(b"GIF89a")
    if ext == "webp":
        return header.startswith(b"RIFF") and len(header) >= 12 and header[8:12] == b"WEBP"
    if ext == "pdf":
        return header.startswith(b"%PDF")
    return False


@expenses_bp.post("/upload")
@jwt_required()
@limiter.limit("20 per minute")
def upload_receipt():
    if "file" not in request.files:
        return {"success": False, "message": "No file uploaded"}, 400
    file = request.files["file"]
    if not file or file.filename == "":
        return {"success": False, "message": "No file selected"}, 400

    allowed_exts = {"png", "jpg", "jpeg", "gif", "webp", "pdf"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed_exts:
        return {"success": False, "message": "Only image and PDF files are allowed"}, 400

    # Validate file size (10 MB maximum)
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    if file_size > 10 * 1024 * 1024:
        return {"success": False, "message": "File size exceeds 10MB limit"}, 400
    if file_size == 0:
        return {"success": False, "message": "Empty file uploaded"}, 400

    # Validate magic bytes against spoofing
    file.seek(0)
    header = file.read(16)
    file.seek(0)
    if not _is_valid_magic_bytes(header, ext):
        return {
            "success": False,
            "message": "Security error: File signature does not match declared extension.",
        }, 400

    filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
    uploads_dir = os.path.abspath(os.path.join(expenses_bp.root_path, "..", "..", "uploads"))
    os.makedirs(uploads_dir, exist_ok=True)
    file.save(os.path.join(uploads_dir, filename))

    return {
        "success": True,
        "url": f"/uploads/{filename}",
        "filename": filename,
    }, 200


@expenses_bp.post("")
@jwt_required()
@limiter.limit("60 per minute")
def create_expense():
    data = request.get_json() or {}

    title = str(data.get("title", "")).strip()
    amount = data.get("amount")
    category = str(data.get("category", "")).strip()
    expense_date = data.get("expense_date")
    description = data.get("description")
    raw_quantity = data.get("quantity")
    raw_unit_price = data.get("unit_price")
    is_recurring = bool(data.get("is_recurring", False))
    recurrence_frequency = data.get("recurrence_frequency")
    receipt_url = data.get("receipt_url")

    if not title or amount is None or not category or not expense_date:
        return {
            "success": False,
            "message": "Title, amount, category and expense date are required",
        }, 400

    try:
        amount = float(amount)
        expense_date = date.fromisoformat(expense_date)
    except (ValueError, TypeError):
        return {
            "success": False,
            "message": "Invalid amount or expense date",
        }, 400

    quantity = None
    if raw_quantity is not None and str(raw_quantity).strip() != "":
        try:
            quantity = float(raw_quantity)
        except (ValueError, TypeError):
            quantity = None

    unit_price = None
    if raw_unit_price is not None and str(raw_unit_price).strip() != "":
        try:
            unit_price = float(raw_unit_price)
        except (ValueError, TypeError):
            unit_price = None

    if amount <= 0:
        return {
            "success": False,
            "message": "Amount must be greater than zero",
        }, 400

    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    if not organization_id:
        return {
            "success": False,
            "message": "Organization information missing",
        }, 400

    next_due_date = None
    if is_recurring and recurrence_frequency:
        import calendar
        from datetime import timedelta
        if recurrence_frequency == "daily":
            next_due_date = expense_date + timedelta(days=1)
        elif recurrence_frequency == "weekly":
            next_due_date = expense_date + timedelta(weeks=1)
        elif recurrence_frequency == "yearly":
            try:
                next_due_date = expense_date.replace(year=expense_date.year + 1)
            except ValueError:
                next_due_date = expense_date.replace(year=expense_date.year + 1, day=28)
        else:
            month = expense_date.month
            year = expense_date.year
            day = expense_date.day
            if month == 12:
                month = 1
                year += 1
            else:
                month += 1
            last_day = calendar.monthrange(year, month)[1]
            if day > last_day:
                day = last_day
            next_due_date = expense_date.replace(year=year, month=month, day=day)

    expense = Expense(
        organization_id=organization_id,
        user_id=user_id,
        title=title,
        amount=amount,
        category=category,
        expense_date=expense_date,
        description=description,
        quantity=quantity,
        unit_price=unit_price,
        is_recurring=is_recurring,
        recurrence_frequency=recurrence_frequency,
        receipt_url=receipt_url,
        next_due_date=next_due_date,
    )

    db.session.add(expense)
    db.session.commit()

    return {
        "success": True,
        "message": "Expense created successfully",
        "expense": expense_response(expense),
    }, 201


@expenses_bp.get("")
@jwt_required()
def get_expenses():
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())
    role = claims.get("role", "user")

    target_user_id = request.args.get("user_id", type=int)
    scope = request.args.get("scope", "all")

    query = (
        db.select(Expense)
        .where(Expense.organization_id == organization_id)
        .order_by(Expense.expense_date.desc())
    )

    is_admin = role in ("admin", "super_admin")
    is_admin_view = False

    if target_user_id and is_admin:
        query = query.where(Expense.user_id == target_user_id)
        is_admin_view = True
    elif is_admin and scope == "my":
        query = query.where(Expense.user_id == user_id)
        is_admin_view = False
    elif is_admin:
        # Admins view all organization expenses by default
        is_admin_view = True
    else:
        # Regular users only see their own expenses
        query = query.where(Expense.user_id == user_id)
        is_admin_view = False

    expenses = db.session.execute(query).scalars().all()

    result = [expense_response(e) for e in expenses]

    return {
        "success": True,
        "expenses": result,
        "is_admin_view": is_admin_view,
    }, 200


@expenses_bp.put("/<int:expense_id>")
@jwt_required()
@limiter.limit("60 per minute")
def update_expense(expense_id):
    data = request.get_json() or {}

    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    expense = db.session.execute(
        db.select(Expense).where(
            Expense.id == expense_id,
            Expense.organization_id == organization_id,
            Expense.user_id == user_id,
        )
    ).scalar_one_or_none()

    if not expense:
        return {
            "success": False,
            "message": "Expense not found",
        }, 404

    title = str(data.get("title", expense.title)).strip()
    category = str(data.get("category", expense.category)).strip()
    description = data.get("description", expense.description)
    amount = data.get("amount", expense.amount)
    expense_date = data.get(
        "expense_date",
        expense.expense_date.isoformat(),
    )

    if not title or not category or amount is None or not expense_date:
        return {
            "success": False,
            "message": "Title, amount, category and expense date are required",
        }, 400

    try:
        amount = float(amount)
        expense_date = date.fromisoformat(expense_date)
    except (ValueError, TypeError):
        return {
            "success": False,
            "message": "Invalid amount or expense date",
        }, 400

    if amount <= 0:
        return {
            "success": False,
            "message": "Amount must be greater than zero",
        }, 400

    expense.title = title
    expense.amount = amount
    expense.category = category
    expense.expense_date = expense_date
    expense.description = description

    if "quantity" in data:
        raw_q = data.get("quantity")
        if raw_q is not None and str(raw_q).strip() != "":
            try:
                expense.quantity = float(raw_q)
            except (ValueError, TypeError):
                expense.quantity = None
        else:
            expense.quantity = None

    if "unit_price" in data:
        raw_up = data.get("unit_price")
        if raw_up is not None and str(raw_up).strip() != "":
            try:
                expense.unit_price = float(raw_up)
            except (ValueError, TypeError):
                expense.unit_price = None
        else:
            expense.unit_price = None

    if "is_recurring" in data:
        expense.is_recurring = bool(data.get("is_recurring"))
    if "recurrence_frequency" in data:
        expense.recurrence_frequency = data.get("recurrence_frequency")
    if "receipt_url" in data:
        expense.receipt_url = data.get("receipt_url")

    if expense.is_recurring and expense.recurrence_frequency:
        import calendar
        from datetime import timedelta
        if expense.recurrence_frequency == "daily":
            expense.next_due_date = expense.expense_date + timedelta(days=1)
        elif expense.recurrence_frequency == "weekly":
            expense.next_due_date = expense.expense_date + timedelta(weeks=1)
        elif expense.recurrence_frequency == "yearly":
            try:
                expense.next_due_date = expense.expense_date.replace(year=expense.expense_date.year + 1)
            except ValueError:
                expense.next_due_date = expense.expense_date.replace(year=expense.expense_date.year + 1, day=28)
        else:
            month = expense.expense_date.month
            year = expense.expense_date.year
            day = expense.expense_date.day
            if month == 12:
                month = 1
                year += 1
            else:
                month += 1
            last_day = calendar.monthrange(year, month)[1]
            if day > last_day:
                day = last_day
            expense.next_due_date = expense.expense_date.replace(year=year, month=month, day=day)
    else:
        expense.next_due_date = None

    db.session.commit()

    return {
        "success": True,
        "message": "Expense updated successfully",
        "expense": expense_response(expense),
    }, 200


@expenses_bp.delete("/<int:expense_id>")
@jwt_required()
@limiter.limit("60 per minute")
def delete_expense(expense_id):
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())

    expense = db.session.execute(
        db.select(Expense).where(
            Expense.id == expense_id,
            Expense.organization_id == organization_id,
            Expense.user_id == user_id,
        )
    ).scalar_one_or_none()

    if not expense:
        return {
            "success": False,
            "message": "Expense not found",
        }, 404

    db.session.delete(expense)
    db.session.commit()

    return {
        "success": True,
        "message": "Expense deleted successfully",
    }, 200


@expenses_bp.post("/process-recurring")
def process_recurring():
    """
    Process all recurring expenses that are due today or earlier.
    This can be hit periodically by a cron job or background worker.
    """
    today = date.today()
    
    # Find all expenses that are recurring and have a next_due_date <= today
    due_expenses = db.session.execute(
        db.select(Expense).where(
            Expense.is_recurring == True,
            Expense.next_due_date != None,
            Expense.next_due_date <= today
        )
    ).scalars().all()

    processed_count = 0
    import calendar
    from datetime import timedelta

    for exp in due_expenses:
        # Create a new expense based on the recurring one
        new_expense = Expense(
            title=exp.title,
            amount=exp.amount,
            category=exp.category,
            expense_date=exp.next_due_date,
            description=f"Auto-generated recurring expense (from {exp.title})",
            quantity=exp.quantity,
            unit_price=exp.unit_price,
            organization_id=exp.organization_id,
            user_id=exp.user_id,
            is_recurring=False, # The generated record itself isn't the recurring template
            receipt_url=exp.receipt_url
        )
        db.session.add(new_expense)

        # Update the next_due_date of the template
        if exp.recurrence_frequency == "daily":
            exp.next_due_date += timedelta(days=1)
        elif exp.recurrence_frequency == "weekly":
            exp.next_due_date += timedelta(weeks=1)
        elif exp.recurrence_frequency == "yearly":
            try:
                exp.next_due_date = exp.next_due_date.replace(year=exp.next_due_date.year + 1)
            except ValueError:
                # Handle leap year Feb 29 -> Feb 28
                exp.next_due_date = exp.next_due_date.replace(year=exp.next_due_date.year + 1, day=28)
        else:
            # Monthly (default)
            month = exp.next_due_date.month
            year = exp.next_due_date.year
            day = exp.next_due_date.day
            if month == 12:
                month = 1
                year += 1
            else:
                month += 1
            
            last_day = calendar.monthrange(year, month)[1]
            if day > last_day:
                day = last_day
            
            exp.next_due_date = exp.next_due_date.replace(year=year, month=month, day=day)
            
        processed_count += 1

    db.session.commit()

    return {
        "success": True,
        "message": f"Processed {processed_count} recurring expenses.",
        "processed": processed_count
    }, 200


@expenses_bp.get("/upcoming")
@jwt_required()
def get_upcoming_expenses():
    claims = get_jwt()
    organization_id = claims.get("organization_id")
    user_id = int(get_jwt_identity())
    
    from datetime import timedelta
    today = date.today()
    in_seven_days = today + timedelta(days=7)

    query = (
        db.select(Expense)
        .where(
            Expense.organization_id == organization_id,
            Expense.user_id == user_id,
            Expense.is_recurring == True,
            Expense.next_due_date != None,
            Expense.next_due_date >= today,
            Expense.next_due_date <= in_seven_days
        )
        .order_by(Expense.next_due_date.asc())
    )

    upcoming = db.session.execute(query).scalars().all()
    result = [expense_response(e) for e in upcoming]

    return {
        "success": True,
        "upcoming": result
    }, 200