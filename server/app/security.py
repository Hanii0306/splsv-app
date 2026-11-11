import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Literal

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings

_bearer = HTTPBearer(auto_error=False)
_ALGO = "HS256"
_PBKDF2_ROUNDS = 200_000


def hash_pin(pin: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, _PBKDF2_ROUNDS)
    return f"{salt.hex()}${digest.hex()}"


def verify_pin(pin: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), bytes.fromhex(salt_hex), _PBKDF2_ROUNDS)
    return hmac.compare_digest(digest.hex(), digest_hex)


def make_token(role: Literal["student", "teacher"], subject: str, **claims) -> str:
    now = datetime.now(timezone.utc)
    ttl = (
        timedelta(days=settings.student_token_days)
        if role == "student"
        else timedelta(hours=settings.teacher_token_hours)
    )
    payload = {"role": role, "sub": subject, "iat": now, "exp": now + ttl, **claims}
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGO)


def _decode(creds: HTTPAuthorizationCredentials | None) -> dict:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token tidak ada")
    try:
        return jwt.decode(creds.credentials, settings.jwt_secret, algorithms=[_ALGO])
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token tidak valid") from exc


def require_student(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    claims = _decode(creds)
    if claims.get("role") != "student":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Khusus siswa")
    return claims


def require_teacher(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    claims = _decode(creds)
    if claims.get("role") != "teacher":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Khusus guru")
    return claims


def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    if not x_admin_key or not hmac.compare_digest(x_admin_key, settings.admin_key):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Admin key salah")
