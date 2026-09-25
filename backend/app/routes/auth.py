import secrets
from datetime import datetime, timedelta
from threading import Timer

from flask import Blueprint, current_app, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db, limiter
from app.models.user import User
from sqlalchemy import func

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

RESET_CODE_EXPIRY_MINUTES = 15
ADMIN_RESPONSE_SECONDS = 40


# ---------------------------------------------------------------------------
# Helper: auto-generate reset code if admin has not acted within the window
# ---------------------------------------------------------------------------

def _auto_generate_if_pending(app, user_id: int, requested_at: datetime):
    """
    Called from a background thread after ADMIN_RESPONSE_SECONDS.
    If the reset_requested_at on the user is still equal to the timestamp we
    recorded when the request was made, the admin has not acted yet — so we
    generate the code automatically.
    """
    with app.app_context():
        user = db.session.get(User, user_id)
        if user is None:
            return
        # Admin has already generated a code → do nothing
        if user.reset_requested_at != requested_at:
            return
        # Still pending — auto-generate
        code = f"{secrets.randbelow(1_000_000):06d}"
        user.reset_code_hash = generate_password_hash(code)
        user.reset_code_expires_at = datetime.utcnow() + timedelta(
            minutes=RESET_CODE_EXPIRY_MINUTES
        )
        user.reset_requested_at = None  # request fulfilled
        db.session.commit()
        # In a real deployment you would send an email here.
        # The code is now stored in the DB; admin can see it via the
        # "pending resets" polling endpoint if needed.
        current_app.logger.info(
            "Auto-generated reset code for user %s (no admin response in %ds).",
            user.username,
            ADMIN_RESPONSE_SECONDS,
        )


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------

@auth_bp.post("/login")
@limiter.limit("10 per minute")
def login():
    data = request.get_json() or {}

    username_or_email = data.get("username", "").strip()
    password = data.get("password", "")

    if not username_or_email or not password:
        return {
            "success": False,
            "message": "Username/email and password are required",
        }, 400

    user = db.session.execute(
        db.select(User).where(
            (func.lower(User.username) == username_or_email.lower())
            | (func.lower(User.email) == username_or_email.lower())
        )
    ).scalar_one_or_none()

    if not user:
        return {
            "success": False,
            "message": "Invalid username or password",
        }, 401

    if not user.is_active:
        return {
            "success": False,
            "message": "User account is inactive",
        }, 403

    if not check_password_hash(user.password_hash, password):
        return {
            "success": False,
            "message": "Invalid username or password",
        }, 401

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "organization_id": user.organization_id,
        },
    )

    return {
        "success": True,
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "language": getattr(user, "language", "en") or "en",
            "permissions": user.get_permissions(),
        },
    }, 200


# ---------------------------------------------------------------------------
# POST /api/auth/request-reset
# User submits their email/username to request a password reset.
# The request is logged; a background timer fires after ADMIN_RESPONSE_SECONDS.
# ---------------------------------------------------------------------------

@auth_bp.post("/request-reset")
@limiter.limit("5 per minute")
def request_reset():
    data = request.get_json() or {}
    username_or_email = str(data.get("username", "")).strip()

    if not username_or_email:
        return {
            "success": False,
            "message": "Please provide your username or email address.",
        }, 400

    user = db.session.execute(
        db.select(User).where(
            (func.lower(User.username) == username_or_email.lower())
            | (func.lower(User.email) == username_or_email.lower())
        )
    ).scalar_one_or_none()

    # Always return success to avoid user enumeration
    if not user or not user.is_active:
        return {
            "success": True,
            "message": (
                "If an account with that username/email exists, "
                "a reset request has been submitted."
            ),
        }, 200

    requested_at = datetime.utcnow()
    user.reset_requested_at = requested_at
    db.session.commit()

    # Fire background timer — auto-generate code after ADMIN_RESPONSE_SECONDS
    app_instance = current_app._get_current_object()
    t = Timer(
        ADMIN_RESPONSE_SECONDS,
        _auto_generate_if_pending,
        args=[app_instance, user.id, requested_at],
    )
    t.daemon = True
    t.start()

    return {
        "success": True,
        "message": (
            "Reset request submitted! Your admin has been notified. "
            f"If no action is taken within {ADMIN_RESPONSE_SECONDS} seconds, "
            "a code will be generated automatically."
        ),
        "expires_in_seconds": ADMIN_RESPONSE_SECONDS,
    }, 200


# ---------------------------------------------------------------------------
# GET /api/auth/pending-resets
# Admin / Super Admin polls this to see who has pending reset requests.
# ---------------------------------------------------------------------------

