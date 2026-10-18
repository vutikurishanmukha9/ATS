from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health", status_code=status.HTTP_200_OK)
async def liveness_health() -> dict:
    """Liveness probe without database check (used by Render health check)."""
    return {"status": "ok", "service": "ats-api"}


@router.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness_health(session: AsyncSession = Depends(get_db)) -> JSONResponse:
    """Readiness probe that validates database connectivity."""
    try:
        await session.execute(text("SELECT 1"))
        return JSONResponse(status_code=200, content={"status": "ready", "database": "connected"})
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "database": "disconnected",
                "error": str(exc),
            },
        )
