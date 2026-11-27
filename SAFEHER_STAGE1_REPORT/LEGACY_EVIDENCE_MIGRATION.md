# SafeHER Stage 1 — Legacy Evidence Migration Guide
**Safe Migration of Legacy Plaintext Files to AES-256-GCM Envelope Encryption**

---

## 1. Executive Summary & Migration Safety Model

Before Stage 1, earlier versions of SafeHER stored evidence files directly on disk without encryption. To prevent evidence loss, legal spoliation, or database corruption, `backend/migrate_evidence.py` provides:

1. **Default Dry-Run Mode:** Running without flags performs a read-only inventory scan. No files or database rows are modified unless `--execute` is explicitly passed.
2. **Pre-Encryption Integrity Check:** Validates that the existing plaintext file on disk matches its recorded `sha256_hash` in the database before attempting encryption.
3. **Quarantine Isolation:** Prior to replacing the live file with `{evidence_id}.enc`, the original plaintext is copied to a restricted quarantine folder (`storage/quarantine/`).
4. **Round-Trip Self-Verification:** The newly encrypted file is immediately decrypted in memory to verify that the decrypted SHA-256 matches the original hash before the database transaction is committed.
5. **Chain of Custody Logging:** An entry is inserted into `custody_records` documenting the migration timestamp, quarantine location, and ciphertext hash.
6. **Idempotent Execution:** Can be executed repeatedly without corrupting already-encrypted records.

---

## 2. CLI Usage & Flags

Both entrypoints are available:
- `python backend/migrate_evidence.py`
- `python backend/scripts/migrate_evidence_encryption.py`

### Available Options:
| Flag | Default | Description |
| :--- | :--- | :--- |
| `--dry-run` | Active | Scans database and storage, checks integrity, reports plan without writing changes. |
| `--execute` | Inactive | Executes encryption, updates database, and moves plaintext to quarantine. |
| `--quarantine-dir PATH` | `storage/quarantine` | Custom directory to isolate original plaintext files. |
| `--storage-dir PATH` | System default | Custom active evidence storage directory. |

---

## 3. Step-by-Step Migration Procedure

### Step 1: Execute Dry-Run Scan
```bash
python backend/migrate_evidence.py --dry-run
```
Expected output:
```text
=== SafeHER Evidence Encryption Migration ===
Execution Mode: DRY-RUN (No changes applied)

Discovered 0 total evidence record(s) in database.
No evidence records found in database. Nothing to migrate.
```
*(If legacy records exist, an inventory table will display each evidence ID, size, status, and path).*

### Step 2: Backup Active Database & Storage
Always create a baseline snapshot prior to executing database updates:
```bash
cp safeher.db safeher_pre_migration.db
```

### Step 3: Execute Migration
```bash
python backend/migrate_evidence.py --execute
```
The script will:
1. Verify plaintext SHA-256 against stored hash.
2. Copy plaintext to `storage/quarantine/{evi_id}_legacy_{stored_fn}`.
3. Encrypt payload to `storage/{evi_id}.enc`.
4. Update database columns: `storage_status = 'stored_encrypted'`, `encryption_version = 'v2'`, `wrapped_dek`, `wrapping_nonce`, `data_nonce`, `ciphertext_sha256`.
5. Insert custody event into `custody_records`.
6. Remove plaintext from live storage.

---

## 4. Rollback & Disaster Recovery Procedure

If an operator needs to restore a legacy plaintext file:
1. Locate the quarantined copy in `storage/quarantine/{evi_id}_legacy_{stored_fn}`.
2. Copy it back to `storage/{stored_fn}`.
3. Update database record:
```sql
UPDATE evidence
SET stored_filename = '{original_stored_fn}',
    storage_status = 'stored_plaintext'
WHERE id = '{evidence_id}';
```
4. Verify SHA-256 checksum:
```bash
python -c "import hashlib; print(hashlib.sha256(open('storage/{stored_fn}', 'rb').read()).hexdigest())"
```
