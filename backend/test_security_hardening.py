import os
import sys
import time
import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import auth
from db import get_database_config


def test_production_startup_without_secret_fails(monkeypatch):
    monkeypatch.setenv("SAFEHER_ENV", "production")
    monkeypatch.delenv("SAFEHER_JWT_SECRET", raising=False)
    with pytest.raises(RuntimeError, match="SAFEHER_JWT_SECRET"):
        auth.validate_jwt_configuration()


def test_production_startup_with_weak_secret_fails(monkeypatch):
    monkeypatch.setenv("SAFEHER_ENV", "production")
    monkeypatch.setenv("SAFEHER_JWT_SECRET", "changeme")
    with pytest.raises(RuntimeError, match="SAFEHER_JWT_SECRET"):
        auth.validate_jwt_configuration()


def test_production_startup_with_strong_secret_succeeds(monkeypatch):
    monkeypatch.setenv("SAFEHER_ENV", "production")
    monkeypatch.setenv("SAFEHER_JWT_SECRET", "prod-strong-random-secret-key-at-least-48-chars-long-2026")
    auth.validate_jwt_configuration()
    token = auth.create_access_token("u-prod-1", "prod@safeher.test")
    payload = auth.decode_access_token(token)
    assert payload["sub"] == "u-prod-1"


def test_development_mode_retains_local_fallback(monkeypatch):
    monkeypatch.setenv("SAFEHER_ENV", "development")
    monkeypatch.delenv("SAFEHER_JWT_SECRET", raising=False)
    secret = auth.resolve_jwt_secret()
    assert len(secret) >= 32
    token = auth.create_access_token("u-dev-1", "dev@safeher.test")
    assert auth.decode_access_token(token)["sub"] == "u-dev-1"


def test_invalid_and_expired_tokens_rejected(monkeypatch):
    monkeypatch.setenv("SAFEHER_ENV", "development")
    monkeypatch.delenv("SAFEHER_JWT_SECRET", raising=False)
    with pytest.raises(HTTPException) as exc_invalid:
        auth.decode_access_token("invalid.token.value")
    assert exc_invalid.value.status_code == 401

    # Force expired token check
    monkeypatch.setattr(auth, "TOKEN_EXPIRY_SECONDS", -10)
    expired = auth.create_access_token("u-exp", "exp@safeher.test")
    with pytest.raises(HTTPException) as exc_exp:
        auth.decode_access_token(expired)
    assert exc_exp.value.status_code == 401


def test_database_config_wal_and_storage_mode(monkeypatch):
    monkeypatch.setenv("SAFEHER_STORAGE_MODE", "local")
    cfg = get_database_config()
    assert cfg["engine"] == "sqlite"
    assert cfg["wal_enabled"] is True
    assert cfg["storage_mode"] == "local"
