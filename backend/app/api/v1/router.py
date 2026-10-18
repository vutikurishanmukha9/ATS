from fastapi import APIRouter

from app.api.v1.endpoints import auth, candidates, careers, dashboard, health, notes, screening

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(candidates.router)
api_router.include_router(notes.router)
api_router.include_router(dashboard.router)
api_router.include_router(screening.router)
api_router.include_router(careers.router)
api_router.include_router(health.router)


