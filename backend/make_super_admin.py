import os
from werkzeug.security import generate_password_hash
from app import create_app
from app.extensions import db
from app.models.user import User
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

def make_super_admin(username_or_email, new_password=None):
    app = create_app()
    with app.app_context():
        user = db.session.execute(
            db.select(User).where(
                (User.username == username_or_email) |
                (User.email == username_or_email)
            )
        ).scalar_one_or_none()

        if not user:
            print(f"Error: User '{username_or_email}' not found in local database.")
            return

        user.role = "super_admin"
        user.is_active = True
        user.permissions = None 
        if new_password:
            user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        print(f"Success (Local SQLite): User '{username_or_email}' updated to super_admin.")

    # Also update Neon PostgreSQL database if connection is available
    pg_uri = os.getenv("DATABASE_URL_PG", "postgresql://neondb_owner:npg_mcUXeEzs0W2Q@ep-broad-smoke-b56bmc34-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require")
    try:
        pg_engine = create_engine(pg_uri)
        with Session(pg_engine) as pg_session:
            pg_user = pg_session.execute(
                db.select(User).where(
                    (User.username == username_or_email) |
                    (User.email == username_or_email)
                )
            ).scalar_one_or_none()
            if pg_user:
                pg_user.role = "super_admin"
                pg_user.is_active = True
                pg_user.permissions = None
                if new_password:
                    pg_user.password_hash = generate_password_hash(new_password)
                pg_session.commit()
                print(f"Success (Neon Postgres): User '{username_or_email}' updated to super_admin.")
            else:
                print(f"Notice (Neon Postgres): User '{username_or_email}' not found in Neon DB.")
    except Exception as e:
        print(f"Neon Postgres sync warning: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python make_super_admin.py <username_or_email> [new_password]")
    else:
        pwd = sys.argv[2] if len(sys.argv) > 2 else None
        make_super_admin(sys.argv[1], pwd)

