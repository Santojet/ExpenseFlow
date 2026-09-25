from app import create_app
from app.extensions import db
from app.models.user import User

def make_super_admin(username_or_email):
    app = create_app()
    with app.app_context():
        user = db.session.execute(
            db.select(User).where(
                (User.username == username_or_email) |
                (User.email == username_or_email)
            )
        ).scalar_one_or_none()

        if not user:
            print(f"Error: User '{username_or_email}' not found.")
            return

        user.role = "super_admin"
        # Reset permissions field so it defaults to super admin permissions
        user.permissions = None 
        db.session.commit()
        print(f"Success: User '{username_or_email}' is now a super_admin.")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python make_super_admin.py <username_or_email>")
    else:
        make_super_admin(sys.argv[1])
