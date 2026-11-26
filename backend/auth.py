import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from db import get_db

# Secret generated per-process if SAFEHER_JWT_SECRET is not provided in development
_DEFAULT_DEV_SECRET = hashlib.sha256(
    f"safeher-dev-{os.path.abspath(__file__)}".encode("utf-8")
).hexdigest()
_INSECURE_SECRETS = {"", "changeme", "secret", "default", "dev-secret", _DEFAULT_DEV_SECRET}
TOKEN_EXPIRY_SECONDS = 60 * 60 * 24  # 24 hours


def is_production_env() -> bool:
    env = os.environ.get("SAFEHER_ENV", os.environ.get("ENVIRONMENT", "development"))
    return env.strip().lower() in {"prod", "production"}


def resolve_jwt_secret() -> str:
    configured = os.environ.get("SAFEHER_JWT_SECRET", "").strip()
    if is_production_env():
        if configured in _INSECURE_SECRETS or len(configured) < 32:
            raise RuntimeError(
                "SAFEHER_JWT_SECRET must be set to a strong (>=32 char) secret in production."
            )
        return configured
    return configured or _DEFAULT_DEV_SECRET


def validate_jwt_configuration() -> None:
    resolve_jwt_secret()


JWT_SECRET = resolve_jwt_secret()

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"{salt.hex()}:{dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, dk_hex = stored_hash.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(dk_hex)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(user_id: str, email: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + TOKEN_EXPIRY_SECONDS,
    }
    h_enc = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p_enc = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{h_enc}.{p_enc}".encode("ascii")
    sig = hmac.new(resolve_jwt_secret().encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{h_enc}.{p_enc}.{_b64url_encode(sig)}"


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Malformed token")
        h_enc, p_enc, s_enc = parts
        signing_input = f"{h_enc}.{p_enc}".encode("ascii")
        expected_sig = hmac.new(
            resolve_jwt_secret().encode("utf-8"), signing_input, hashlib.sha256
        ).digest()
        actual_sig = _b64url_decode(s_enc)
        if not hmac.compare_digest(actual_sig, expected_sig):
            raise ValueError("Invalid token signature")
        payload = json.loads(_b64url_decode(p_enc).decode("utf-8"))
        if payload.get("exp", 0) < int(time.time()):
            raise ValueError("Token expired")
        return payload
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        ) from exc


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, name, email, consent_acknowledged, consent_date, preferred_language, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "consent_acknowledged": bool(row["consent_acknowledged"]),
        "consent_date": row["consent_date"],
        "preferred_language": row["preferred_language"],
        "created_at": row["created_at"],
    }
