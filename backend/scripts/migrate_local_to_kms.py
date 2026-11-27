"""
SafeHER Local-KEK to Cloud KMS Evidence Migration Script
=========================================================
Safely migrates evidence records encrypted under LocalEnvKEKProvider
(`kek-local-*`) to the configured Cloud KMS provider (e.g., AWS KMS).

Safety Guarantees:
1. Dry-run mode by default (--dry-run / --execute).
2. Creates a timestamped backup of the SQLite database before any write.
3. Unwraps each legacy DEK in memory using LocalEnvKEKProvider, verifies SHA-256
   against the stored evidence record, re-wraps the DEK under Cloud KMS, and
   verifies full round-trip decryption with Cloud KMS BEFORE committing DB updates.
4. Never prints plaintext evidence or key material.
5. Idempotent: already-migrated Cloud KMS records are skipped cleanly.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from db import get_db, get_db_path, get_storage_dir
from security.crypto import EncryptedBlob, aes_decrypt
from security.evidence_storage import build_evidence_aad
from security.key_provider import (
    BaseKeyProvider,
    LocalEnvKEKProvider,
    get_key_provider,
    is_local_key_id,
)


def create_db_backup(db_path: str) -> str:
    """Creates a timestamped backup of the SQLite database prior to migration."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = f"{db_path}.pre_kms_migration_{ts}.bak"
    shutil.copy2(db_path, backup_path)
    return backup_path


def migrate_local_records_to_kms(
    dry_run: bool = True,
    target_provider: Optional[BaseKeyProvider] = None,
    local_provider: Optional[LocalEnvKEKProvider] = None,
    storage_dir: Optional[str] = None,
    db_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Migrates local-KEK-wrapped evidence DEKs to the target Cloud KMS provider.
    Returns a structured summary dict.
    """
    target_kp = target_provider or get_key_provider()
    if getattr(target_kp, "provider_name", "local_env") == "local_env":
        raise RuntimeError(
            "Target key provider is still local_env. Configure SAFEHER_KMS_PROVIDER=aws and SAFEHER_KMS_KEY_ARN before migrating."
        )

    src_kp = local_provider or LocalEnvKEKProvider(allow_generate=False)
    effective_storage = storage_dir or get_storage_dir()
    effective_db = db_path or get_db_path()

    backup_path: Optional[str] = None
    if not dry_run and os.path.exists(effective_db):
        backup_path = create_db_backup(effective_db)

    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM evidence WHERE storage_status = 'stored_encrypted' ORDER BY upload_timestamp ASC"
        ).fetchall()

    summary: Dict[str, Any] = {
        "dry_run": dry_run,
        "target_provider": target_kp.provider_name,
        "target_key_id": target_kp.get_key_id(),
        "backup_path": backup_path,
        "total_encrypted_records": len(rows),
        "migrated": 0,
        "already_kms": 0,
        "errors": 0,
        "error_ids": [],
    }

    for r in rows:
        evi_id = r["id"]
        user_id = r["user_id"]
        key_id = r["key_id"]
        key_version = r["key_version"]
        stored_fn = r["stored_filename"]
        enc_ver = r["encryption_version"] or "v2"
        wrapped_dek_hex = r["wrapped_dek"]
        wrapping_nonce_hex = r["wrapping_nonce"]
        expected_sha256 = r["sha256_hash"]

        if not is_local_key_id(key_id):
            summary["already_kms"] += 1
            continue

        enc_path = os.path.join(effective_storage, stored_fn)
        if not os.path.exists(enc_path) or not wrapped_dek_hex or not wrapping_nonce_hex:
            summary["errors"] += 1
            summary["error_ids"].append(evi_id)
            continue

        try:
            aad = build_evidence_aad(evi_id, user_id, version=enc_ver)
            # 1. Unwrap DEK with LocalEnvKEKProvider
            dek = src_kp.unwrap_key(
                bytes.fromhex(wrapped_dek_hex),
                bytes.fromhex(wrapping_nonce_hex),
                key_id=key_id,
                key_version=key_version or "1",
                aad=aad,
            )

            # 2. Verify ciphertext integrity before re-wrapping
            with open(enc_path, "rb") as f:
                blob = EncryptedBlob.from_bytes(f.read())
            plaintext = aes_decrypt(dek, blob, associated_data=aad)
            if hashlib.sha256(plaintext).hexdigest().lower() != expected_sha256.lower():
                raise ValueError("SHA-256 verification failed before KMS migration.")

            if dry_run:
                summary["migrated"] += 1
                continue

            # 3. Re-wrap DEK under Cloud KMS
            new_wrapped, new_nonce, new_key_id, new_key_ver = target_kp.wrap_key(dek, aad=aad)

            # 4. Verify round-trip unwrap with Cloud KMS before DB commit
            unwrapped_check = target_kp.unwrap_key(
                new_wrapped,
                new_nonce,
                key_id=new_key_id,
                key_version=new_key_ver,
                aad=aad,
            )
            if unwrapped_check != dek:
                raise ValueError("Cloud KMS round-trip DEK verification failed.")

            with get_db() as conn:
                conn.execute(
                    """
                    UPDATE evidence
                    SET wrapped_dek = ?,
                        wrapping_nonce = ?,
                        key_id = ?,
                        key_version = ?
                    WHERE id = ?
                    """,
                    (
                        new_wrapped.hex(),
                        new_nonce.hex(),
                        new_key_id,
                        new_key_ver,
                        evi_id,
                    ),
                )
            summary["migrated"] += 1
        except Exception:
            summary["errors"] += 1
            summary["error_ids"].append(evi_id)

    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate SafeHER local-KEK evidence records to Cloud KMS.")
    parser.add_argument("--execute", action="store_true", help="Apply migration (default is dry-run).")
    args = parser.parse_args()
    res = migrate_local_records_to_kms(dry_run=not args.execute)
    print(res)
    sys.exit(0 if res["errors"] == 0 else 1)
