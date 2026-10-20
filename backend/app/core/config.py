from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore")

    ENV: str = "development"
    PROJECT_NAME: str = "ATS Platform"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./test_ats.db"
    DATABASE_URL_DIRECT: str | None = None

    # Auth & Security
    JWT_SECRET: str = "ats-insecure-secret-key-change-in-production-min32chars"
    SECRET_KEY: str | None = None
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    @model_validator(mode="after")
    def sync_secret_keys(self) -> "Settings":
        if self.SECRET_KEY and self.JWT_SECRET == "ats-insecure-secret-key-change-in-production-min32chars":
            self.JWT_SECRET = self.SECRET_KEY
        return self

    # Cookie settings
    COOKIE_NAME: str = "ats_session"
    COOKIE_DOMAIN: str | None = None
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: object) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173", "http://localhost:3000"]

    # First user bootstrap (CLI)
    FIRST_USER_EMAIL: str | None = None
    FIRST_USER_PASSWORD: str | None = None
    FIRST_USER_NAME: str | None = None


settings = Settings()
