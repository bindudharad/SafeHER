# SafeHER API Changelog

**Release:** SafeHER Hardened Backend v2.0.0  
**Date:** 2026-11-27  
**Compatibility:** 100% Backward-Compatible with Existing Frontend & SDK  

---

## 1. Summary of Changes

This release enhances the SafeHER REST API with rate limiting, token revocation on logout, AES-256-GCM encrypted evidence streaming, C2PA Content Credentials verification, and forensic custody auditing endpoints.

---

## 2. New Endpoints

### 2.1 User Logout & Token Revocation
- **Route:** `POST /api/v1/auth/logout`
- **Authentication:** Bearer JWT required
- **Description:** Extracts the token's `jti` claim and records it in the `revoked_tokens` table. Any subsequent request presenting this token is immediately rejected with HTTP 401 Unauthorized.
- **Request:** Empty payload with `Authorization: Bearer <token>` header
- **Response (200 OK):**
  ```json
  {
    "message": "Logged out successfully",
    "status": "revoked"
  }
  ```

### 2.2 Evidence Custody History
- **Route:** `GET /api/v1/evidence/{evidence_id}/custody`
- **Authentication:** Bearer JWT required (owner only)
- **Description:** Returns the chronological digital chain of custody records for the requested evidence item.
- **Response (200 OK):**
  ```json
  [
    {
      "id": "cst-86a0b228",
      "evidence_id": "evi-c178f8b1",
      "action": "evidence_uploaded",
      "actor": "ananya.sharma@safeher.protect",
      "reason": "AES-256-GCM envelope encryption and SHA-256 preservation",
      "ip_address": "127.0.0.1",
      "sha256_hash": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      "signature": "8a3f...256bytes_hex",
      "timestamp": "2026-11-27T00:15:00.000000+00:00"
    }
  ]
  ```

### 2.3 Evidence Cryptographic Receipt & Integrity Audit
- **Route:** `GET /api/v1/evidence/{evidence_id}/receipt`
- **Authentication:** Bearer JWT required (owner only)
- **Description:** Executes a live non-destructive cryptographic audit verifying AES-256-GCM ciphertext decryptability, SHA-256 digest integrity, and RSA-PSS server signature.
- **Response (200 OK):**
  ```json
  {
    "evidence_id": "evi-c178f8b1",
    "original_filename": "chat_proof.png",
    "file_size": 18432,
    "sha256_hash": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    "storage_status": "stored_encrypted",
    "encryption_algorithm": "AES-256-GCM+RSA-OAEP",
    "key_id": "master-v1",
    "signature_present": true,
    "audit": {
      "evidence_id": "evi-c178f8b1",
      "is_encrypted": true,
      "hash_verified": true,
      "signature_verified": true,
      "status": "passed"
    }
  }
  ```

---

## 3. Modified Endpoints

### 3.1 `POST /api/v1/auth/register`
- **Rate Limit Added:** `@limiter.limit("10/minute")`.
- **Payload Response:** Now includes `"role": "user"`.
- **Status:** Backward-compatible (HTTP 201 Created).

### 3.2 `POST /api/v1/auth/login`
- **Rate Limit Added:** `@limiter.limit("10/minute")`.
- **Payload Response:** Now includes `"role": "user"` (or assigned role).
- **Status:** Backward-compatible (HTTP 200 OK).

### 3.3 `POST /api/v1/incidents/{incident_id}/evidence`
- **Upload Safety Filter Added:** Scans file content for disguised PE executables and EICAR malware signatures before storage. Rejects dangerous uploads with HTTP 422.
- **Cryptographic Storage:** Files are encrypted with AES-256-GCM before writing to disk (`{evidence_id}.enc`). Session key wrapped with RSA-OAEP. Original SHA-256 signed with RSA-PSS.
- **Audit Logging:** Automatically inserts initial custody event into `custody_records`.
- **Response Fields Added:**
  - `encryption_algorithm`: `"AES-256-GCM+RSA-OAEP"`
  - `key_id`: `"master-v1"`
  - `signature_status`: `"verified"`

### 3.4 `GET /api/v1/evidence/{evidence_id}/download`
- **Decrypted Streaming:** Retrieves `{evidence_id}.enc` from disk, unwraps session key, authenticates AAD tag, decrypts in-memory, and returns the original plaintext file bytes with appropriate `Content-Disposition`.
- **Audit Logging:** Inserts `evidence_downloaded` record into `custody_records`.
- **Response:** Unchanged plaintext file bytes (identical content and media-type as original upload).

### 3.5 `DELETE /api/v1/evidence/{evidence_id}`
- **Audit Logging:** Inserts `evidence_deleted` record into `custody_records` prior to deleting file and row.
- **Storage Deletion:** Safely purges `.enc` or plaintext file from disk.

### 3.6 `POST /api/v1/analysis/media`
- **Storage Decryption:** When `evidence_id` is supplied, retrieves and decrypts the stored ciphertext in memory before feeding it into the AI inference pipeline.
- **Forensic Payload Added:**
  - `c2pa`: Complete Content Credentials manifest structure, active manifest, validation state, and claim generator.
  - `faces`: List of detected faces with bounding boxes `[x, y, w, h]`, confidence, and landmarks.
  - `model_a_aigi`: Status and prediction for synthetic / generative image screening.
  - `model_b_deepfake`: Status and per-face manipulation metrics.
  - `nsfw_screening`: Decoupled adult content screening.
- **Backward-Compatible Keys Preserved:** `deepfake_score`, `nudity_score`, `decision`, `c2pa_provenance`, `limitations`, `recommended_next_steps`.

### 3.7 `POST /api/v1/analysis/threat`
- **Language Detection:** Detects English (`en`), Hindi (`hi`), Kannada (`kn`), and Hinglish (`hi-Latn`).
- **Urgency Levels Standardized:** `critical`, `high`, `medium`, and `low`.
- **Extortion Heuristics:** Keyword extraction for digital blackmail, extortion deadlines, and photo leak threats.

---

## 4. HTTP Security Headers (All Routes)

Every HTTP response now includes:
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; frame-ancestors 'none';
```
