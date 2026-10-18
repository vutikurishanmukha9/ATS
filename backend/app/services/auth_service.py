import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedException
from app.core.security import create_access_token, verify_password
from app.repositories.user_repo import UserRepository
from app.schemas.auth import UserRead


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)

    async def authenticate_user(self, email: str, password: str) -> tuple[UserRead, str]:
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise UnauthorizedException("Invalid email or password")

        if not verify_password(password, user.password_hash):
            raise UnauthorizedException("Invalid email or password")

        token = create_access_token(subject=str(user.id))
        user_read = UserRead.model_validate(user)
        return user_read, token

    async def get_current_user(self, user_id: uuid.UUID) -> UserRead | None:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            return None
        return UserRead.model_validate(user)
