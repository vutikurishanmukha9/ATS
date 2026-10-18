import uuid

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import UnauthorizedException
from app.core.security import decode_access_token
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.services.auth_service import AuthService
from app.services.candidate_service import CandidateService
from app.services.dashboard_service import DashboardService
from app.services.note_service import NoteService
from app.services.screening import ScreeningService
from app.services.stage_service import StageService


async def get_current_user(request: Request, session: AsyncSession = Depends(get_db)) -> User:
    """Extracts session token from httpOnly cookie or Authorization Bearer header."""
    token = request.cookies.get(settings.COOKIE_NAME)

    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        raise UnauthorizedException("Authentication credentials were not provided")

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise UnauthorizedException("Invalid or expired session token")

    try:
        user_id = uuid.UUID(payload["sub"])
    except ValueError:
        raise UnauthorizedException("Malformed subject in token")

    user_repo = UserRepository(session)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedException("User associated with session not found")

    return user


def get_auth_service(session: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(session)


def get_candidate_service(session: AsyncSession = Depends(get_db)) -> CandidateService:
    return CandidateService(session)


def get_stage_service(session: AsyncSession = Depends(get_db)) -> StageService:
    return StageService(session)


def get_note_service(session: AsyncSession = Depends(get_db)) -> NoteService:
    return NoteService(session)


def get_dashboard_service(session: AsyncSession = Depends(get_db)) -> DashboardService:
    return DashboardService(session)


def get_screening_service(session: AsyncSession = Depends(get_db)) -> ScreeningService:
    return ScreeningService(session)

