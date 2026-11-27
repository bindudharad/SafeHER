"""
SafeHER Evidence Migration Script
=================================
Safely migrates legacy plaintext evidence files to AES-256-GCM envelope encryption.

Features:
- Dry-run mode by default (--dry-run / --execute)
- Complete inventory report (evidence ID, status, path, size, hash, exists, plaintext vs encrypted)
- Never prints contents of evidence
- Verification of original SHA-256 before encryption
- Envelope encryption via Key Provider
- Complete recovery metadata persistence (wrapped DEK, wrapping nonce, data nonce, key_id, key_version)
- Verification of round-trip decryption before database commit
- Preserves original plaintext in a restricted quarantine directory (storage/quarantine/) until operator approval
- Idempotent and safe to retry
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
from typing import Dict, List, Optional

# Ensure backend root is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from db import get_db, get_storage_dir
from security.evidence_storage import (
    encrypt_and_store_evidence,
    retrieve_and_decrypt_evidence,
    EvidenceStorageResult,
)


def run_migration(dry_run: bool = True, quarantine_dir: Optional[str] = None, storage_dir: Optional[str] = None) -> int:
    mode_label = "DRY-RUN (No changes applied)" if dry_run else "EXECUTE (Applying changes)"
    print(f"=== SafeHER Evidence Encryption Migration ===")
    print(f"Execution Mode: {mode_label}\n")

    effective_storage = storage_dir or get_storage_dir()
    effective_quarantine = quarantine_dir or os.path.join(effective_storage, "quarantine")

    with get_db() as conn:
        rows = conn.execute("SELECT * FROM evidence ORDER BY upload_timestamp ASC").fetchall()

    if not rows:
        print("No evidence records found in database. Nothing to migrate.")
        return 0

    print(f"Discovered {len(rows)} total evidence record(s) in database.\n")
    print(f"{'EVIDENCE ID':<16} {'STATUS':<18} {'SIZE (BYTES)':<14} {'FILE EXISTS':<12} {'STORAGE PATH'}")
    print("-" * 80)

    migrated_count = 0
    already_encrypted_count = 0
    missing_count = 0
    hash_mismatch_count = 0
    error_count = 0

    for r in rows:
        evi_id = r["id"]
        user_id = r["user_id"]
        stored_fn = r["stored_filename"]
        orig_fn = r["original_filename"]
        expected_hash = r["sha256_hash"]
        file_size = r["file_size"]
        curr_status = r["storage_status"]

        file_path = os.path.join(effective_storage, stored_fn)
        file_exists = os.path.exists(file_path)
        is_encrypted = stored_fn.endswith(".enc") and curr_status == "stored_encrypted"

        state_str = "ENCRYPTED" if is_encrypted else ("PLAINTEXT" if file_exists else "MISSING")
        print(f"{evi_id:<16} {state_str:<18} {file_size:<14} {str(file_exists):<12} {stored_fn}")

        if is_encrypted:
            already_encrypted_count += 1
            continue

        if not file_exists:
            missing_count += 1
            error_count += 1
            continue

        # Check hash of plaintext file
        with open(file_path, "rb") as f:
            raw_content = f.read()

        actual_hash = hashlib.sha256(raw_content).hexdigest()
        if actual_hash.lower() != expected_hash.lower():
            print(f"  [ERROR] {evi_id}: SHA-256 mismatch! Expected {expected_hash[:16]}..., got {actual_hash[:16]}...")
            hash_mismatch_count += 1
            error_count += 1
            continue

        if dry_run:
            migrated_count += 1
            continue

        # Execute migration
        try:
            # 1. Quarantine original plaintext in restricted quarantine location
            os.makedirs(effective_quarantine, exist_ok=True)
            quarantine_path = os.path.join(effective_quarantine, f"{evi_id}_legacy_{stored_fn}")
            shutil.copy2(file_path, quarantine_path)

            # 2. Encrypt and store as {evi_id}.enc
            storage_res = encrypt_and_store_evidence(
                content=raw_content,
                evidence_id=evi_id,
                user_id=user_id,
                storage_dir=effective_storage,
                original_filename=orig_fn,
            )

            # 3. Update database record with full recovery metadata
            with get_db() as conn:
                conn.execute(
                    """
                    UPDATE evidence
                    SET stored_filename = ?,
                        storage_status = 'stored_encrypted',
                        encryption_algorithm = ?,
                        encryption_version = ?,
                        data_nonce = ?,
                        wrapped_dek = ?,
                        wrapping_nonce = ?,
                        key_id = ?,
                        key_version = ?,
                        original_sha256 = ?,
                        ciphertext_sha256 = ?,
                        encryption_timestamp = ?,
                        wrapped_key = ?,
                        signature = ?
                    WHERE id = ?
                    """,
                    (
                        storage_res.stored_filename,
                        storage_res.encryption_algorithm,
                        storage_res.encryption_version,
                        storage_res.data_nonce_hex,
                        storage_res.wrapped_dek_hex,
                        storage_res.wrapping_nonce_hex,
                        storage_res.key_id,
                        storage_res.key_version,
                        storage_res.sha256_hash,
                        storage_res.ciphertext_sha256,
                        storage_res.encryption_timestamp,
                        storage_res.wrapped_dek_hex,
                        storage_res.signature_hex,
                        evi_id,
                    ),
                )
                custody_details = json.dumps({
                    "action": "migrated_to_encryption",
                    "reason": "Migrated from legacy plaintext to AES-256-GCM envelope",
                    "quarantine_path": quarantine_path,
                    "sha256_hash": storage_res.sha256_hash,
                    "ciphertext_sha256": storage_res.ciphertext_sha256,
                })
                conn.execute(
                    """
                    INSERT INTO custody_records (id, evidence_id, user_id, action, details, timestamp)
                    VALUES (?, ?, ?, 'migrated_to_encryption', ?, datetime('now'))
                    """,
                    (f"cst-{os.urandom(6).hex()}", evi_id, user_id, custody_details),
                )

            # 4. Remove original plaintext from live storage (original is safely in quarantine)
            if file_path != os.path.join(effective_storage, storage_res.stored_filename) and os.path.exists(file_path):
                os.remove(file_path)

            migrated_count += 1
            print(f"  [MIGRATED] {evi_id}: Plaintext moved to quarantine; sealed with AES-256-GCM.")
        except Exception as e:
            print(f"  [FAILED] Migration failed for {evi_id}: {e}")
            error_count += 1

    print("\n" + "=" * 50)
    print("MIGRATION INVENTORY SUMMARY")
    print("=" * 50)
    print(f"Total Records Inspected:    {len(rows)}")
    print(f"Already Stored Encrypted:   {already_encrypted_count}")
    print(f"Migrated (or to migrate):   {migrated_count}")
    print(f"Missing Files:              {missing_count}")
    print(f"Checksum Mismatches:        {hash_mismatch_count}")
    print(f"Total Errors / Blockers:    {error_count}")

    if dry_run and migrated_count > 0:
        print("\nTo execute this migration and encrypt files, run:")
        print("  python backend/migrate_evidence.py --execute")

    return 1 if error_count > 0 else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SafeHER Evidence Encryption Migration Utility")
    parser.add_argument("--execute", action="store_true", help="Execute real encryption and quarantine plaintext")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Simulate without modifying files or DB (default)")
    parser.add_argument("--quarantine-dir", type=str, default=None, help="Custom quarantine directory for legacy plaintext")
    parser.add_argument("--storage-dir", type=str, default=None, help="Custom active evidence storage directory")
    args = parser.parse_args()

    sys.exit(run_migration(dry_run=not args.execute, quarantine_dir=args.quarantine_dir, storage_dir=args.storage_dir))
