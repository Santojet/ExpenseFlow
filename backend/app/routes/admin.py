import json
import secrets
from datetime import datetime, timedelta

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from werkzeug.security import generate_password_hash

from app.extensions import db, limiter
from app.models.user import User
from app.models.expense import Expense
from app.models.salary import Salary

RESET_CODE_EXPIRY_MINUTES = 15

admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/api/admin",
)


def has_admin_access():
    claims = get_jwt()
    role = claims.get("role")
    if role in ("admin", "super_admin"):
        return True
    try:
        user_id = get_jwt_identity()
        if user_id:
            user = db.session.get(User, int(user_id))
            return bool(user and user.role in ("admin", "super_admin") and user.is_active)
    except Exception:
        pass
    return False


def has_super_admin_access():
    claims = get_jwt()
    role = claims.get("role")
    if role == "super_admin":
        return True
    try:
        user_id = get_jwt_identity()
        if user_id:
            user = db.session.get(User, int(user_id))
            return bool(user and user.role == "super_admin" and user.is_active)
    except Exception:
        pass
    return False


@admin_bp.get("/users")
@jwt_required()
def get_users():
    if not has_admin_access():
        return {
            "success": False,
            "message": "Admin access required",
        }, 403

    claims = get_jwt()
    organization_id = claims.get("organization_id")

    users = db.session.execute(
        db.select(User)
        .where(User.organization_id == organization_id)
        .order_by(User.id.desc())
    ).scalars().all()

    return {
        "success": True,
        "users": [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "is_active": user.is_active,
                "permissions": user.get_permissions(),
            }
            for user in users
        ],
    }, 200


@admin_bp.post("/users")
@jwt_required()
@limiter.limit("30 per minute")
def create_user():
    if not has_admin_access():
        return {
            "success": False,
            "message": "Admin access required",
        }, 403

    claims = get_jwt()
    organization_id = claims.get("organization_id")

    data = request.get_json() or {}

    username = str(data.get("username", "")).strip()
    email = str(data.get("email", "")).strip()
    full_name = str(data.get("full_name", "")).strip()
    password = str(data.get("password", ""))
    role = str(data.get("role", "user")).strip()
    permissions_dict = data.get("permissions")

    if not username or not email or not full_name or not password:
        return {
            "success": False,
            "message": "Username, email, full name and password are required",
        }, 400

    if len(password) < 8:
        return {
            "success": False,
            "message": "Password must be at least 8 characters long",
        }, 400

    allowed_roles = ["admin", "user"]
    if has_super_admin_access():
        allowed_roles.append("super_admin")

    if role not in allowed_roles:
        return {
            "success": False,
            "message": f"Invalid role. You can assign: {', '.join(allowed_roles)}",
        }, 400

    existing_user = db.session.execute(
        db.select(User).where(
            (User.username == username) |
            (User.email == email)
        )
    ).scalar_one_or_none()

    if existing_user:
        return {
            "success": False,
            "message": "Username or email already exists",
        }, 409

    user = User(
        organization_id=organization_id,
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        full_name=full_name,
        role=role,
        is_active=True,
    )

    if role == "admin" and isinstance(permissions_dict, dict):
        user.permissions = json.dumps(permissions_dict)

    db.session.add(user)
    db.session.commit()

    return {
        "success": True,
        "message": "User created successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "permissions": user.get_permissions(),
        },
    }, 201


