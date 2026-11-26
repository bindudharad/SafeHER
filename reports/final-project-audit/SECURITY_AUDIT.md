# Security & Privacy Audit (Updated)

## Resolved Findings
- **[Medium — RESOLVED] Production JWT Secret Enforcement (`backend/auth.py`)**: Enforced `SAFEHER_JWT_SECRET` (`>= 32` chars, rejecting placeholders/dev fallback) when `SAFEHER_ENV=production`. Verified by `backend/test_security_hardening.py` (6/6 passed).
- **[Low — DOCUMENTED] At-Rest Storage Encryption (`DEPLOYMENT.md`)**: Documented that SHA-256 digests provide integrity tracking only; production deployments must use KMS-encrypted block/object storage.

## Verified Controls
- PBKDF2-HMAC-SHA256 (120k iterations) + HS256 JWT tokens with expiration checks.
- Cross-user `user_id` isolation on all incident, evidence, case, and complaint queries.
- Restricted CORS (`http://localhost:5173`, `http://127.0.0.1:5173`).
