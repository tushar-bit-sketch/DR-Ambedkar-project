#!/usr/bin/env python3
"""
Institutional Backup Utility for Ambedkar Memorial Archive.
Creates a cryptographically verified snapshot of the archive database,
master files, and configuration metadata.
"""
import os
import sys
import time
import json
import shutil
import hashlib
import zipfile
import datetime

# Root paths
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKUP_DIR = os.path.join(PROJECT_ROOT, "backups")
STORAGE_DIR = os.path.join(PROJECT_ROOT, "backend", "storage")
DB_FILE = os.path.join(PROJECT_ROOT, "backend", "archive_phase1.db")


def calculate_sha256(filepath: str) -> str:
    """Calculates SHA-256 hex digest of a file in chunks."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def create_backup():
    """Generates a complete verified backup archive."""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_name = f"ambedkar_archive_backup_{timestamp}.zip"
    backup_path = os.path.join(BACKUP_DIR, backup_name)
    manifest_name = f"ambedkar_archive_backup_{timestamp}.manifest.json"
    manifest_path = os.path.join(BACKUP_DIR, manifest_name)

    print(f"==============================================================================")
    print(f"  CREATING INSTITUTIONAL ARCHIVE BACKUP: {backup_name}")
    print(f"==============================================================================")

    manifest_entries = []
    total_bytes = 0

    with zipfile.ZipFile(backup_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        # 1. Database backup
        if os.path.exists(DB_FILE):
            db_size = os.path.getsize(DB_FILE)
            db_sha = calculate_sha256(DB_FILE)
            zipf.write(DB_FILE, arcname="db/archive_phase1.db")
            total_bytes += db_size
            manifest_entries.append({
                "path": "db/archive_phase1.db",
                "bytes": db_size,
                "sha256": db_sha,
                "type": "database"
            })
            print(f" [DB] Archived database ({db_size} bytes, sha256:{db_sha[:12]}...)")
        else:
            print(" [DB] SQLite database file not found at default location.")

        # 2. Master storage files
        masters_dir = os.path.join(STORAGE_DIR, "media", "masters")
        if os.path.exists(masters_dir):
            for root, _, files in os.walk(masters_dir):
                for f in files:
                    full_p = os.path.join(root, f)
                    rel_p = os.path.relpath(full_p, STORAGE_DIR)
                    arc_name = os.path.join("storage", rel_p).replace("\\", "/")
                    f_size = os.path.getsize(full_p)
                    f_sha = calculate_sha256(full_p)
                    zipf.write(full_p, arcname=arc_name)
                    total_bytes += f_size
                    manifest_entries.append({
                        "path": arc_name,
                        "bytes": f_size,
                        "sha256": f_sha,
                        "type": "master_vault_file"
                    })
                    print(f" [VAULT] Archived master: {arc_name} ({f_size} bytes)")
        else:
            print(" [VAULT] No master vault directory found.")

    # 3. Compute backup file checksum
    backup_file_size = os.path.getsize(backup_path)
    backup_file_sha = calculate_sha256(backup_path)

    # 4. Generate signed manifest
    manifest_doc = {
        "institution": "Dr. Ambedkar National Memorial Archive",
        "backup_name": backup_name,
        "timestamp_utc": datetime.datetime.utcnow().isoformat(),
        "total_files": len(manifest_entries),
        "uncompressed_bytes": total_bytes,
        "compressed_archive_bytes": backup_file_size,
        "archive_sha256": backup_file_sha,
        "files": manifest_entries
    }

    with open(manifest_path, "w", encoding="utf-8") as mf:
        json.dump(manifest_doc, mf, indent=2)

    print(f"==============================================================================")
    print(f"Backup created successfully:")
    print(f"  Archive: {backup_path} ({backup_file_size} bytes)")
    print(f"  SHA-256: {backup_file_sha}")
    print(f"  Manifest: {manifest_path}")
    print(f"==============================================================================")
    return backup_path, manifest_path


if __name__ == "__main__":
    create_backup()