@admin_bp.put("/users/<int:user_id>")
@jwt_required()
def update_user(user_id):
    if not has_admin_access():
        return {
            "success": False,
            "message": "Admin access required",
        }, 403

    claims = get_jwt()
    organization_id = claims.get("organization_id")
    current_user_id = int(get_jwt_identity())

    user = db.session.execute(
        db.select(User).where(
            User.id == user_id,
            User.organization_id == organization_id,
        )
    ).scalar_one_or_none()

    if not user:
        return {
            "success": False,
            "message": "User not found",
        }, 404

    # Protect Super Admin accounts from being modified or deactivated by regular admins
    if user.role == "super_admin" and not has_super_admin_access():
        return {
            "success": False,
            "message": "Admin cannot modify or deactivate a Super Admin account",
        }, 403

    data = request.get_json() or {}

    if "full_name" in data:
        user.full_name = str(data["full_name"]).strip()

    if "email" in data:
        user.email = str(data["email"]).strip()

    # Role updates: super_admin can set admin, super_admin, user.
    # Regular admin can set admin or user.
    if "role" in data:
        new_role = str(data["role"]).strip()
        if has_super_admin_access():
            if new_role in ["admin", "super_admin", "user"]:
                user.role = new_role
        else:
            if new_role in ["admin", "user"]:
                user.role = new_role
            elif new_role == "super_admin":
                return {
                    "success": False,
                    "message": "Only Super Admin can assign Super Admin role",
                }, 403

    if "permissions" in data and isinstance(data["permissions"], dict):
        if has_super_admin_access() or has_admin_access():
            user.permissions = json.dumps(data["permissions"])

    if "is_active" in data:
        new_active = bool(data["is_active"])
        if not new_active and user.id == current_user_id:
            return {
                "success": False,
                "message": "You cannot deactivate your own account",
            }, 400
        user.is_active = new_active

    if "password" in data and data["password"]:
        pwd = str(data["password"])
        if len(pwd) < 8:
            return {
                "success": False,
                "message": "Password must be at least 8 characters long",
            }, 400
        user.password_hash = generate_password_hash(pwd)

    db.session.commit()

    return {
        "success": True,
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "permissions": user.get_permissions(),
        },
    }, 200


@admin_bp.delete("/users/<int:user_id>")
@jwt_required()
def delete_user(user_id):
    if not has_super_admin_access():
        return {
            "success": False,
            "message": "Only Super Admin can delete users",
        }, 403

    claims = get_jwt()
    organization_id = claims.get("organization_id")
    current_user_id = int(get_jwt_identity())

    if user_id == current_user_id:
        return {
            "success": False,
            "message": "Cannot delete yourself",
        }, 400

    user = db.session.execute(
        db.select(User).where(
            User.id == user_id,
            User.organization_id == organization_id,
        )
    ).scalar_one_or_none()

    if not user:
        return {
            "success": False,
            "message": "User not found",
        }, 404

    # Delete all expenses (no cascade on this relationship)
    deleted_expenses = db.session.execute(
        db.delete(Expense).where(
            Expense.user_id == user_id,
            Expense.organization_id == organization_id,
        )
    ).rowcount

    # Delete all salaries (also manual for safety)
    deleted_salaries = db.session.execute(
        db.delete(Salary).where(
            Salary.user_id == user_id,
            Salary.organization_id == organization_id,
        )
    ).rowcount

    # Delete the user (cascade will handle any remaining relationships)
    db.session.delete(user)
    db.session.commit()

    return {
        "success": True,
        "message": f"User '{user.full_name}' and all their data have been permanently deleted.",
        "deleted": {
            "expenses": deleted_expenses,
            "salaries": deleted_salaries,
        },
    }, 200


@admin_bp.post("/users/<int:user_id>/reset-code")
@jwt_required()
def generate_reset_code(user_id):
    if not has_admin_access():
        return {
            "success": False,
            "message": "Admin access required",
        }, 403

    claims = get_jwt()
    organization_id = claims.get("organization_id")

    user = db.session.execute(
        db.select(User).where(
            User.id == user_id,
            User.organization_id == organization_id,
        )
    ).scalar_one_or_none()

    if not user:
        return {
            "success": False,
            "message": "User not found",
        }, 404

    # Protect Super Admin from reset code generation by regular admins
    if user.role == "super_admin" and not has_super_admin_access():
        return {
            "success": False,
            "message": "Admin cannot generate reset code for a Super Admin account",
        }, 403

    code = f"{secrets.randbelow(1_000_000):06d}"

    user.reset_code_hash = generate_password_hash(code)
    user.reset_code_expires_at = datetime.utcnow() + timedelta(
        minutes=RESET_CODE_EXPIRY_MINUTES
    )
    # Clear the pending request if there was one
    user.reset_requested_at = None

    db.session.commit()

    return {
        "success": True,
        "message": "Reset code generated.",
        "code": code,
        "expires_in_minutes": RESET_CODE_EXPIRY_MINUTES,
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
        },
    }, 200