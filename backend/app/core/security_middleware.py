"""
Security Hardening Middleware for FastAPI.
Provides HTTP security headers, request rate limiting, payload size defense, and error sanitization.
"""
import time
import logging
from typing import Dict, Tuple, List
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

logger = logging.getLogger("archive.security")

# Rate limit buckets: path_prefix -> (max_requests, window_seconds)
RATE_LIMIT_RULES: List[Tuple[str, int, int]] = [
    ("/api/v1/auth/login", 15, 60),
    ("/api/v1/kiosk/heartbeat", 120, 60),
    ("/api/v1/search", 60, 60),
    ("/api/v1/research", 40, 60),
]
DEFAULT_RATE_LIMIT = (300, 60) # 300 requests per minute default


class RateLimiter:
    def __init__(self):
        # ip -> list of timestamps
        self._history: Dict[str, List[float]] = {}
        self.enabled: bool = True

    def check_rate_limit(self, client_ip: str, path: str) -> Tuple[bool, int, int, int]:
        """
        Returns (is_allowed, limit, remaining, retry_after).
        """
        if not self.enabled:
            return True, 1000, 1000, 0

        now = time.time()
        # Find matching rule
        limit, window = DEFAULT_RATE_LIMIT
        for prefix, rule_limit, rule_window in RATE_LIMIT_RULES:
            if path.startswith(prefix):
                limit, window = rule_limit, rule_window
                break

        key = f"{client_ip}:{path.split('?')[0]}"
        timestamps = self._history.get(key, [])

        # Prune expired timestamps
        cutoff = now - window
        timestamps = [t for t in timestamps if t > cutoff]

        if len(timestamps) >= limit:
            retry_after = max(1, int(window - (now - timestamps[0])))
            self._history[key] = timestamps
            return False, limit, 0, retry_after

        timestamps.append(now)
        self._history[key] = timestamps
        remaining = max(0, limit - len(timestamps))
        return True, limit, remaining, 0


# Global in-memory rate limiter
global_rate_limiter = RateLimiter()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Check payload size for non-upload endpoints (2 MB max)
        content_length = request.headers.get("content-length")
        is_upload = request.url.path.startswith(("/api/v1/media", "/api/v1/documents", "/api/v1/ocr", "/api/v1/import"))
        if content_length and not is_upload:
            try:
                length = int(content_length)
                if length > 2 * 1024 * 1024: # 2 MB
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request payload too large. Maximum allowed size is 2MB for standard endpoints."}
                    )
            except ValueError:
                pass

        # Check rate limit
        client_ip = request.client.host if request.client else "127.0.0.1"
        allowed, limit, remaining, retry_after = global_rate_limiter.check_rate_limit(client_ip, request.url.path)
        if not allowed:
            headers = {
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0"
            }
            return JSONResponse(
                status_code=429,
                content={"detail": f"Rate limit exceeded. Please wait {retry_after} seconds before retrying."},
                headers=headers
            )

        # Call next handler
        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error(f"Unhandled exception in request {request.method} {request.url.path}: {exc}")
            # Sanitize production error responses: never expose internal stack trace or credentials
            return JSONResponse(
                status_code=500,
                content={"detail": "An internal institutional archival server error occurred. Please contact the administrator."}
            )

        # Inject Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(self), microphone=(self)"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "media-src 'self' blob:; "
            "connect-src 'self' ws: wss:; "
            "font-src 'self' data:;"
        )

        # Strict-Transport-Security: Only enable if connection is HTTPS or under reverse proxy
        if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Rate limit informational headers
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        return response
