"""
Curator Transcript Import Provider.
Allows curators and researchers to supply authentic, primary-source-backed transcripts
from WebVTT, SRT, or structured JSON segments without artificial machine synthesis.
"""
from typing import Optional, List, Dict, Any

from app.services.media.transcription.base import (
    BaseMediaTranscriptionProvider,
    TranscriptData,
    TranscriptSegmentData
)
from app.services.media.caption_service import CaptionService, seconds_to_timestamp_str


class CuratorTranscriptImportProvider(BaseMediaTranscriptionProvider):
    @property
    def name(self) -> str:
        return "curator_transcript_importer"

    @property
    def is_available(self) -> bool:
        return True

    def get_status(self) -> Dict[str, Any]:
        return {
            "provider": "curator_import",
            "is_operational": True,
            "status": "OPERATIONAL",
            "description": "Supports human-reviewed and primary-source imported transcript ingestion."
        }

    def transcribe(self, file_path: str, language: Optional[str] = "en") -> TranscriptData:
        """
        Curator importer does not run automated acoustic inference;
        it is invoked via import_text or import_segments.
        """
        raise NotImplementedError("Direct audio transcription is not supported by curator importer. Use import_from_text.")

    def import_from_vtt(self, vtt_text: str, language: str = "en") -> TranscriptData:
        raw_segments = CaptionService.parse_webvtt(vtt_text)
        segments = [
            TranscriptSegmentData(
                sequence=s["sequence"],
                start_time=s["start_time"],
                end_time=s["end_time"],
                start_timestamp_str=s["start_timestamp_str"],
                end_timestamp_str=s["end_timestamp_str"],
                text=s["text"],
                speaker_label=s.get("speaker_label", "UNKNOWN"),
                confidence=1.0,
                verification_status="APPROVED",
                source_reference="Curator WebVTT Import"
            )
            for s in raw_segments
        ]
        return TranscriptData(
            language=language,
            source_type="IMPORTED_TRANSCRIPT",
            status="HUMAN_REVIEWED",
            model="manual-curator",
            segments=segments
        )

    def import_from_srt(self, srt_text: str, language: str = "en") -> TranscriptData:
        raw_segments = CaptionService.parse_srt(srt_text)
        segments = [
            TranscriptSegmentData(
                sequence=s["sequence"],
                start_time=s["start_time"],
                end_time=s["end_time"],
                start_timestamp_str=s["start_timestamp_str"],
                end_timestamp_str=s["end_timestamp_str"],
                text=s["text"],
                speaker_label="UNKNOWN",
                confidence=1.0,
                verification_status="APPROVED",
                source_reference="Curator SRT Import"
            )
            for s in raw_segments
        ]
        return TranscriptData(
            language=language,
            source_type="IMPORTED_TRANSCRIPT",
            status="HUMAN_REVIEWED",
            model="manual-curator",
            segments=segments
        )


CuratorTranscriptionProvider = CuratorTranscriptImportProvider
