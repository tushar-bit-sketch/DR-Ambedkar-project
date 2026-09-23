"""
Transcription Provider Factory.
"""
from app.services.media.transcription.base import BaseMediaTranscriptionProvider
from app.services.media.transcription.whisper_provider import WhisperTranscriptionProvider
from app.services.media.transcription.curator_provider import CuratorTranscriptImportProvider


def get_transcription_provider(provider_type: str = "whisper") -> BaseMediaTranscriptionProvider:
    if provider_type.lower() == "curator":
        return CuratorTranscriptImportProvider()
    return WhisperTranscriptionProvider()
