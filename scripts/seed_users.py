"""Seed hardcoded users into the database."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from autoglean.db.base import SessionLocal
from autoglean.db.models import User
from autoglean.auth.security import get_password_hash


def seed_users():
    """Seed hardcoded users into the database."""
    db = SessionLocal()

    try:
        # Define hardcoded users
        users_data = [
            {
                "full_name": "Ahmed Al-Mansouri",
                "email": "ahmed.almansouri@autoglean.com",
                "department": "Engineering",
                "password": "password123"
            },
            {
                "full_name": "Fatima Hassan",
                "email": "fatima.hassan@autoglean.com",
                "department": "Data Science",
                "password": "password123"
            },
            {
                "full_name": "Mohammed Ibrahim",
                "email": "mohammed.ibrahim@autoglean.com",
                "department": "Operations",
                "password": "password123"
            },
            {
                "full_name": "Sara Abdullah",
                "email": "sara.abdullah@autoglean.com",
                "department": "Research",
                "password": "password123"
            },
            {
                "full_name": "Khalid Al-Rashid",
                "email": "khalid.alrashid@autoglean.com",
                "department": "Engineering",
                "password": "password123"
            }
        ]

        for user_data in users_data:
            # Check if user already exists
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()

            if existing_user:
                print(f"User {user_data['email']} already exists, skipping...")
                continue

            # Create new user
            new_user = User(
                full_name=user_data["full_name"],
                email=user_data["email"],
                department=user_data["department"],
                password_hash=get_password_hash(user_data["password"]),
                is_active=True
            )

            db.add(new_user)
            print(f"Created user: {user_data['email']}")

        db.commit()
        print("\n✅ User seeding completed successfully!")

        # Print summary
        total_users = db.query(User).count()
        print(f"\nTotal users in database: {total_users}")

    except Exception as e:
        print(f"\n❌ Error seeding users: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
