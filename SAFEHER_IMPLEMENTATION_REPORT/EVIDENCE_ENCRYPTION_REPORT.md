# SafeHER Evidence Encryption & Vault Implementation Report

**Date:** 2026-11-27  
**Module:** SafeHER Cryptographic Engine (`backend/security/`)  
**Status:** Implemented, Tested, and Verified  

---

## 1. Problem Statement & Audit Finding

During the deep architectural audit, a critical discrepancy was identified in evidence management:
- **Location:** `backend/app.py:500-502`
- **Code:**
  ```python
  with open(dest_path, "wb") as out_file:
      out_file.write(content)
  ```
- **Database Status:** `evidence.storage_status = 'stored_encrypted'`
- **Vulnerability:** Files written to disk were 100% plaintext despite being marked as `stored_encrypted` in database records. Any unauthorized read access to the server disk immediately exposed confidential survivor evidence, violating privacy assurances.

---

## 2. Cryptographic Architecture & Design

SafeHER now implements an authenticated, envelope-encrypted storage architecture based on NIST-approved cryptographic standards:

```
+-----------------------------------------------------------------------------------------+
|                                EVIDENCE UPLOAD PIPELINE                                 |
+-----------------------------------------------------------------------------------------+
| 1. Compute SHA-256 digest of original plaintext bytes.                                  |
| 2. Generate cryptographically secure 256-bit AES Data Encryption Key (DEK).             |
| 3. Generate fresh 96-bit CSPRNG Nonce.                                                  |
| 4. Encrypt with AES-256-GCM using AAD: evidence_id:user_id:v1                           |
|    -> Produces Ciphertext with embedded 128-bit Authentication Tag.                     |
| 5. Wrap AES DEK using Master RSA-2048 Public Key via RSA-OAEP (SHA-256, MGF1-SHA256).  |
| 6. Sign original SHA-256 digest using Master RSA-2048 Private Key via RSA-PSS (SHA-256).|
| 7. Write atomically to disk as {evidence_id}.enc (atomic rename from temporary file).   |
| 8. In-Flight Self-Verification: Read back ciphertext, decrypt in-memory, verify digest. |
| 9. Commit record to SQLite DB with wrapped_key, key_id, signature, and custody record.  |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Mathematical & Algorithmic Specifications

### 3.1 Authenticated Symmetric Encryption (AES-256-GCM)
- **Algorithm:** Advanced Encryption Standard in Galois/Counter Mode (AES-GCM).
- **Key Length:** 256 bits ($32$ bytes), generated per evidence item using `os.urandom(32)`.
- **Nonce / IV:** 96 bits ($12$ bytes), generated using `os.urandom(12)`.
- **Authentication Tag:** 128 bits ($16$ bytes) computed over ciphertext and AAD.
- **Authenticated Associated Data (AAD):**
  $$\text{AAD} = \text{evidence\_id} \parallel \text{":"} \parallel \text{user\_id} \parallel \text{":v1"}$$
  This cryptographically binds the encrypted file to the specific evidence ID and owner. Ciphertext stolen and substituted into another user's vault immediately fails authentication tag verification.

### 3.2 Asymmetric Key Wrapping (RSA-OAEP)
- **Master Keypair:** RSA-2048 with public exponent $e = 65537$.
- **Wrapping Scheme:** Optimal Asymmetric Encryption Padding (RSA-OAEP).
- **Hash Function:** SHA-256.
- **Mask Generation Function:** MGF1 with SHA-256.
- **Storage:** Wrapped DEK ($256$ bytes) is encoded as hexadecimal and stored in `evidence.wrapped_key`.

### 3.3 Non-Repudiation Digital Signatures (RSA-PSS)
- **Signature Scheme:** Probabilistic Signature Scheme (RSA-PSS).
- **Salt Length:** Maximum possible salt length (`padding.PSS.MAX_LENGTH`).
- **Data Signed:** SHA-256 hexadecimal string of the original evidence file.
- **Verification:** Any party possessing the SafeHER master public key can independently verify that the evidence digest was preserved by SafeHER at the recorded timestamp without modification.

---

## 4. Key Management Engine (`backend/security/key_manager.py`)

- **Class:** `KeyManager`
- **Active Key ID:** `master-v1`
- **Storage Path:** `backend/storage/keys/`
  - `master-v1_private.pem`: PKCS#8 unencrypted PEM (restricted permissions).
  - `master-v1_public.pem`: SubjectPublicKeyInfo PEM.
- **Environment Overrides:** Supports `SAFEHER_RSA_PRIVATE_KEY_PEM` and `SAFEHER_RSA_PUBLIC_KEY_PEM` for cloud key vault or KMS deployment.
- **Persistence Guarantee:** Keypair is loaded if present and generated only when uninitialized. Keys persist across application restarts.

---

## 5. Memory-Only Evidence Retrieval

When an authorized user requests evidence via `GET /api/v1/evidence/{evidence_id}/download` or runs `POST /api/v1/analysis/media`:
1. The encrypted `{evidence_id}.enc` file is read from disk.
2. The wrapped session key is extracted from the database and unwrapped using the master private key in memory.
3. AES-256-GCM authenticates and decrypts the ciphertext in memory.
4. The decrypted content's SHA-256 is verified against `evidence.sha256_hash`.
5. The decrypted bytes are returned directly in the HTTP response stream or passed to inference pipelines.
6. **Zero plaintext files are ever written to disk during retrieval.**

---

## 6. Chain of Custody & Forensic Receipts

Every action on evidence is logged in `custody_records`:
- `evidence_uploaded`: Initial upload, encryption algorithm, key ID, SHA-256, and digital signature.
- `evidence_downloaded`: In-memory decrypted download with actor identity, timestamp, and IP address.
- `evidence_deleted`: Cryptographic purge of ciphertext from disk.

Users can query the complete immutable audit trail via:
- `GET /api/v1/evidence/{evidence_id}/custody`
- `GET /api/v1/evidence/{evidence_id}/receipt`

---

## 7. Migration Tool for Legacy Evidence (`backend/migrate_evidence.py`)

A command-line migration utility was developed to safely transition legacy plaintext files to AES-256-GCM:
- **Modes:**
  - `python backend/migrate_evidence.py --dry-run` (Default safe preview).
  - `python backend/migrate_evidence.py --execute` (Applies in-place encryption).
- **Features:**
  - Verifies file hash before encryption.
  - Creates backup file before replacing.
  - Encrypts using per-file AES-256 key, wraps DEK, signs digest.
  - Updates database row with encryption metadata.
  - Logs `evidence_migrated_to_aes256_gcm` custody event.
  - Restores backup if any verification step fails.

---

## 8. Cryptographic Test Suite Verification

Validated by 7 dedicated tests in `backend/test_crypto_vault.py`:
- `test_aes_256_gcm_roundtrip`: Verifies 256-bit key generation and lossless round-trip.
- `test_aes_gcm_tamper_detection`: Verifies single-bit ciphertext modification raises `AuthenticationError`.
- `test_aes_gcm_aad_mismatch_detection`: Verifies AAD tampering raises `AuthenticationError`.
- `test_aes_wrong_key_fails`: Verifies incorrect key fails decryption.
- `test_rsa_keypair_and_wrapping`: Verifies RSA-OAEP session key wrapping.
- `test_rsa_pss_digital_signature`: Verifies RSA-PSS digest signing and tampering detection.
- `test_evidence_storage_atomic_and_encrypted`: End-to-end integration test validating file on disk is encrypted, round-trip decryption succeeds, and cryptographic receipt passes verification.
