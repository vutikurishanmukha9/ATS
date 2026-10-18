import time
import uuid
from collections.abc import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.exceptions import ATSException
from app.core.logging import logger


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Generates request_id, calculates duration, logs structured event, adds security headers."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        # Mutating requests (POST, PUT, PATCH) with body must have JSON content-type
        if request.method in ("POST", "PUT", "PATCH"):
            content_type = request.headers.get("content-type", "")
            # Allow requests with empty body or application/json
            content_length = request.headers.get("content-length", "0")
            if (
                content_length != "0"
                and not content_type.startswith("application/json")
                and not content_type.startswith("multipart/form-data")
                and not request.url.path.endswith("/logout")
            ):
                return JSONResponse(
                    status_code=415,
                    content={
                        "error": {
                            "code": "UNSUPPORTED_MEDIA_TYPE",
                            "message": "Mutating requests require Content-Type: application/json",
                            "details": None,
                            "request_id": request_id,
                        }
                    },
                    headers={"X-Request-ID": request_id},
                )

        start_time = time.perf_counter()
        try:
            response = await call_next(request)
        except ATSException as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.warning(
                f"{request.method} {request.url.path} returned {exc.status_code}",
                extra={
                    "request_id": request_id,
                    "duration_ms": duration_ms,
                    "status_code": exc.status_code,
                },
            )
            response = JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": {
                        "code": exc.code,
                        "message": exc.message,
                        "details": exc.details,
                        "request_id": request_id,
                    }
                },
                headers=exc.headers,
            )
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                f"Unhandled exception on {request.method} {request.url.path}: {exc!s}",
                exc_info=True,
                extra={"request_id": request_id, "duration_ms": duration_ms},
            )
            response = JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "An unexpected error occurred",
                        "details": None,
                        "request_id": request_id,
                    }
                },
            )

        duration_ms = (time.perf_counter() - start_time) * 1000
        response.headers["X-Request-ID"] = request_id
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        logger.info(
            f"{request.method} {request.url.path} {response.status_code} ({duration_ms:.1f}ms)",
            extra={
                "request_id": request_id,
                "duration_ms": duration_ms,
                "status_code": response.status_code,
            },
        )
        return response


class LoginRateLimiter:
    """Simple in-memory rate limiter for login attempts per IP (max 5 requests per minute)."""

    def __init__(self, max_attempts: int = 5, window_seconds: int = 60):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.attempts: dict[str, list[float]] = {}

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        timestamps = self.attempts.get(client_ip, [])
        # prune old timestamps
        valid_timestamps = [t for t in timestamps if now - t < self.window_seconds]
        if len(valid_timestamps) >= self.max_attempts:
            self.attempts[client_ip] = valid_timestamps
            return False
        valid_timestamps.append(now)
        self.attempts[client_ip] = valid_timestamps
        return True


login_rate_limiter = LoginRateLimiter(max_attempts=5, window_seconds=60)
