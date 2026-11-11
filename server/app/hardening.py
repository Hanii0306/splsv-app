"""Internet-facing protections: rate limits, body-size limit, security headers, client IP."""

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from .config import settings


def client_ip(request: Request) -> str:
    if settings.trust_proxy:
        cf = request.headers.get("cf-connecting-ip")
        if cf:
            return cf.strip()
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()
    return request.client.host if request.client else "?"


class SlidingWindow:
    """In-memory sliding-window counter (single process; enough for one school server)."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key: str, window: float, now: float) -> deque[float]:
        q = self._hits[key]
        while q and q[0] <= now - window:
            q.popleft()
        return q

    def count(self, key: str, window: float) -> int:
        with self._lock:
            return len(self._prune(key, window, time.monotonic()))

    def hit(self, key: str, window: float) -> int:
        now = time.monotonic()
        with self._lock:
            q = self._prune(key, window, now)
            q.append(now)
            return len(q)

    def clear(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = SlidingWindow()


def too_many(retry_after: int) -> HTTPException:
    return HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
        headers={"Retry-After": str(retry_after)},
    )


def rate_limit(bucket: str, max_hits: int, window_s: int):
    """FastAPI dependency: max_hits per client IP per window."""

    def dep(request: Request) -> None:
        if limiter.hit(f"{bucket}:{client_ip(request)}", window_s) > max_hits:
            raise too_many(window_s)

    return dep


# Teacher login: count FAILURES only, per IP and per account (PIN brute force).
LOGIN_WINDOW = 15 * 60
LOGIN_MAX_FAIL_IP = 10
LOGIN_MAX_FAIL_ACCOUNT = 5


def login_blocked(ip: str, email: str) -> bool:
    return (
        limiter.count(f"loginfail-ip:{ip}", LOGIN_WINDOW) >= LOGIN_MAX_FAIL_IP
        or limiter.count(f"loginfail-acct:{email}", LOGIN_WINDOW) >= LOGIN_MAX_FAIL_ACCOUNT
    )


def login_failed(ip: str, email: str) -> None:
    limiter.hit(f"loginfail-ip:{ip}", LOGIN_WINDOW)
    limiter.hit(f"loginfail-acct:{email}", LOGIN_WINDOW)


def login_ok(email: str) -> None:
    limiter.clear(f"loginfail-acct:{email}")


SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    # Dashboard & download page use only same-origin scripts/styles (download page has inline CSS + SVG).
    "Content-Security-Policy": (
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
        "connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    ),
}


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl and cl.isdigit() and int(cl) > settings.max_body_bytes:
            return JSONResponse({"detail": "Data terlalu besar"}, status_code=413)
        response = await call_next(request)
        for k, v in SECURITY_HEADERS.items():
            response.headers.setdefault(k, v)
        if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000")
        response.headers.setdefault("Cache-Control", "no-store" if request.url.path.startswith("/api/") else "no-cache")
        return response
