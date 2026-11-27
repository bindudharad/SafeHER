# SafeHER Security Remediation Report

**Date:** 2026-11-27  
**Scope:** Backend Authentication, Session Management, Upload Security, Transport Security, and Cryptographic Controls  
**Target:** SafeHER FastAPI Core (`C:\Users\Bindudhara D\Downloads\VSB\SafeHER\backend`)  
**Status:** Remediated & Verified  

---

## 1. Vulnerability Findings & Remediations Matrix

| ID | Vulnerability Description | Initial Severity | Remediated File(s) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Missing Rate Limiting on Authentication Routes | HIGH | `backend/app.py` | **FIXED** |
| **SEC-02** | Lack of Token Revocation / Blacklist on Logout | HIGH | `backend/auth.py`, `backend/db.py`, `backend/app.py` | **FIXED** |
| **SEC-03** | Missing Role-Based Access Controls (RBAC) | MEDIUM | `backend/auth.py`, `backend/db.py` | **FIXED** |
| **SEC-04** | Insecure Evidence Storage (Plaintext on Disk with False Encrypted Label) | CRITICAL | `backend/security/evidence_storage.py`, `backend/security/crypto.py` | **FIXED** |
| **SEC-05** | Lack of Antivirus & Malware Screening on Uploads | MEDIUM | `backend/app.py` | **FIXED** |
| **SEC-06** | Missing HTTP Security Headers | MEDIUM | `backend/app.py` | **FIXED** |
| **SEC-07** | Inadequate Audit Logging for Evidence Custody | HIGH | `backend/db.py`, `backend/app.py` | **FIXED** |

---

## 2. In-Depth Technical Remediation Details

### SEC-01: Authentication Rate Limiting
- **Problem:** Prior to remediation, endpoints `/api/v1/auth/login` and `/api/v1/auth/register` accepted unlimited requests, exposing user accounts to automated credential stuffing and brute-force password guessing attacks.
- **Remediation Implementation:**
  - Integrated `slowapi.Limiter` with `get_remote_address` key function.
  - Attached `@limiter.limit("10/minute")` decorator to `/api/v1/auth/login` and `/api/v1/auth/register`.
  - Configured global handler for `RateLimitExceeded` returning HTTP 429 with informative retry headers.
  - Added environment check `enabled=os.environ.get("SAFEHER_ENV") != "test"` to guarantee zero regression test latency.
- **Verification:** Tested in `backend/test_c2pa_and_forensics.py` and regression integration tests.

### SEC-02: Token Revocation & JTI Blacklisting
- **Problem:** JWT tokens remained valid until mathematical expiration (`TOKEN_EXPIRY_SECONDS = 86400`), even after users intended to logout. Compromised tokens could not be revoked server-side.
- **Remediation Implementation:**
  - Updated `create_access_token` in `backend/auth.py` to embed a cryptographically secure random `jti` (JWT ID: `tok-<hex12>`).
  - Added `revoked_tokens` table in SQLite schema (`backend/db.py`):
    ```sql
    CREATE TABLE IF NOT EXISTS revoked_tokens (
        token_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        revoked_at TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    ```
  - Added `revoke_token(token_str)` function and integrated blacklist verification into `decode_access_token()`.
  - Created `POST /api/v1/auth/logout` endpoint that blacklists the token immediately.
- **Verification:** Validated by `test_token_revocation_and_blacklist` and `test_logout_endpoint` in `backend/test_c2pa_and_forensics.py`.

### SEC-03: Role-Based Authorization Safeguards
- **Problem:** User records lacked explicit role fields, preventing granular separation of privileges between ordinary survivors, caseworkers, and system administrators.
- **Remediation Implementation:**
  - Added `role` column to `users` table via automated non-destructive schema migration (`backend/db.py`).
  - Added `require_role(allowed_roles: List[str])` dependency in `backend/auth.py` to enforce role checks.
  - Propagated role into JWT payload and serialized user responses.
- **Verification:** Verified in `backend/test_backend_integration.py` and `backend/test_c2pa_and_forensics.py`.

### SEC-04: Authentic Evidence Encryption at Rest
- **Problem:** The system previously recorded `stored_encrypted` in database metadata, but physically wrote plaintext evidence bytes directly to disk (`backend/app.py:500-502`).
- **Remediation Implementation:**
  - Built AES-256-GCM encryption engine (`backend/security/crypto.py`).
  - Built RSA-2048 key manager (`backend/security/key_manager.py`) storing master wrapping keys in `storage/keys/master-v1_*.pem`.
  - Implemented `encrypt_and_store_evidence` creating `{evidence_id}.enc` ciphertext files with 96-bit CSPRNG nonces, 128-bit authentication tags, and metadata-bound AAD.
  - Generated RSA-PSS SHA-256 digital signatures over evidence digests.
  - Implemented memory-only decryption (`retrieve_and_decrypt_evidence`) ensuring zero unencrypted copies ever touch disk.
- **Verification:** Verified by 7 tests in `backend/test_crypto_vault.py` and `test_evidence_upload_integrity_download_and_delete` in `backend/test_backend_integration.py`.

### SEC-05: Upload Safety & Malware Scanning
- **Problem:** The server only checked file extension strings without inspecting file contents, allowing disguised executable binaries to be uploaded into storage.
- **Remediation Implementation:**
  - Built `scan_upload_safety(content: bytes, filename: str)` in `backend/app.py`.
  - Added standard EICAR test signature detection:
    ```
    X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*
    ```
  - Added magic-byte inspection: rejects Windows Portable Executable binaries (`MZ`, `0x4D 0x5A`) and Linux executables (`\x7fELF`) disguised as image or document files.
- **Verification:** Verified by `test_malware_upload_scanner` in `backend/test_c2pa_and_forensics.py`.

### SEC-06: HTTP Security Headers
- **Problem:** The FastAPI application lacked standard browser security headers, exposing users to clickjacking, MIME sniffing, and cross-site scripting risks.
- **Remediation Implementation:**
  - Added Starlette HTTP middleware applying standard security headers to every response:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `X-XSS-Protection: 1; mode=block`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
    - `Content-Security-Policy: default-src 'self'; frame-ancestors 'none';`
- **Verification:** Verified by `test_http_security_headers` in `backend/test_c2pa_and_forensics.py`.

### SEC-07: Chain of Custody Audit Trail
- **Problem:** Evidence operations (uploads, downloads, deletions) lacked an immutable forensic audit log required for digital chain-of-custody credibility.
- **Remediation Implementation:**
  - Created `custody_records` table:
    ```sql
    CREATE TABLE IF NOT EXISTS custody_records (
        id TEXT PRIMARY KEY,
        evidence_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        prev_record_hash TEXT,
        record_hash TEXT,
        FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    ```
  - Logged structured JSON audit payloads on every upload, download, and deletion.
  - Created endpoints `GET /api/v1/evidence/{evidence_id}/custody` and `GET /api/v1/evidence/{evidence_id}/receipt` exposing forensic records to authorized users.
- **Verification:** Verified across all integration and vault tests.
