"""
Base Media Transcription Interface & Dataclasses.
"""
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field


class TranscriptionUnavailableError(Exception):
    """Raised when an STT/transcription provider is invoked while unavailable."""
    pass


@dataclass
class TranscriptSegmentData:
    sequence: int
    start_time: float
    end_time: float
    start_timestamp_str: str
    end_timestamp_str: str
    text: str
    speaker_label: str = "UNKNOWN"
    confidence: float = 1.0 # MODEL CONFIDENCE
    verification_status: str = "PENDING_REVIEW"
    source_reference: Optional[str] = None


@dataclass
class TranscriptData:
    language: str
    source_type: str # HUMAN_TRANSCRIPT, MACHINE_TRANSCRIPT, IMPORTED_TRANSCRIPT, CURATOR_CORRECTED
    status: str # MACHINE_GENERATED, UNDER_REVIEW, HUMAN_REVIEWED, APPROVED
    model: Optional[str] = None
    model_version: Optional[str] = None
    processing_time_ms: Optional[int] = None
    segments: List[TranscriptSegmentData] = field(default_factory=list)


class BaseMediaTranscriptionProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def is_available(self) -> bool:
        pass

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def transcribe(self, file_path: str, language: Optional[str] = "en") -> TranscriptData:
        """Transcribes audio file. Must refuse to fabricate if unavailable."""
        pass
