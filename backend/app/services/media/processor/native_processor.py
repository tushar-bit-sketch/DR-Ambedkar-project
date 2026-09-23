"""
Native Python Media Processor.
Utilizes Pillow for images, OpenCV for video inspection & frame/poster extraction,
and Python standard library 'wave' module for audio inspection and waveform generation.
Executes genuinely without requiring external FFmpeg or FFprobe binaries.
"""
import os
import json
import wave
import struct
import hashlib
import logging
from typing import Optional, List, Dict, Any

from app.services.media.processor.base import BaseMediaProcessor, MediaInspectionResult, DerivativeResult

logger = logging.getLogger("archive.media.native")

try:
    from PIL import Image as PILImage
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False


class NativeMediaProcessor(BaseMediaProcessor):
    @property
    def name(self) -> str:
        return "native_python_processor"

    @property
    def is_available(self) -> bool:
        return PIL_AVAILABLE or OPENCV_AVAILABLE

    def _calculate_sha256(self, file_path: str) -> str:
        h = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()

    def inspect(self, file_path: str, declared_mime: Optional[str] = None) -> MediaInspectionResult:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Media file not found: {file_path}")

        file_size = os.path.getsize(file_path)
        ext = os.path.splitext(file_path)[1].lower().lstrip(".")
        
        # 1. Try Image inspection with Pillow
        if ext in ["jpg", "jpeg", "png", "webp", "tiff", "tif"] and PIL_AVAILABLE:
            try:
                with PILImage.open(file_path) as img:
                    w, h = img.size
                    fmt = (img.format or ext).upper()
                    mime = declared_mime or f"image/{fmt.lower()}"
                    return MediaInspectionResult(
                        mime_type=mime,
                        format=fmt,
                        duration=None,
                        file_size=file_size,
                        width=w,
                        height=h,
                        codec=fmt,
                        container=fmt,
                        raw_metadata={"mode": img.mode, "size": [w, h], "format": img.format},
                        tool_name="pillow",
                        tool_version="12.3.0"
                    )
            except Exception as ie:
                logger.debug(f"Pillow inspection failed: {ie}")

        # 2. Try Video inspection with OpenCV
        if ext in ["mp4", "webm", "mov", "mkv", "avi"] and OPENCV_AVAILABLE:
            try:
                cap = cv2.VideoCapture(file_path)
                if cap.isOpened():
                    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
                    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
                    cap.release()

                    duration = round(frame_count / fps, 2) if fps > 0 and frame_count > 0 else None
                    fmt = ext.upper()
                    mime = declared_mime or f"video/{ext}"
                    return MediaInspectionResult(
                        mime_type=mime,
                        format=fmt,
                        duration=duration,
                        file_size=file_size,
                        width=w,
                        height=h,
                        codec="H264/AVC",
                        container=fmt,
                        frame_rate=round(fps, 2),
                        bit_rate=int((file_size * 8) / duration) if duration and duration > 0 else None,
                        raw_metadata={"width": w, "height": h, "fps": fps, "frame_count": frame_count},
                        tool_name="opencv",
                        tool_version=getattr(cv2, "__version__", "5.0.0")
                    )
            except Exception as ve:
                logger.debug(f"OpenCV inspection failed: {ve}")

        # 3. Try Audio inspection with wave module (standard library)
        if ext == "wav":
            try:
                with wave.open(file_path, "rb") as wf:
                    channels = wf.getnchannels()
                    sample_rate = wf.getframerate()
                    sample_width = wf.getsampwidth()
                    n_frames = wf.getnframes()
                    duration = round(n_frames / float(sample_rate), 2) if sample_rate > 0 else 0.0
                    bitrate = sample_rate * channels * sample_width * 8

                    return MediaInspectionResult(
                        mime_type=declared_mime or "audio/wav",
                        format="WAV",
                        duration=duration,
                        file_size=file_size,
                        codec="PCM",
                        container="RIFF/WAV",
                        bit_rate=bitrate,
                        sample_rate=sample_rate,
                        channels=channels,
                        raw_metadata={
                            "channels": channels,
                            "sample_rate": sample_rate,
                            "sample_width": sample_width,
                            "n_frames": n_frames
                        },
                        tool_name="python_wave",
                        tool_version="3.13"
                    )
            except Exception as we:
                logger.debug(f"Wave inspection failed: {we}")

        # 4. Fallback basic inspection for generic formats (MP3, FLAC, etc.)
        fmt = ext.upper() if ext else "BINARY"
        mime = declared_mime or f"application/{ext}" if ext else "application/octet-stream"
        return MediaInspectionResult(
            mime_type=mime,
            format=fmt,
            duration=None,
            file_size=file_size,
            container=fmt,
            raw_metadata={"detected_extension": ext, "file_size": file_size},
            tool_name="native_stat",
            tool_version="standard"
        )

    def inspect_media(self, file_path: str, media_type: Optional[str] = None) -> MediaInspectionResult:
        return self.inspect(file_path, declared_mime=None)

    def generate_thumbnail(
        self,
        file_path: str,
        output_path: str,
        media_type: Optional[str] = None,
        max_size: int = 320,
        width: Optional[int] = None,
        height: Optional[int] = None
    ) -> Optional[DerivativeResult]:
        if width:
            max_size = max(width, height or width)
        if not media_type:
            ext = os.path.splitext(file_path)[1].lower().lstrip(".")
            if ext in ["jpg", "jpeg", "png", "webp", "tiff", "tif"]:
                media_type = "IMAGE"
            elif ext in ["mp4", "webm", "mov", "mkv", "avi"]:
                media_type = "VIDEO"
            elif ext in ["wav", "mp3", "m4a", "flac", "ogg"]:
                media_type = "AUDIO"
            else:
                media_type = "IMAGE"
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        ext = os.path.splitext(file_path)[1].lower().lstrip(".")

        # Image thumbnail via Pillow
        if media_type in ["IMAGE", "PHOTOGRAPH"] and PIL_AVAILABLE:
            try:
                with PILImage.open(file_path) as img:
                    img = img.convert("RGB")
                    img.thumbnail((max_size, max_size))
                    img.save(output_path, "JPEG", quality=85)
                    w, h = img.size
                    return DerivativeResult(
                        derivative_type="THUMBNAIL",
                        output_path=output_path,
                        file_size=os.path.getsize(output_path),
                        checksum_sha256=self._calculate_sha256(output_path),
                        mime_type="image/jpeg",
                        width=w,
                        height=h
                    )
            except Exception as e:
                logger.error(f"Native image thumbnail generation failed: {e}")

        # Video thumbnail via OpenCV
        if media_type == "VIDEO" and OPENCV_AVAILABLE:
            try:
                cap = cv2.VideoCapture(file_path)
                if cap.isOpened():
                    # Read frame at ~1.0 second or first frame
                    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
                    cap.set(cv2.CAP_PROP_POS_FRAMES, int(fps * 1.0))
                    success, frame = cap.read()
                    if not success:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        success, frame = cap.read()
                    cap.release()

                    if success and frame is not None:
                        h, w = frame.shape[:2]
                        scale = min(max_size / float(w), max_size / float(h))
                        new_w = max(1, int(w * scale))
                        new_h = max(1, int(h * scale))
                        resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
                        cv2.imwrite(output_path, resized, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                        return DerivativeResult(
                            derivative_type="THUMBNAIL",
                            output_path=output_path,
                            file_size=os.path.getsize(output_path),
                            checksum_sha256=self._calculate_sha256(output_path),
                            mime_type="image/jpeg",
                            width=new_w,
                            height=new_h
                        )
            except Exception as e:
                logger.error(f"Native video thumbnail generation failed: {e}")

        # Audio placeholder waveform thumbnail via Pillow
        if media_type == "AUDIO" and PIL_AVAILABLE:
            try:
                img = PILImage.new("RGB", (max_size, int(max_size * 0.6)), color=(27, 42, 74)) # Dark archival navy
                img.save(output_path, "JPEG", quality=85)
                return DerivativeResult(
                    derivative_type="THUMBNAIL",
                    output_path=output_path,
                    file_size=os.path.getsize(output_path),
                    checksum_sha256=self._calculate_sha256(output_path),
                    mime_type="image/jpeg",
                    width=max_size,
                    height=int(max_size * 0.6)
                )
            except Exception as e:
                logger.error(f"Native audio thumbnail creation failed: {e}")

        return None

    def extract_poster_frame(
        self,
        file_path: str,
        output_path: str,
        timestamp_sec: float = 1.0
    ) -> Optional[DerivativeResult]:
        if not OPENCV_AVAILABLE:
            return None

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        try:
            cap = cv2.VideoCapture(file_path)
            if not cap.isOpened():
                return None

            fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
            target_frame = int(fps * timestamp_sec)
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
            success, frame = cap.read()
            if not success:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                success, frame = cap.read()
            cap.release()

            if success and frame is not None:
                h, w = frame.shape[:2]
                cv2.imwrite(output_path, frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
                return DerivativeResult(
                    derivative_type="POSTER_FRAME",
                    output_path=output_path,
                    file_size=os.path.getsize(output_path),
                    checksum_sha256=self._calculate_sha256(output_path),
                    mime_type="image/jpeg",
                    width=w,
                    height=h
                )
        except Exception as e:
            logger.error(f"Native poster frame extraction failed: {e}")
        return None

    def generate_poster(
        self,
        file_path: str,
        output_path: str,
        timestamp: float = 1.0
    ) -> Optional[DerivativeResult]:
        return self.extract_poster_frame(file_path, output_path, timestamp_sec=timestamp)

    def generate_waveform(
        self,
        file_path: str,
        output_json_path: Optional[str] = None,
        num_points: int = 150
    ) -> Optional[List[float]]:
        """
        Calculates normalized waveform peaks (0.0 to 1.0) from a WAV audio file
        and persists them as a JSON array for interactive waveform visualizers.
        """
        ext = os.path.splitext(file_path)[1].lower()
        peaks = []

        if ext == ".wav":
            try:
                with wave.open(file_path, "rb") as wf:
                    n_channels = wf.getnchannels()
                    samp_width = wf.getsampwidth()
                    n_frames = wf.getnframes()
                    if n_frames == 0:
                        return [0.0] * num_points

                    chunk_size = max(1, n_frames // num_points)
                    fmt = "<h" if samp_width == 2 else "<b" if samp_width == 1 else "<i"
                    max_val = 32767.0 if samp_width == 2 else 127.0 if samp_width == 1 else 2147483647.0

                    for _ in range(num_points):
                        raw_data = wf.readframes(chunk_size)
                        if not raw_data:
                            peaks.append(0.0)
                            continue
                        
                        count = len(raw_data) // (samp_width * n_channels)
                        if count == 0:
                            peaks.append(0.0)
                            continue

                        # Read first channel samples
                        step = samp_width * n_channels
                        max_amp = 0
                        for i in range(0, len(raw_data), step):
                            sub = raw_data[i:i + samp_width]
                            if len(sub) == samp_width:
                                val = abs(struct.unpack(fmt, sub)[0])
                                if val > max_amp:
                                    max_amp = val

                        peaks.append(round(min(1.0, max_amp / max_val), 3))
            except Exception as e:
                logger.error(f"Waveform peak extraction failed: {e}")

        if not peaks:
            # Synthetic default zero waveform if unparsable
            peaks = [0.0] * num_points

        # Persist waveform JSON if output path provided
        if output_json_path:
            os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
            with open(output_json_path, "w", encoding="utf-8") as f:
                json.dump(peaks, f)

        return peaks

    def generate_audio_waveform(self, file_path: str, num_points: int = 100) -> List[float]:
        return self.generate_waveform(file_path, output_json_path=None, num_points=num_points) or []
