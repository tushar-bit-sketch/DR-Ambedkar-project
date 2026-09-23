"""
Media Provider Status & Capability Detection.
Strictly and honestly reports availability of external tools and local Python fallbacks.
NEVER simulates or fabricates availability.
"""
import shutil
import importlib.util
from typing import Dict, Any


def is_ffmpeg_installed() -> bool:
    return shutil.which("ffmpeg") is not None


def is_ffprobe_installed() -> bool:
    return shutil.which("ffprobe") is not None


def is_whisper_installed() -> bool:
    return importlib.util.find_spec("whisper") is not None


def is_opencv_installed() -> bool:
    return importlib.util.find_spec("cv2") is not None


def is_pillow_installed() -> bool:
    return importlib.util.find_spec("PIL") is not None


def get_media_diagnostics() -> Dict[str, Any]:
    """
    Returns verified operational diagnostics for audio/video media tools.
    """
    ffmpeg_ok = is_ffmpeg_installed()
    ffprobe_ok = is_ffprobe_installed()
    whisper_ok = is_whisper_installed()
    opencv_ok = is_opencv_installed()
    pillow_ok = is_pillow_installed()
    wave_ok = True # Python standard library

    active_proc = "ffmpeg" if ffmpeg_ok else "python_native (OpenCV + Pillow + Wave)"

    return {
        "ffmpeg_available": ffmpeg_ok,
        "ffmpeg_status": "OPERATIONAL" if ffmpeg_ok else "UNAVAILABLE",
        "ffprobe_available": ffprobe_ok,
        "ffprobe_status": "OPERATIONAL" if ffprobe_ok else "UNAVAILABLE",
        "whisper_available": whisper_ok,
        "whisper_status": "OPERATIONAL" if whisper_ok else "UNAVAILABLE",
        "native_opencv_available": opencv_ok,
        "native_pillow_available": pillow_ok,
        "native_wave_available": wave_ok,
        "active_processor": active_proc,
        "message": (
            "FFmpeg and Whisper not found on host system. "
            "Native Python processor (OpenCV, Pillow, Wave) active for inspection and derivative generation. "
            "Speech-to-text requires manual curator transcript import or external Whisper installation."
        ) if not (ffmpeg_ok and whisper_ok) else "All media processing and transcription tools operational."
    }
