# 10 — Authentication & Security

## Password Hashing & JWT (`backend/auth.py`)

- **Password Hashing:** PBKDF2-HMAC-SHA256 with **120,000 iterations** and per-user random salt (`hash_password`, `verify_password`).
- **Token Format:** HS256-signed JWT with **24-hour expiration** (`ACCESS_TOKEN_EXPIRE_HOURS = 24`).
- **Production Secret Guard:** `validate_jwt_configuration()` refuses to start in production (`SAFEHER_ENV=production` or `ENVIRONMENT=production`) if `SAFEHER_JWT_SECRET` is missing, shorter than 32 characters, or matches the development default.

---

## Authorization & Data Isolation

- Every protected endpoint resolves the authenticated user via `Depends(get_current_user)` and scopes SQL queries by `user_id == current_user["id"]`.
- Cross-user access to incidents, evidence downloads, evidence deletions, analyses, complaints, or cases returns `403` / `404`.
- Client-side `ProtectedRoute.tsx` checks `useAuth().isAuthenticated` and redirects unauthenticated users to `/login`.

---

## Input Validation & Upload Hardening

- Pydantic schemas (`backend/schemas.py`) enforce string lengths, enums, and required consent acknowledgement on registration.
- Text screening enforces a **10,000-character** upper bound.
- Image/evidence uploads enforce allowed MIME types/extensions and a **15 MB** file size limit.
- Server-side SHA-256 hashing (`hashlib.sha256`) runs independently of client-computed hashes so integrity does not rely on client trust.

---

## Trauma-Informed Privacy & Safety UX

- **Quick Exit (`QuickExitButton.tsx`)**: Immediately navigates away from SafeHER to a neutral external page (`https://www.google.com`) and clears history entry (`window.location.replace`), helping users in unsafe physical environments.
- **No Sensitive Secrets in Repo**: `.env`, SQLite DB files, and local evidence uploads are excluded from version control.

---

## Verification

Security controls are covered by `backend/test_security_hardening.py` (executed via `python -m pytest backend/ -v`).
