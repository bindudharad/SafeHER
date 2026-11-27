# SafeHER Stage 1 — Database Migration Report
**Database Schema Expansion, Non-Destructive Migrations & Field Catalog**

---

## 1. Schema Expansion Overview

The SafeHER `evidence` table has been upgraded from a basic metadata catalog into a forensically rigorous, cryptographically verifiable ledger.

### Non-Destructive Automated Migration
In `backend/db.py`, `init_db()` automatically inspects existing database tables on startup. If an older SafeHER database is detected, it executes non-destructive `ALTER TABLE evidence ADD COLUMN ...` statements, preserving all pre-existing survivor incidents, evidence records, and user accounts.

```python
# Automatic column addition in backend/db.py
with get_db() as conn:
    existing_cols = {row["name"] for row in conn.execute("PRAGMA table_info(evidence)").fetchall()}
    for col_name, col_def in required_columns.items():
        if col_name not in existing_cols:
            conn.execute(f"ALTER TABLE evidence ADD COLUMN {col_name} {col_def}")
```

---

## 2. Complete Field Catalog (`evidence` Table — 27 Columns)

| Column # | Column Name | SQLite Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `id` | TEXT | PRIMARY KEY | Unique evidence identifier (`evi-{uuid}`). |
| 2 | `incident_id` | TEXT | NOT NULL | Foreign key referencing `incidents(id)`. |
| 3 | `user_id` | TEXT | NOT NULL | Foreign key referencing `users(id)`. |
| 4 | `original_filename`| TEXT | NOT NULL | Survivor's original uploaded filename. |
| 5 | `stored_filename` | TEXT | NOT NULL | On-disk encrypted filename (`{evidence_id}.enc`). |
| 6 | `file_type` | TEXT | NOT NULL | MIME type (`image/png`, `video/mp4`, etc.). |
| 7 | `file_size` | INTEGER | NOT NULL | Original unencrypted file size in bytes. |
| 8 | `sha256_hash` | TEXT | NOT NULL | Pre-encryption SHA-256 fingerprint. |
| 9 | `upload_timestamp` | TEXT | NOT NULL | ISO-8601 UTC upload timestamp. |
| 10 | `storage_status` | TEXT | `'pending'` | `'stored_encrypted'`, `'stored_plaintext'`, `'quarantined'`. |
| 11 | `validation_status`| TEXT | `'passed'` | File format and MIME validation status. |
| 12 | `malware_status` | TEXT | `'clean'` | Antivirus/malware screening status. |
| 13 | `processing_status`| TEXT | `'ready'` | Analysis and OCR pipeline state. |
| 14 | `duplicate_status` | TEXT | `'unique'` | Deduplication flag (`'unique'`, `'duplicate'`). |
| 15 | `notes` | TEXT | NULL | User or investigator notes. |
| 16 | `encryption_algorithm`| TEXT | `'AES-256-GCM'`| Symmetric cipher used for payload encryption. |
| 17 | `encryption_version`| TEXT | `'v2'` | Storage protocol version (`'v1'` RSA, `'v2'` KEK). |
| 18 | `data_nonce` | TEXT | NULL | Hex-encoded 96-bit AES-GCM payload nonce. |
| 19 | `wrapped_dek` | TEXT | NULL | Hex-encoded AES-GCM wrapped DEK (32B ciphertext + 16B tag). |
| 20 | `wrapping_nonce` | TEXT | NULL | Hex-encoded 96-bit KEK wrapping nonce. |
| 21 | `key_id` | TEXT | `'kek-local-v1'`| Key identifier used to wrap the DEK. |
| 22 | `key_version` | TEXT | `'1'` | Key version of the wrapping KEK. |
| 23 | `original_sha256` | TEXT | NULL | Explicit original SHA-256 digest mirror. |
| 24 | `ciphertext_sha256`| TEXT | NULL | SHA-256 digest of the encrypted `.enc` file. |
| 25 | `encryption_timestamp`| TEXT | NULL | Precise timestamp when encryption took place. |
| 26 | `wrapped_key` | TEXT | NULL | Backward-compatibility RSA-OAEP wrapped DEK. |
| 27 | `signature` | TEXT | NULL | Hex-encoded RSA-PSS digital signature. |

---

## 3. Schema Verification Query Results

Executing `PRAGMA table_info(evidence);` against the SafeHER database yields:

```text
cid  name                  type     notnull  dflt_value        pk
---  --------------------  -------  -------  ----------------  --
0    id                    TEXT     0        None              1 
1    incident_id           TEXT     1        None              0 
2    user_id               TEXT     1        None              0 
3    original_filename     TEXT     1        None              0 
4    stored_filename       TEXT     1        None              0 
5    file_type             TEXT     1        None              0 
6    file_size             INTEGER  1        None              0 
7    sha256_hash           TEXT     1        None              0 
8    upload_timestamp      TEXT     1        None              0 
9    storage_status        TEXT     1        'pending'         0 
10   validation_status     TEXT     1        'passed'          0 
11   malware_status        TEXT     1        'clean'           0 
12   processing_status     TEXT     1        'ready'           0 
13   duplicate_status      TEXT     1        'unique'          0 
14   notes                 TEXT     0        None              0 
15   encryption_algorithm  TEXT     1        'AES-256-GCM'     0 
16   encryption_version    TEXT     1        'v2'              0 
17   data_nonce            TEXT     0        None              0 
18   wrapped_dek           TEXT     0        None              0 
19   wrapping_nonce        TEXT     0        None              0 
20   key_id                TEXT     1        'kek-local-v1'    0 
21   key_version           TEXT     1        '1'               0 
22   original_sha256       TEXT     0        None              0 
23   ciphertext_sha256     TEXT     0        None              0 
24   encryption_timestamp  TEXT     0        None              0 
25   wrapped_key           TEXT     0        None              0 
26   signature             TEXT     0        None              0 
```

All 27 required columns are present, typed correctly, and fully covered by unit and migration tests.
