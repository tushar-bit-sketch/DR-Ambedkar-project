"""
FFmpeg & FFprobe Media Processor.
Executes external ffmpeg/ffprobe binary commands using strict list-based arguments.
Guards against command injection and raises clear errors when tools are absent.
"""
import os
import json
import shutil
import hashlib
import logging
import subprocess
from typing import Optional, List, Dict, Any

from app.services.media.processor.base import BaseMediaProcessor, MediaInspectionResult, DerivativeResult

logger = logging.getLogger("archive.media.ffmpeg")


class FFmpegMediaProcessor(BaseMediaProcessor):
    def __init__(self):
        self.ffmpeg_path = shutil.which("ffmpeg")
        self.ffprobe_path = shutil.which("ffprobe")

    @property
    def name(self) -> str:
        return "ffmpeg_processor"

    @property
    def is_available(self) -> bool:
        return bool(self.ffmpeg_path and self.ffprobe_path)

    def _calculate_sha256(self, file_path: str) -> str:
        h = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()

    def inspect(self, file_path: str, declared_mime: Optional[str] = None) -> MediaInspectionResult:
        if not self.is_available:
            raise RuntimeError("FFprobe is not installed or available on this system.")

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Media file not found: {file_path}")

        # Safely run ffprobe with parameter list (NO shell=True)
        cmd = [
            self.ffprobe_path,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path
        ]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=30)
            data = json.loads(res.stdout)
        except Exception as e:
            logger.error(f"FFprobe inspection failed: {e}")
            raise RuntimeError(f"FFprobe inspection failed: {e}")

        fmt_info = data.get("format", {})
        streams = data.get("streams", [])

        video_streams = [s for s in streams if s.get("codec_type") == "video"]
        audio_streams = [s for s in streams if s.get("codec_type") == "audio"]

        duration = float(fmt_info.get("duration", 0.0)) if fmt_info.get("duration") else None
        size = int(fmt_info.get("size", os.path.getsize(file_path)))
        bitrate = int(fmt_info.get("bit_rate", 0)) if fmt_info.get("bit_rate") else None
        container = fmt_info.get("format_name")

        codec = None
        width = None
        height = None
        frame_rate = None
        if video_streams:
            v = video_streams[0]
            codec = v.get("codec_name")
            width = v.get("width")
            height = v.get("height")
            r_frame_rate = v.get("r_frame_rate", "0/1")
            if "/" in r_frame_rate:
                num, den = r_frame_rate.split("/")
                frame_rate = round(float(num) / float(den), 2) if float(den) > 0 else None

        sample_rate = None
        channels = None
        if audio_streams:
            a = audio_streams[0]
            if not codec:
                codec = a.get("codec_name")
            sample_rate = int(a.get("sample_rate", 0)) if a.get("sample_rate") else None
            channels = int(a.get("channels", 0)) if a.get("channels") else None

        format_str = container.split(",")[0].upper() if container else "UNKNOWN"
        mime = declared_mime or f"application/{format_str.lower()}"

        return MediaInspectionResult(
            mime_type=mime,
            format=format_str,
            duration=duration,
            file_size=size,
            width=width,
            height=height,
            codec=codec,
            container=container,
            frame_rate=frame_rate,
            bit_rate=bitrate,
            sample_rate=sample_rate,
            channels=channels,
            audio_streams=audio_streams,
            video_streams=video_streams,
            raw_metadata=data,
            tool_name="ffprobe",
            tool_version="detected"
        )

    def generate_thumbnail(
        self,
        file_path: str,
        output_path: str,
        media_type: str,
        max_size: int = 320
    ) -> Optional[DerivativeResult]:
        if not self.is_available:
            raise RuntimeError("FFmpeg is not installed or available on this system.")

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        if media_type == "VIDEO":
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-ss", "00:00:01.000",
                "-i", file_path,
                "-vframes", "1",
                "-vf", f"scale={max_size}:-1",
                output_path
            ]
        elif media_type in ["IMAGE", "PHOTOGRAPH"]:
            cmd = [
                self.ffmpeg_path,
                "-y",
                "-i", file_path,
                "-vf", f"scale={max_size}:-1",
                output_path
            ]
        else:
            return None

        try:
            subprocess.run(cmd, capture_output=True, check=True, timeout=30)
            if os.path.exists(output_path):
                return DerivativeResult(
                    derivative_type="THUMBNAIL",
                    output_path=output_path,
                    file_size=os.path.getsize(output_path),
                    checksum_sha256=self._calculate_sha256(output_path),
                    mime_type="image/jpeg",
                    width=max_size,
                    height=None
                )
        except Exception as e:
            logger.error(f"FFmpeg thumbnail generation failed: {e}")
        return None

    def extract_poster_frame(
        self,
        file_path: str,
        output_path: str,
        timestamp_sec: float = 1.0
    ) -> Optional[DerivativeResult]:
        if not self.is_available:
            raise RuntimeError("FFmpeg is not installed or available on this system.")

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        ts_str = f"{timestamp_sec:.3f}"
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-ss", ts_str,
            "-i", file_path,
            "-vframes", "1",
            output_path
        ]

        try:
            subprocess.run(cmd, capture_output=True, check=True, timeout=30)
            if os.path.exists(output_path):
                return DerivativeResult(
                    derivative_type="POSTER_FRAME",
                    output_path=output_path,
                    file_size=os.path.getsize(output_path),
                    checksum_sha256=self._calculate_sha256(output_path),
                    mime_type="image/jpeg"
                )
        except Exception as e:
            logger.error(f"FFmpeg poster frame extraction failed: {e}")
        return None

    def generate_waveform(
        self,
        file_path: str,
        output_json_path: str,
        num_points: int = 150
    ) -> Optional[List[float]]:
        # FFmpeg waveform data extraction is typically piped or read via soundfile
        # When FFmpeg is not installed, NativeMediaProcessor provides pure wave inspection
        return None
