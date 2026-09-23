"""
Base Media Processor Interface.
Defines contracts for technical metadata extraction, thumbnail generation, poster extraction, and waveform calculation.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field


@dataclass
class MediaInspectionResult:
    mime_type: str
    format: str
    duration: Optional[float] = None
    file_size: int = 0
    width: Optional[int] = None
    height: Optional[int] = None
    codec: Optional[str] = None
    container: Optional[str] = None
    frame_rate: Optional[float] = None
    bit_rate: Optional[int] = None
    sample_rate: Optional[int] = None
    channels: Optional[int] = None
    audio_streams: List[Dict[str, Any]] = field(default_factory=list)
    video_streams: List[Dict[str, Any]] = field(default_factory=list)
    raw_metadata: Dict[str, Any] = field(default_factory=dict)
    tool_name: str = "unknown"
    tool_version: str = "unknown"

    @property
    def resolution(self) -> Optional[str]:
        if self.width and self.height:
            return f"{self.width}x{self.height}"
        return None


@dataclass
class DerivativeResult:
    derivative_type: str
    output_path: str
    file_size: int
    checksum_sha256: str
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None
    success: bool = True


class BaseMediaProcessor(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def is_available(self) -> bool:
        pass

    @abstractmethod
    def inspect(self, file_path: str, declared_mime: Optional[str] = None) -> MediaInspectionResult:
        """Inspects technical media attributes (codec, duration, dimensions, bitrates)."""
        pass

    @abstractmethod
    def generate_thumbnail(
        self,
        file_path: str,
        output_path: str,
        media_type: str,
        max_size: int = 320
    ) -> Optional[DerivativeResult]:
        """Generates a representative thumbnail image."""
        pass

    @abstractmethod
    def extract_poster_frame(
        self,
        file_path: str,
        output_path: str,
        timestamp_sec: float = 1.0
    ) -> Optional[DerivativeResult]:
        """Extracts a poster frame from a video file at the given timestamp."""
        pass

    @abstractmethod
    def generate_waveform(
        self,
        file_path: str,
        output_json_path: str,
        num_points: int = 150
    ) -> Optional[List[float]]:
        """Extracts normalized audio waveform amplitude peaks (0.0 to 1.0)."""
        pass
