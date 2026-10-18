from collections.abc import AsyncGenerator
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


def get_normalized_database_url(raw_url: str) -> tuple[str, dict]:
    """
    Normalizes database URL for asyncpg and Neon serverless pooler.
    Converts postgresql:// to postgresql+asyncpg://, strips sslmode and channel_binding,
    and sets SSL and statement cache settings for connection pooling.
    """
    if not raw_url:
        return raw_url, {}

    connect_args = {}

    # If already sqlite, return directly
    if raw_url.startswith("sqlite"):
        return raw_url, connect_args

    # Convert postgres:// or postgresql:// to postgresql+asyncpg://
    url = raw_url
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://") :]
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://") :]

    # Parse and strip problematic asyncpg query parameters
    parsed = urlparse(url)
    if parsed.query:
        query_params = parse_qs(parsed.query)
        # Strip sslmode, channel_binding which asyncpg does not accept in query string
        query_params.pop("sslmode", None)
        query_params.pop("channel_binding", None)
        new_query = urlencode(query_params, doseq=True)
        url = urlunparse(
            (
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                new_query,
                parsed.fragment,
            )
        )

    # Asyncpg settings for Neon pooled endpoints
    connect_args["ssl"] = True
    connect_args["statement_cache_size"] = 0
    connect_args["prepared_statement_cache_size"] = 0

    return url, connect_args


normalized_url, engine_connect_args = get_normalized_database_url(settings.DATABASE_URL)

engine_kwargs = {
    "echo": False,
    "future": True,
}

if not normalized_url.startswith("sqlite"):
    engine_kwargs.update(
        {
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "pool_size": 5,
            "max_overflow": 10,
            "connect_args": engine_connect_args,
        }
    )
else:
    engine_kwargs.update({"connect_args": {"check_same_thread": False} if "sqlite" in normalized_url else {}})

engine = create_async_engine(normalized_url, **engine_kwargs)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
