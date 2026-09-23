"""
Base Hardware Abstraction Layer for Physical Exhibition Kiosks.
Defines contracts, enums, dataclasses, and honest capability reporting.
Strictly avoids fabricating hardware telemetry or simulating non-existent physical devices.
"""
from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
import datetime


class HardwareType(str, Enum):
    DISPLAY = "DISPLAY"
    TOUCHSCREEN = "TOUCHSCREEN"
    KEYBOARD = "KEYBOARD"
    MOUSE = "MOUSE"
    CAMERA = "CAMERA"
    MICROPHONE = "MICROPHONE"
    SPEAKER = "SPEAKER"
    PRINTER = "PRINTER"
    QR_SCANNER = "QR_SCANNER"
    NFC_READER = "NFC_READER"
    USB_PERIPHERALS = "USB_PERIPHERALS"


class DeviceStatus(str, Enum):
    OPERATIONAL = "OPERATIONAL"
    OPERATIONAL_FALLBACK = "OPERATIONAL (FALLBACK)"
    DEGRADED = "DEGRADED"
    UNAVAILABLE = "UNAVAILABLE"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    NOT_TESTED = "NOT_TESTED"
    NOT_DETECTED = "NOT_DETECTED"


@dataclass
class HardwareDevice:
    device_id: str
    device_type: HardwareType
    vendor: str = "Unknown"
    model: str = "Generic"
    connection_status: str = "CONNECTED"
    health_status: DeviceStatus = DeviceStatus.NOT_TESTED
    capabilities: Dict[str, Any] = field(default_factory=dict)
    last_seen: Optional[datetime.datetime] = None
    error_state: Optional[str] = None
    firmware_version: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "device_id": self.device_id,
            "device_type": self.device_type.value,
            "vendor": self.vendor,
            "model": self.model,
            "connection_status": self.connection_status,
            "health_status": self.health_status.value,
            "capabilities": self.capabilities,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "error_state": self.error_state,
            "firmware_version": self.firmware_version
        }


class BaseHardwareProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def detect_hardware(self) -> Dict[str, HardwareDevice]:
        """Scans host environment and returns verified hardware device abstractions."""
        pass

    @abstractmethod
    def get_device(self, device_type: HardwareType) -> Optional[HardwareDevice]:
        pass
