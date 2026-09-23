"""
Media Processor Factory.
Dynamically resolves either FFmpegMediaProcessor (if installed) or NativeMediaProcessor.
"""
from app.services.media.processor.base import BaseMediaProcessor
from app.services.media.processor.ffmpeg_processor import FFmpegMediaProcessor
from app.services.media.processor.native_processor import NativeMediaProcessor
from app.services.media.provider_status import is_ffmpeg_installed


_processor_instance = None


def get_media_processor() -> BaseMediaProcessor:
    global _processor_instance
    if _processor_instance is None:
        if is_ffmpeg_installed():
            _processor_instance = FFmpegMediaProcessor()
        else:
            _processor_instance = NativeMediaProcessor()
    return _processor_instance
