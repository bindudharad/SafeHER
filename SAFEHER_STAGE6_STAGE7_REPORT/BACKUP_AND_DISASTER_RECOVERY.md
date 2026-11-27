# SafeHER — Backup, Disaster Recovery & Key Recovery Report
## Stage 7 Automated Preservation, Restoration & Cryptographic Verification

---

### 1. Disaster Recovery Objectives & RTO/RPO

SafeHER stores critical digital abuse evidence for survivors pursuing legal protection orders and criminal prosecution under Indian Evidence Act Section 65B and criminal law. Data loss or evidence corruption is unacceptable.

- **Recovery Point Objective (RPO)**: <= 1 Hour (Automated hourly snapshots of SQLite WAL and encrypted evidence directory).
- **Recovery Time Objective (RTO)**: <= 15 Minutes (Automated manifest validation and direct directory restoration).

---

### 2. Backup Architecture & Tooling (`backend/scripts/backup_database.py`)

#### 2.1 Online Crash-Consistent SQLite Backup
Traditional file copying (`shutil.copy`) of an active SQLite database risks copying dirty pages or torn writes if a transaction is committed mid-copy. SafeHER utilizes the native SQLite Online Backup API:

```python
src_conn = sqlite3.connect(db_path)
dst_conn = sqlite3.connect(db_backup_path)
with dst_conn:
    src_conn.backup(dst_conn, pages=100)
dst_conn.close()
src_conn.close()
```
This guarantees an atomic, crash-consistent snapshot of all relational tables without locking active HTTP readers.

#### 2.2 Encrypted Evidence Blob Backup
All `.enc` AES-256-GCM ciphertext blobs in `storage/` are enumerated and copied into the backup directory. SHA-256 digests are computed for every file and recorded in `manifest.json`.

#### 2.3 Manifest Structure (`manifest.json`):
```json
{
  "version": "1.0",
  "system": "SafeHER Digital Safety Platform",
  "backup_timestamp": "20261127_073619Z",
  "database": {
    "filename": "safeher.db",
    "sha256": "4a12f7c0...",
    "size_bytes": 106496
  },
  "evidence_files": [
    {
      "filename": "evi-1a2b3c4d.enc",
      "sha256": "8f39b1a0...",
      "size_bytes": 84120
    }
  ],
  "total_evidence_count": 1,
  "total_evidence_bytes": 84120,
  "encryption_algorithm": "AES-256-GCM (Envelope Encrypted)"
}
```

---

### 3. Restoration & Cryptographic Key Recovery (`backend/scripts/restore_database.py`)

Restoration is not considered complete merely because files are copied. The restoration tool executes a 4-step verification sequence:

1. **Manifest Integrity Check**: Verifies that `manifest.json` is intact and uncorrupted.
2. **Checksum Verification**: Re-computes SHA-256 digests for `safeher.db` and all evidence blobs, comparing against manifest values.
3. **Database Relational Integrity**: Connects to the restored database and queries schema tables (`SELECT count(*) FROM sqlite_master`).
4. **Cryptographic Key Recovery Roundtrip Verification**:
   - Retrieves the restored ciphertext blob (`.enc`).
   - Retrieves the wrapped DEK, wrapping nonce, data nonce, and KEK key ID from the restored database row.
   - Unwraps the session DEK using the KEK provider.
   - Decrypts the ciphertext into memory using AES-256-GCM.
   - Computes SHA-256 of the decrypted plaintext in memory and confirms an exact bit-for-bit match with the `original_sha256` recorded in the database.

---

### 4. Verification Test Results

```
test_stage7_production_hardening.py::test_backup_and_restore_cryptographic_roundtrip PASSED [100%]
```

The test confirmed:
1. Online database backup generated successfully.
2. Evidence blobs backed up with matching SHA-256 hashes.
3. Clean restore executed into a temporary environment.
4. Restored database validated with table count > 10.
5. In-memory AES-256-GCM decryption verified byte-for-byte with `crypto_verified = True`.
