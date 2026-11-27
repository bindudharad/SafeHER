#!/usr/bin/env python3
"""
SafeHER Production Restore Tool
===============================
Restores SafeHER SQLite database and encrypted evidence storage from a backup.
Validates SHA-256 checksums from manifest.json and performs cryptographic verification.
"""

import argparse
import hashlib
import json
import os
import shutil
import sqlite3
import sys
from typing import Any, Dict


def sha256_file(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def perform_restore(
    backup_folder: str,
    target_db_path: str,
    target_storage_dir: str,
    verify_crypto: bool = False,
) -> Dict[str, Any]:
    manifest_path = os.path.join(backup_folder, "manifest.json")
    if not os.path.exists(manifest_path):
        raise FileNotFoundError(f"Backup manifest not found at: {manifest_path}")

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # 1. Verify and restore database
    backup_db = os.path.join(backup_folder, manifest["database"]["filename"])
    if not os.path.exists(backup_db):
        raise FileNotFoundError(f"Database backup file missing: {backup_db}")

    actual_db_hash = sha256_file(backup_db)
    expected_db_hash = manifest["database"]["sha256"]
    if actual_db_hash.lower() != expected_db_hash.lower():
        raise ValueError(f"Database SHA-256 mismatch! Expected: {expected_db_hash}, Got: {actual_db_hash}")

    os.makedirs(os.path.dirname(os.path.abspath(target_db_path)), exist_ok=True)
    shutil.copy2(backup_db, target_db_path)

    # 2. Verify and restore evidence files
    backup_evidence_dir = os.path.join(backup_folder, "storage", "evidence")
    target_evidence_dir = os.path.join(target_storage_dir, "evidence")
    os.makedirs(target_storage_dir, exist_ok=True)
    os.makedirs(target_evidence_dir, exist_ok=True)

    restored_evidence_count = 0
    for item in manifest.get("evidence_files", []):
        src_path = os.path.join(backup_evidence_dir, item["filename"])
        if not os.path.exists(src_path):
            raise FileNotFoundError(f"Evidence file missing from backup: {src_path}")

        actual_hash = sha256_file(src_path)
        if actual_hash.lower() != item["sha256"].lower():
            raise ValueError(f"Evidence file checksum mismatch on {item['filename']}! Expected {item['sha256']}, got {actual_hash}")

        # Restore both to target_storage_dir directly and to target_storage_dir/evidence
        dst_path1 = os.path.join(target_storage_dir, item["filename"])
        dst_path2 = os.path.join(target_evidence_dir, item["filename"])
        shutil.copy2(src_path, dst_path1)
        shutil.copy2(src_path, dst_path2)
        restored_evidence_count += 1

    # 3. Test restored DB query
    conn = sqlite3.connect(target_db_path)
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM sqlite_master WHERE type='table';")
    table_count = cur.fetchone()[0]

    evidence_rows = 0
    try:
        cur.execute("SELECT count(*) FROM evidence;")
        evidence_rows = cur.fetchone()[0]
    except Exception:
        pass
    conn.close()

    # 4. Optional cryptographic verification
    crypto_verified = False
    if verify_crypto and evidence_rows > 0:
        try:
            sys.path.insert(0, os.path.abspath("backend"))
            from security.evidence_storage import retrieve_and_decrypt_evidence
            conn = sqlite3.connect(target_db_path)
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT * FROM evidence WHERE storage_status = 'stored_encrypted' ORDER BY upload_timestamp DESC").fetchall()
            conn.close()
            for r in rows:
                sample_dict = dict(r)
                fname = sample_dict.get("stored_filename")
                if not fname:
                    continue
                f_path = os.path.join(target_storage_dir, fname)
                if not os.path.exists(f_path):
                    f_path = os.path.join(target_evidence_dir, fname)
                if os.path.exists(f_path):
                    try:
                        pt = retrieve_and_decrypt_evidence(
                            evidence_id=sample_dict["id"],
                            user_id=sample_dict["user_id"],
                            stored_filename=fname,
                            storage_dir=os.path.dirname(f_path),
                            wrapped_key_hex=sample_dict.get("wrapped_key"),
                            wrapped_dek_hex=sample_dict.get("wrapped_dek"),
                            wrapping_nonce_hex=sample_dict.get("wrapping_nonce"),
                            data_nonce_hex=sample_dict.get("data_nonce"),
                            key_id=sample_dict.get("key_id"),
                            key_version=sample_dict.get("key_version"),
                            encryption_version=sample_dict.get("encryption_version") or "v2",
                            expected_sha256=sample_dict.get("sha256_hash") or "",
                        )
                        if hashlib.sha256(pt).hexdigest().lower() == sample_dict["sha256_hash"].lower():
                            crypto_verified = True
                            break
                    except Exception as decrypt_err:
                        continue
                        continue
        except Exception as e:
            crypto_verified = False
            print(f"[WARN] Crypto round-trip check note: {e}")

    return {
        "status": "success",
        "restored_db_path": target_db_path,
        "restored_evidence_count": restored_evidence_count,
        "table_count": table_count,
        "evidence_rows_in_db": evidence_rows,
        "crypto_verified": crypto_verified,
    }


def main():
    parser = argparse.ArgumentParser(description="SafeHER Production Restore Utility")
    parser.add_argument("backup_folder", help="Path to backup folder containing manifest.json")
    parser.add_argument("--db", default=os.path.join("backend", "safeher_restored.db"), help="Target database path")
    parser.add_argument("--storage", default=os.path.join("backend", "storage_restored"), help="Target storage directory")
    parser.add_argument("--verify-crypto", action="store_true", help="Perform sample test decryption of restored evidence")
    args = parser.parse_args()

    try:
        res = perform_restore(args.backup_folder, args.db, args.storage, args.verify_crypto)
        print(f"[OK] Restore completed successfully into: {res['restored_db_path']}")
        print(f"     Tables verified: {res['table_count']}")
        print(f"     Evidence restored: {res['restored_evidence_count']}")
        if args.verify_crypto:
            print(f"     Crypto roundtrip verified: {res['crypto_verified']}")
    except Exception as e:
        print(f"[ERROR] Restore failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
