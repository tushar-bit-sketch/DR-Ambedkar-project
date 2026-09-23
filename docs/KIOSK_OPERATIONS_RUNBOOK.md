# Exhibition Kiosk Operations Runbook

**Audience**: Museum IT Administrators, Memorial Technical Staff, Exhibition Curators  
**System**: Dr. Ambedkar Institutional Digital Heritage Archive (SIH26096)

---

## 1. Terminal Hardware Checklist

Before deploying an interactive exhibition workstation:
- [ ] Connect display monitor (Full HD 1920x1080 recommended, landscape or portrait).
- [ ] Connect audio output (speakers or headphones) and verify volume levels.
- [ ] Connect mouse/trackpad or verify touchscreen digitizer functionality.
- [ ] Ensure terminal is connected to memorial LAN or offline cache is pre-loaded.
- [ ] Confirm user account has restricted non-administrative operating system privileges.

---

## 2. Registering a New Terminal

1. Log into the Archival Administration Portal as `SUPER_ADMIN` or `ARCHIVIST`:  
   Navigate to `http://<server-ip>/admin/kiosks`.
2. Click **Register Terminal**.
3. Enter:
   - **Device Name**: e.g., `Kiosk-Hall-A-West`
   - **Memorial / Institution**: e.g., `Dr. Ambedkar National Memorial`
   - **Location**: e.g., `Exhibition Hall A — Constitution Gallery`
   - **Hardware Profile**: Select `Touchscreen Pedestal`, `Tablet Desk`, or `Accessibility Pod`.
4. Click **Register Terminal**.
5. **CRITICAL**: Copy the one-time **Terminal Device API Key** (`kiosk_live_...`).  
   *Note: This key is never stored in plaintext on the server and will not be displayed again.*

---

## 3. Workstation Startup

### Windows 11 Workstations
1. Set the environment variables (or edit `scripts/kiosk/windows_kiosk_launch.bat`):
   ```cmd
   set KIOSK_SERVER_URL=http://archive-server.lan
   set KIOSK_START_ROUTE=/kiosk/media
   set KIOSK_DEVICE_KEY=kiosk_live_...
   ```
2. Execute the locked launcher:
   ```cmd
   scripts\kiosk\windows_kiosk_launch.bat
   ```
   *The launcher starts Chromium/Edge in locked kiosk mode with pinch-zoom, gesture navigation, and URL bars disabled.*

### Linux / Raspberry Pi Workstations
1. Set execution permissions and run:
   ```bash
   chmod +x scripts/kiosk/linux_kiosk_launch.sh
   KIOSK_SERVER_URL="http://archive-server.lan" scripts/kiosk/linux_kiosk_launch.sh
   ```

---

## 4. Monitoring Fleet Telemetry

Navigate to `/admin/kiosks` in the Admin Portal:
- **Green Dot (`ONLINE`)**: Heartbeat active within last 90 seconds.
- **Yellow Dot (`STALE`)**: Heartbeat delayed (90–300s). Check LAN connection.
- **Red Dot (`OFFLINE`)**: Terminal unresponsive (>300s). Check power and workstation status.
- **Purple Badge (`MAINTENANCE`)**: Station locked with institutional maintenance notice.
- Click **Telemetry** on any terminal to inspect CPU, RAM, Disk, and hardware profiles.

---

## 5. Remote Maintenance Mode

When performing physical exhibition cleaning, software upgrades, or gallery rotation:
1. In the Kiosk Fleet table, locate the terminal.
2. Click **Maint.** or go to terminal details and click **Set Maintenance**.
3. The physical terminal instantly replaces the exhibition view with a locked maintenance overlay:
   *"This terminal is undergoing scheduled institutional maintenance. Station Temporarily Unavailable."*
4. When work is complete, click **Exit Maintenance** to restore the interactive view.

---

## 6. Key Rotation & Emergency Revocation

### Rotating a Device Key
1. In terminal details, click **Rotate Key**.
2. Confirm the prompt. The old key is invalidated immediately.
3. Copy the newly generated key and update the terminal's startup configuration.

### Disabling a Compromised Terminal
1. In terminal details, click **Disable**.
2. Confirm the revocation. The terminal is immediately marked `DISABLED` and blocked from submitting heartbeats or accessing edge caches.

---

## 7. Automated Backups & Disaster Recovery

### Creating a Cryptographically Verified Snapshot
Run the automated backup utility from the archive server:
```bash
python scripts/backup/backup_archive.py
```
Output:
- Timestamped `.zip` in `backups/` containing SQLite/PostgreSQL database and masters vault.
- Timestamped `.manifest.json` with item count, sizes, and SHA-256 digests.

### Verifying Backup Integrity
To verify that a backup archive is intact and ready for emergency restoration:
```bash
python scripts/backup/restore_verification.py backups/ambedkar_archive_backup_<timestamp>.zip
```
*Validates archive hashes and internal files in a sandbox directory without touching live databases.*
