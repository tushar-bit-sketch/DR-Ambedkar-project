"""
Whisper Media Transcription Provider.
Strictly checks for real whisper model installation.
Refuses to fabricate synthetic transcripts when model weights or packages are absent.
"""
from typing import Optional, Dict, Any

from app.services.media.transcription.base import (
    BaseMediaTranscriptionProvider,
    TranscriptionUnavailableError,
    TranscriptData
)
from app.services.media.provider_status import is_whisper_installed


class WhisperTranscriptionProvider(BaseMediaTranscriptionProvider):
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self._installed = is_whisper_installed()

    @property
    def name(self) -> str:
        return f"whisper_{self.model_size}"

    @property
    def is_available(self) -> bool:
        return self._installed

    def get_status(self) -> Dict[str, Any]:
        if not self._installed:
            return {
                "provider": "whisper",
                "is_operational": False,
                "status": "TRANSCRIPTION_PROVIDER_UNAVAILABLE",
                "error": "Whisper Python package or model weights are not installed on host.",
                "message": "Speech-to-text is unavailable. Transcripts may only be manually imported by curators."
            }
        return {
            "provider": "whisper",
            "is_operational": True,
            "status": "OPERATIONAL",
            "model_size": self.model_size
        }

    def transcribe(self, file_path: str, language: Optional[str] = "en") -> TranscriptData:
        if not self._installed:
            raise TranscriptionUnavailableError(
                "Whisper transcription provider is UNAVAILABLE. Whisper is not installed on this system. "
                "The archive strictly refuses to fabricate synthetic transcripts."
            )

        # In an environment where whisper is genuinely installed:
        import whisper
        model = whisper.load_model(self.model_size)
        result = model.transcribe(file_path, language=language)

        # Parse segments
        segments = []
        for i, seg in enumerate(result.get("segments", [])):
            from app.services.media.caption_service import seconds_to_timestamp_str
            start_s = float(seg.get("start", 0.0))
            end_s = float(seg.get("end", 0.0))
            segments.append(TranscriptSegmentData(
                sequence=i + 1,
                start_time=start_s,
                end_time=end_s,
                start_timestamp_str=seconds_to_timestamp_str(start_s),
                end_timestamp_str=seconds_to_timestamp_str(end_s),
                text=seg.get("text", "").strip(),
                speaker_label="UNKNOWN",
                confidence=float(seg.get("confidence", 0.9)),
                verification_status="PENDING_REVIEW"
            ))

        return TranscriptData(
            language=language or "en",
            source_type="MACHINE_TRANSCRIPT",
            status="MACHINE_GENERATED",
            model=f"whisper-{self.model_size}",
            model_version="1.0",
            segments=segments
        )
