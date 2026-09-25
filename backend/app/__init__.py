from flask import Flask

from .config import Config
from .extensions import cors, db, jwt, limiter, migrate

from .routes.auth import auth_bp
from .routes.expenses import expenses_bp
from .routes.salary import salary_bp
from .routes.admin import admin_bp
from .routes.reports import reports_bp
from .routes.budgets import budgets_bp
from .routes.goals import goals_bp
from .routes.debts import debts_bp
from .routes.categories import categories_bp
from .routes.summary_api import summary_bp


def create_app(config_class=Config):
    app = Flask(__name__)

    app.config.from_object(config_class)

    # Database
    db.init_app(app)

    # Migration
    migrate.init_app(app, db)

    # JWT Authentication
    jwt.init_app(app)

    # CORS
    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": app.config["CORS_ORIGINS"].split(",")
            }
        },
    )

    # Rate Limiter
    limiter.init_app(app)

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(expenses_bp)
    app.register_blueprint(salary_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(budgets_bp)
    app.register_blueprint(goals_bp)
    app.register_blueprint(debts_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(summary_bp)

    with app.app_context():
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)

            # Legacy column migrations
            if "expenses" in inspector.get_table_names():
                cols = [c["name"] for c in inspector.get_columns("expenses")]
                if "quantity" not in cols:
                    db.session.execute(text("ALTER TABLE expenses ADD COLUMN quantity NUMERIC(10, 2)"))
                if "unit_price" not in cols:
                    db.session.execute(text("ALTER TABLE expenses ADD COLUMN unit_price NUMERIC(12, 2)"))
                if "is_recurring" not in cols:
                    db.session.execute(text("ALTER TABLE expenses ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE"))
                if "recurrence_frequency" not in cols:
                    db.session.execute(text("ALTER TABLE expenses ADD COLUMN recurrence_frequency VARCHAR(50)"))
                if "receipt_url" not in cols:
                    db.session.execute(text("ALTER TABLE expenses ADD COLUMN receipt_url VARCHAR(500)"))
                if "next_due_date" not in cols:
                    db.session.execute(text("ALTER TABLE expenses ADD COLUMN next_due_date DATE"))
                db.session.commit()
            if "users" in inspector.get_table_names():
                u_cols = [c["name"] for c in inspector.get_columns("users")]
                if "language" not in u_cols:
                    db.session.execute(text("ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT 'en'"))
                db.session.commit()

            # Auto-create new tables (budgets, savings_goals, debts)
            from app.models.budget import Budget
            from app.models.savings_goal import SavingsGoal
            from app.models.debt import Debt
            from app.models.category import Category
            db.create_all()

        except Exception:
            pass

    # Uploads Static Route with Security Hardening
    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        import os
        from flask import send_from_directory, abort
        # Strict path traversal guard
        safe_name = os.path.basename(filename)
        if safe_name != filename or ".." in filename or "/" in filename or "\\" in filename:
            abort(404)
        uploads_dir = os.path.abspath(os.path.join(app.root_path, "..", "..", "uploads"))
        os.makedirs(uploads_dir, exist_ok=True)
        resp = send_from_directory(uploads_dir, safe_name)
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox"
        return resp

    # Global Security Headers
    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
        return response

    # Root API
    @app.get("/")
    def index():
        return {
            "success": True,
            "application": app.config.get(
                "APP_NAME",
                "ExpenseFlow Pro"
            ),
            "message": "ExpenseFlow Pro API is running",
        }

    # Health Check
    @app.get("/api/health")
    def health_check():
        return {
            "success": True,
            "status": "healthy",
        }

    return app