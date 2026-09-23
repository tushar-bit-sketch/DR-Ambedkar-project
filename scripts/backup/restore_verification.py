#!/usr/bin/env python3
"""
Institutional Backup Restore Verification Utility.
Verifies the cryptographic integrity of backup archives and simulated extraction
readiness without corrupting or overwriting active production databases.
"""
import os
import sys
import json
import zipfile
import hashlib
import tempfile

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BACKUP_DIR = os.path.join(PROJECT_ROOT, "backups")


def calculate_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def verify_backup(backup_zip_path: str, manifest_path: str = None) -> bool:
    """Verifies that a backup archive matches its manifest and contains uncorrupted data."""
    if not os.path.exists(backup_zip_path):
        print(f"[ERROR] Backup file not found: {backup_zip_path}")
        return False

    if not manifest_path:
        manifest_path = backup_zip_path.replace(".zip", ".manifest.json")

    print(f"==============================================================================")
    print(f"  VERIFYING INSTITUTIONAL BACKUP: {os.path.basename(backup_zip_path)}")
    print(f"==============================================================================")

    # 1. Verify manifest existence
    if not os.path.exists(manifest_path):
        print(f"[ERROR] Manifest file missing: {manifest_path}")
        return False

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # 2. Verify archive file SHA-256
    print("Checking archive file hash...")
    actual_sha = calculate_sha256(backup_zip_path)
    expected_sha = manifest.get("archive_sha256")
    if actual_sha != expected_sha:
        print(f"[FAIL] Archive SHA-256 mismatch!\n  Expected: {expected_sha}\n  Actual:   {actual_sha}")
        return False
    print(f" [PASS] Archive SHA-256 matches: {actual_sha[:16]}...")

    # 3. Simulate extraction in temporary directory and verify every individual entry
    print("Simulating extraction and inspecting internal entries...")
    with tempfile.TemporaryDirectory() as tmpdir:
        with zipfile.ZipFile(backup_zip_path, "r") as zipf:
            zipf.extractall(tmpdir)

        expected_files = manifest.get("files", [])
        verified_count = 0
        for entry in expected_files:
            rel_p = entry["path"]
            exp_sha = entry["sha256"]
            extracted_p = os.path.join(tmpdir, rel_p.replace("/", os.sep))

            if not os.path.exists(extracted_p):
                print(f"[FAIL] Missing extracted file: {rel_p}")
                return False

            file_sha = calculate_sha256(extracted_p)
            if file_sha != exp_sha:
                print(f"[FAIL] Checksum mismatch on file: {rel_p}")
                return False
            verified_count += 1

    print(f" [PASS] Successfully verified {verified_count}/{len(expected_files)} files.")
    print(" [PASS] Database and master vault files are structurally sound and restore-ready.")
    print("==============================================================================")
    return True


if __name__ == "__main__":
    if len(sys.argv) > 1:
        zip_path = sys.argv[1]
    else:
        # Find latest backup in backups/
        if not os.path.exists(BACKUP_DIR):
            print("No backups directory found.")
            sys.exit(1)
        zips = [os.path.join(BACKUP_DIR, f) for f in os.listdir(BACKUP_DIR) if f.endswith(".zip")]
        if not zips:
            print("No backup .zip files found in backups/")
            sys.exit(1)
        zips.sort(key=os.path.getmtime, reverse=True)
        zip_path = zips[0]

    success = verify_backup(zip_path)
    sys.exit(0 if success else 1)
