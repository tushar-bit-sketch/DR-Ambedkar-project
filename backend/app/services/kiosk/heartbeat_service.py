"""
Kiosk Heartbeat & Telemetry Monitoring Service.
Monitors operational health of physical kiosk terminals, calculates online/stale/offline status,
records performance metrics (CPU, RAM, disk, service health), and returns server directives.
"""
import json
import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.db.models import KioskDevice, KioskHeartbeatRecord, KioskConfiguration


class HeartbeatThresholds:
    ONLINE_THRESHOLD_SECONDS = 90
    STALE_THRESHOLD_SECONDS = 300 # 5 minutes


class KioskHeartbeatService:
    @classmethod
    def calculate_device_status(cls, device: KioskDevice, reference_time: Optional[datetime.datetime] = None) -> str:
        """
        Determines terminal status based on maintenance flag, enablement, and last heartbeat timestamp.
        Returns: 'DISABLED', 'MAINTENANCE', 'ERROR', 'ONLINE', 'STALE', 'OFFLINE'.
        """
        if not device.enabled or device.status == "DISABLED":
            return "DISABLED"

        if device.maintenance_mode:
            return "MAINTENANCE"

        if not device.last_seen_at:
            return "REGISTERED"

        now = reference_time or datetime.datetime.utcnow()
        delta_sec = (now - device.last_seen_at).total_seconds()

        if delta_sec <= HeartbeatThresholds.ONLINE_THRESHOLD_SECONDS:
            return "ONLINE"
        elif delta_sec <= HeartbeatThresholds.STALE_THRESHOLD_SECONDS:
            return "STALE"
        else:
            return "OFFLINE"

    @classmethod
    def record_heartbeat(
        cls,
        db: Session,
        device: KioskDevice,
        heartbeat_payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processes an authenticated heartbeat report, updates device telemetry,
        persists a telemetry audit record, and returns current server directives.
        """
        now = datetime.datetime.utcnow()

        # Extract telemetry
        cpu_percent = heartbeat_payload.get("cpu_percent")
        ram_percent = heartbeat_payload.get("ram_percent")
        disk_percent = heartbeat_payload.get("disk_percent")
        app_health = heartbeat_payload.get("app_health", "OPERATIONAL")
        db_health = heartbeat_payload.get("db_health", "OPERATIONAL")
        search_health = heartbeat_payload.get("search_health", "OPERATIONAL")
        rag_health = heartbeat_payload.get("rag_health", "OPERATIONAL")
        media_health = heartbeat_payload.get("media_health", "OPERATIONAL")
        active_errors = heartbeat_payload.get("active_errors", [])
        capabilities = heartbeat_payload.get("capabilities")
        software_version = heartbeat_payload.get("software_version", device.software_version)

        # Determine terminal operational status
        has_critical_error = bool(active_errors) or any(
            h in ("ERROR", "UNAVAILABLE", "CORRUPTED") for h in [app_health, db_health]
        )
        if device.maintenance_mode:
            calc_status = "MAINTENANCE"
        elif has_critical_error:
            calc_status = "ERROR"
        else:
            calc_status = "ONLINE"

        # Update KioskDevice record
        device.last_seen_at = now
        device.status = calc_status
        device.software_version = software_version
        if capabilities:
            device.capabilities_json = json.dumps(capabilities) if isinstance(capabilities, (dict, list)) else str(capabilities)

        device.last_health_report_json = json.dumps({
            "timestamp": now.isoformat(),
            "cpu_percent": cpu_percent,
            "ram_percent": ram_percent,
            "disk_percent": disk_percent,
            "app_health": app_health,
            "db_health": db_health,
            "search_health": search_health,
            "rag_health": rag_health,
            "media_health": media_health,
            "active_errors": active_errors
        })
        device.updated_at = now

        # Record historical telemetry
        hb_record = KioskHeartbeatRecord(
            kiosk_id=device.id,
            timestamp=now,
            status=calc_status,
            cpu_percent=cpu_percent,
            ram_percent=ram_percent,
            disk_percent=disk_percent,
            app_health=app_health,
            db_health=db_health,
            search_health=search_health,
            rag_health=rag_health,
            media_health=media_health,
            active_errors_json=json.dumps(active_errors) if active_errors else None
        )
        db.add(hb_record)
        db.commit()
        db.refresh(device)

        # Configuration version check
        config = device.configuration
        config_version = config.version if config else 1

        # Directives sent back to terminal
        return {
            "status": "ACK",
            "device_status": calc_status,
            "maintenance_mode": device.maintenance_mode,
            "maintenance_message": config.maintenance_message if config else None,
            "configuration_version": config_version,
            "heartbeat_interval_sec": device.heartbeat_interval_sec,
            "server_time": now.isoformat()
        }
