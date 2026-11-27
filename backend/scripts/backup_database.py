#!/usr/bin/env python3
"""
SafeHER Production Backup Tool
==============================
Performs consistent SQLite database backup and encrypted evidence blob backup.
Calculates SHA-256 hashes and generates a verifiable manifest.json.
"""

import argparse
import datetime
import hashlib
import json
import os
import shutil
import sqlite3
import sys
from typing import Any, Dict, List


def sha256_file(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def perform_backup(
    db_path: str,
    storage_dir: str,
    output_dir: str,
) -> Dict[str, Any]:
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%SZ")
    backup_folder = os.path.join(output_dir, f"safeher_backup_{timestamp}")
    os.makedirs(backup_folder, exist_ok=True)

    db_backup_path = os.path.join(backup_folder, "safeher.db")
    storage_backup_dir = os.path.join(backup_folder, "storage")
    os.makedirs(storage_backup_dir, exist_ok=True)

    # 1. Consistent SQLite online backup
    if os.path.exists(db_path):
        src_conn = sqlite3.connect(db_path)
        dst_conn = sqlite3.connect(db_backup_path)
        with dst_conn:
            src_conn.backup(dst_conn, pages=100)
        dst_conn.close()
        src_conn.close()
        db_hash = sha256_file(db_backup_path)
        db_size = os.path.getsize(db_backup_path)
    else:
        raise FileNotFoundError(f"Database file not found at {db_path}")

    # 2. Encrypted evidence storage copy
    evidence_dst = os.path.join(storage_backup_dir, "evidence")
    os.makedirs(evidence_dst, exist_ok=True)

    evidence_manifest: List[Dict[str, Any]] = []
    total_evidence_bytes = 0

    candidate_dirs = [storage_dir, os.path.join(storage_dir, "evidence")]
    seen_files = set()
    for c_dir in candidate_dirs:
        if os.path.exists(c_dir):
            for fname in os.listdir(c_dir):
                if fname.endswith(".enc") and fname not in seen_files:
                    seen_files.add(fname)
                    src_file = os.path.join(c_dir, fname)
                    if os.path.isfile(src_file):
                        dst_file = os.path.join(evidence_dst, fname)
                        shutil.copy2(src_file, dst_file)
                        f_hash = sha256_file(dst_file)
                        f_size = os.path.getsize(dst_file)
                        total_evidence_bytes += f_size
                        evidence_manifest.append({
                            "filename": fname,
                            "sha256": f_hash,
                            "size_bytes": f_size,
                        })

    # 3. Create Manifest
    manifest = {
        "version": "1.0",
        "system": "SafeHER Digital Safety Platform",
        "backup_timestamp": timestamp,
        "database": {
            "filename": "safeher.db",
            "sha256": db_hash,
            "size_bytes": db_size,
        },
        "evidence_files": evidence_manifest,
        "total_evidence_count": len(evidence_manifest),
        "total_evidence_bytes": total_evidence_bytes,
        "encryption_algorithm": "AES-256-GCM (Envelope Encrypted)",
    }

    manifest_path = os.path.join(backup_folder, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    manifest_hash = sha256_file(manifest_path)
    manifest["manifest_sha256"] = manifest_hash

    return {
        "status": "success",
        "backup_path": backup_folder,
        "manifest": manifest,
    }


def main():
    parser = argparse.ArgumentParser(description="SafeHER Production Backup Utility")
    parser.add_argument("--db", default=os.path.join("backend", "safeher.db"), help="Path to SQLite database")
    parser.add_argument("--storage", default=os.path.join("backend", "storage"), help="Path to evidence storage directory")
    parser.add_argument("--output", default="backups", help="Output directory for backup folder")
    args = parser.parse_args()

    try:
        res = perform_backup(args.db, args.storage, args.output)
        print(f"[OK] Backup successfully created at: {res['backup_path']}")
        print(f"     Evidence count: {res['manifest']['total_evidence_count']}")
        print(f"     Database SHA-256: {res['manifest']['database']['sha256']}")
    except Exception as e:
        print(f"[ERROR] Backup failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
