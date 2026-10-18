import asyncio
import os
import sys

from app.core.config import settings
from app.core.database import async_session_maker
from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repo import UserRepository


async def create_first_user():
    email = os.environ.get("FIRST_USER_EMAIL") or settings.FIRST_USER_EMAIL
    password = os.environ.get("FIRST_USER_PASSWORD") or settings.FIRST_USER_PASSWORD
    full_name = os.environ.get("FIRST_USER_NAME") or settings.FIRST_USER_NAME or "Admin Recruiter"

    if not email or not password:
        print("Error: FIRST_USER_EMAIL and FIRST_USER_PASSWORD environment variables are required.")
        sys.exit(1)

    email = email.strip().lower()

    async with async_session_maker() as session:
        user_repo = UserRepository(session)
        existing = await user_repo.get_by_email(email)
        if existing:
            print(f"User with email '{email}' already exists (ID: {existing.id}). No action taken.")
            return

        user = User(email=email, password_hash=hash_password(password), full_name=full_name)
        await user_repo.create(user)
        await session.commit()
        print(f"Successfully created first user: {email} (ID: {user.id})")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "create-first-user":
        asyncio.run(create_first_user())
    else:
        asyncio.run(create_first_user())