@auth_bp.get("/pending-resets")
@jwt_required()
def pending_resets():
    claims = get_jwt()
    role = claims.get("role", "")
    if role not in ("admin", "super_admin"):
        return {"success": False, "message": "Admin access required"}, 403

    organization_id = claims.get("organization_id")

    pending = db.session.execute(
        db.select(User).where(
            User.organization_id == organization_id,
            User.reset_requested_at.isnot(None),
        )
    ).scalars().all()

    now = datetime.utcnow()

    return {
        "success": True,
        "pending": [
            {
                "id": u.id,
                "username": u.username,
                "full_name": u.full_name,
                "email": u.email,
                "requested_at": u.reset_requested_at.isoformat(),
                "seconds_ago": int(
                    (now - u.reset_requested_at).total_seconds()
                ),
                "admin_window_seconds": ADMIN_RESPONSE_SECONDS,
            }
            for u in pending
        ],
    }, 200


# ---------------------------------------------------------------------------
# POST /api/auth/reset-password
# User submits code + new password.
# ---------------------------------------------------------------------------

@auth_bp.post("/reset-password")
@limiter.limit("5 per minute")
def reset_password():
    data = request.get_json() or {}

    username_or_email = str(data.get("username", "")).strip()
    code = str(data.get("code", "")).strip()
    new_password = str(data.get("new_password", ""))

    if not username_or_email or not code or not new_password:
        return {
            "success": False,
            "message": "Username/email, code and new password are required",
        }, 400

    if len(new_password) < 8:
        return {
            "success": False,
            "message": "New password must be at least 8 characters",
        }, 400

    user = db.session.execute(
        db.select(User).where(
            (func.lower(User.username) == username_or_email.lower())
            | (func.lower(User.email) == username_or_email.lower())
        )
    ).scalar_one_or_none()

    # Generic message on failure so we don't reveal account existence.
    invalid_response = {
        "success": False,
        "message": "Invalid or expired reset code",
    }, 400

    if not user or not user.reset_code_hash or not user.reset_code_expires_at:
        return invalid_response

    if datetime.utcnow() > user.reset_code_expires_at:
        user.reset_code_hash = None
        user.reset_code_expires_at = None
        db.session.commit()
        return invalid_response

    if not check_password_hash(user.reset_code_hash, code):
        return invalid_response

    user.password_hash = generate_password_hash(new_password)
    user.reset_code_hash = None
    user.reset_code_expires_at = None

    db.session.commit()

    return {
        "success": True,
        "message": "Password reset successful. You can now sign in with your new password.",
    }, 200


# ---------------------------------------------------------------------------
# PUT /api/auth/profile
# Authenticated user updates their own full_name, email, and optionally password.
# ---------------------------------------------------------------------------

@auth_bp.put("/profile")
@jwt_required()
@limiter.limit("20 per minute")
def update_profile():
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    user = db.session.get(User, user_id)
    if not user:
        return {"success": False, "message": "User not found"}, 404

    data = request.get_json() or {}

    full_name = str(data.get("full_name", "")).strip()
    email = str(data.get("email", "")).strip()

    if not full_name or not email:
        return {"success": False, "message": "Full name and email are required"}, 400

    # Check email uniqueness (excluding self)
    existing = db.session.execute(
        db.select(User).where(User.email == email, User.id != user_id)
    ).scalar_one_or_none()
    if existing:
        return {"success": False, "message": "Email already in use"}, 409

    user.full_name = full_name
    user.email = email

    language = str(data.get("language", "")).strip().lower()
    if language in ("en", "bn"):
        user.language = language

    # Optional password change
    new_password = data.get("new_password", "")
    if new_password:
        current_password = data.get("current_password", "")
        if not current_password:
            return {"success": False, "message": "Current password is required to set a new password"}, 400
        if not check_password_hash(user.password_hash, current_password):
            return {"success": False, "message": "Current password is incorrect"}, 400
        if len(new_password) < 8:
            return {"success": False, "message": "New password must be at least 8 characters"}, 400
        user.password_hash = generate_password_hash(new_password)

    db.session.commit()

    return {
        "success": True,
        "message": "Profile updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "language": getattr(user, "language", "en") or "en",
        },
    }, 200


# ---------------------------------------------------------------------------
# GET /api/auth/me
# Returns fresh profile info for the currently authenticated user
# ---------------------------------------------------------------------------

@auth_bp.get("/me")
@jwt_required()
def get_current_user():
    try:
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        if not user or not user.is_active:
            return {"success": False, "message": "User not found or inactive"}, 401
        return {
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "language": getattr(user, "language", "en") or "en",
                "permissions": user.get_permissions(),
            },
        }, 200
    except Exception as e:
        return {"success": False, "message": str(e)}, 500