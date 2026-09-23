# Phase 8 Media Processing: Provider Abstraction & Native Fallback Engine

## 1. Provider Availability & Honest Degradation Architecture

A foundational tenet of the National Memorial Archival System is **absolute honesty regarding system capabilities**. The platform rejects simulation, faking, or synthetic generation of technical media attributes or historical transcripts.

### Environment Capability Matrix (Audited & Verified)

| Component | Tool / Package | Host Status | Provider Class | Execution Mode |
|---|---|---|---|---|
| **Video Inspection** | FFprobe | `UNAVAILABLE` | `FFmpegMediaProcessor` | Falls back to `NativeMediaProcessor` (OpenCV) |
| **Video Poster Frame** | FFmpeg | `UNAVAILABLE` | `FFmpegMediaProcessor` | Falls back to `NativeMediaProcessor` (OpenCV) |
| **Image Inspection** | Pillow / FFprobe | `OPERATIONAL` | `NativeMediaProcessor` | Direct genuine execution via Pillow (`PIL`) |
| **Image Thumbnailing** | Pillow / FFmpeg | `OPERATIONAL` | `NativeMediaProcessor` | Direct genuine execution via Pillow (`PIL`) |
| **Audio Inspection** | Python `wave` / FFprobe | `OPERATIONAL` | `NativeMediaProcessor` | Direct genuine execution via standard library `wave` |
| **Waveform Generation** | Python `wave` / FFmpeg | `OPERATIONAL` | `NativeMediaProcessor` | Direct genuine execution via standard library `wave` + `struct` |
| **Speech-to-Text (STT)**| OpenAI Whisper | `UNAVAILABLE` | `WhisperTranscriptionProvider`| Strictly raises `TranscriptionUnavailableError`; Curator import active |

---

## 2. Dynamic Provider Diagnostics (`provider_status.py`)

The platform performs active, non-cached diagnostics on startup and upon invocation of `/api/v1/media/diagnostics`:
```python
def get_media_diagnostics() -> Dict[str, Any]:
    ffmpeg_avail = is_ffmpeg_installed()
    whisper_avail = is_whisper_installed()
    
    return {
        "ffmpeg": {
            "is_operational": ffmpeg_avail,
            "status": "OPERATIONAL" if ffmpeg_avail else "UNAVAILABLE",
            "message": "FFmpeg binary operational." if ffmpeg_avail else "FFmpeg binary is not installed on host. Native OpenCV/Pillow fallbacks active."
        },
        "whisper": {
            "is_operational": whisper_avail,
            "status": "OPERATIONAL" if whisper_avail else "UNAVAILABLE",
            "message": "Whisper STT operational." if whisper_avail else "Whisper model is not installed. Speech-to-text disabled; manual curator import enabled."
        },
        "native_fallbacks": {
            "opencv": OPENCV_AVAILABLE,
            "pillow": PIL_AVAILABLE,
            "wave": True
        }
    }
```

---

## 3. Native Python Media Processor (`NativeMediaProcessor`)

When external binaries (`ffmpeg`, `ffprobe`) are absent, `NativeMediaProcessor` executes genuine processing tasks without mock data.

### A. Video Inspection & Poster Frame Extraction (OpenCV)
- **Dimensions & Framerate:** Utilizes `cv2.VideoCapture(file_path)` to read `CAP_PROP_FRAME_WIDTH`, `CAP_PROP_FRAME_HEIGHT`, `CAP_PROP_FPS`, and `CAP_PROP_FRAME_COUNT`.
- **Duration Calculation:** Calculates exact duration as $T = \frac{\text{frame\_count}}{\text{fps}}$.
- **Poster Extraction:** Seeks to the specified timestamp (default $1.0\text{s}$) via `cap.set(cv2.CAP_PROP_POS_FRAMES, int(fps * timestamp_sec))` and encodes the target frame to an isolated JPEG derivative using `cv2.imwrite`.

### B. Image Inspection & Thumbnail Generation (Pillow)
- **Inspection:** Opens image using `PIL.Image.open()`, extracts format (`PNG`, `JPEG`, `TIFF`, `WEBP`), dimensions, and color mode (`RGB`, `RGBA`, `L`).
- **Thumbnail Scaling:** Creates scaled, high-quality thumbnails adhering to the bounding box ($320\text{px} \times 320\text{px}$) using `img.thumbnail((max_size, max_size))` with Lanczos filtering, saving to `storage/media/thumbnails/`.

### C. Audio Inspection & Waveform Peak Extraction (Python Standard Library `wave`)
- **Inspection:** Opens RIFF/WAV files via `wave.open(file_path, "rb")`. Inspects `getnchannels()`, `getsampwidth()`, `getframerate()`, and `getnframes()`. Computes bitrate as $\text{sample\_rate} \times \text{channels} \times \text{sample\_width} \times 8$.
- **RMS Waveform Calculation:**
  - Divides total audio frames into $N = 150$ uniform time chunks ($\text{chunk\_size} = \frac{\text{n\_frames}}{N}$).
  - Unpacks signed binary PCM audio samples using `struct.unpack("<h")` (16-bit) or `struct.unpack("<i")` (24/32-bit).
  - Finds maximum absolute sample amplitude per chunk and normalizes to $[0.0, 1.0]$.
  - Persists normalized peaks as a compact JSON array in `storage/media/waveforms/<archive_id>_waveform.json` for responsive client-side waveform rendering.

---

## 4. Security & Isolation Controls

1. **Subprocess Invocation Guard:** When `FFmpegMediaProcessor` is invoked, subprocess calls strictly use argument lists (`["ffmpeg", "-i", input_path, ...]`) with `shell=False`. Shell expansion, piping, and command injection attacks are impossible.
2. **Format Allowlist:** Only verified extensions (`mp4`, `webm`, `mov`, `mkv`, `avi`, `mp3`, `wav`, `m4a`, `flac`, `ogg`, `jpg`, `jpeg`, `png`, `webp`, `tiff`, `tif`) are accepted. Arbitrary binary uploads or executable scripts are rejected with `HTTP 400 Bad Request`.
3. **Master Directory Isolation:** Derivatives and temporary files are strictly written to `storage/media/derivatives/`, `thumbnails/`, `posters/`, and `waveforms/`. Writing to `storage/media/masters/` outside the initial accession service is strictly forbidden.
