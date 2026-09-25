import os
import secrets
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

WEAK_SECRETS = {
    "",
    "expenseflow-development-secret",
    "expenseflow-jwt-development-secret",
    "expenseflow-dev-secret-2026-change-before-production",
    "expenseflow-jwt-secret-2026-change-before-production",
    "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_KEY",
    "CHANGE_THIS_TO_A_LONG_RANDOM_JWT_SECRET",
}


def _get_secure_secret(env_var_name: str) -> str:
    val = os.getenv(env_var_name, "").strip()
    if val and val not in WEAK_SECRETS and len(val) >= 24:
        return val

    # Automatically generate cryptographically strong 256-bit secret
    new_secret = secrets.token_hex(32)
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    try:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                content = f.read()
            import re
            if f"{env_var_name}=" in content:
                content = re.sub(rf"^{env_var_name}=.*$", f"{env_var_name}={new_secret}", content, flags=re.MULTILINE)
            else:
                content += f"\n{env_var_name}={new_secret}\n"
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(content)
        else:
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(f"{env_var_name}={new_secret}\n")
    except Exception:
        pass

    os.environ[env_var_name] = new_secret
    return new_secret


class Config:
    SECRET_KEY = _get_secure_secret("SECRET_KEY")

    _db_url = os.getenv("DATABASE_URL", "sqlite:///expenseflow.db")
    if _db_url and _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = _get_secure_secret("JWT_SECRET_KEY")

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(
            os.getenv(
                "ACCESS_TOKEN_EXPIRES_MINUTES",
                "60",
            )
        )
    )

    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS",
        "*",
    )

    # Security: File Upload Size Limit (10MB) to prevent DoS
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024

    # Rate Limiting configuration
    RATELIMIT_STORAGE_URI = "memory://"