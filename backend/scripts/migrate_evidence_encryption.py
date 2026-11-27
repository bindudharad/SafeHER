"""
SafeHER Evidence Encryption Migration Script
Wrapper located at backend/scripts/migrate_evidence_encryption.py
Delegates to backend.migrate_evidence
"""

import os
import sys

# Ensure backend root is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from migrate_evidence import run_migration
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SafeHER Evidence Encryption Migration Utility")
    parser.add_argument("--execute", action="store_true", help="Execute real encryption and quarantine plaintext")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Simulate without modifying files or DB (default)")
    parser.add_argument("--quarantine-dir", type=str, default=None, help="Custom quarantine directory for legacy plaintext")
    parser.add_argument("--storage-dir", type=str, default=None, help="Custom active evidence storage directory")
    args = parser.parse_args()

    sys.exit(run_migration(dry_run=not args.execute, quarantine_dir=args.quarantine_dir, storage_dir=args.storage_dir))
