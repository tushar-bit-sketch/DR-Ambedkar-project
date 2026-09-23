"""
Caption Generation & Timestamp Conversion Service.
Supports WebVTT and SRT standard archival formats.
Validates timestamp consistency, non-overlapping constraints, and non-empty texts.
"""
import re
from typing import List, Dict, Any, Tuple, Optional


def seconds_to_timestamp_str(seconds: float, separator: str = ".") -> str:
    """
    Converts float seconds into HH:MM:SS.mmm (WebVTT) or HH:MM:SS,mmm (SRT).
    """
    if seconds < 0:
        seconds = 0.0
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        millis = 999
    return f"{hrs:02d}:{mins:02d}:{secs:02d}{separator}{millis:03d}"


def timestamp_str_to_seconds(ts_str: str) -> float:
    """
    Converts HH:MM:SS.mmm or MM:SS.mmm or seconds into float seconds.
    """
    ts_str = ts_str.strip().replace(",", ".")
    parts = ts_str.split(":")
    if len(parts) == 3:
        hrs, mins, secs = parts
        return float(hrs) * 3600 + float(mins) * 60 + float(secs)
    elif len(parts) == 2:
        mins, secs = parts
        return float(mins) * 60 + float(secs)
    else:
        return float(ts_str)


def _get_val(item: Any, key: str, default: Any = None) -> Any:
    if isinstance(item, dict):
        return item.get(key, default)
    return getattr(item, key, default)


class CaptionService:
    @staticmethod
    def validate_segments(segments: List[Any]) -> List[str]:
        """
        Validates timing integrity across transcript segments.
        Returns a list of error/warning strings.
        """
        errors = []
        prev_end = -1.0

        for idx, seg in enumerate(segments):
            start = float(_get_val(seg, "start_time", 0.0) or 0.0)
            end = float(_get_val(seg, "end_time", 0.0) or 0.0)
            text = (str(_get_val(seg, "text", "") or "")).strip()

            if start < 0:
                errors.append(f"Segment #{idx + 1}: Start time cannot be negative ({start}s).")
            if end <= start:
                errors.append(f"Segment #{idx + 1}: End time ({end}s) must be greater than start time ({start}s).")
            if not text:
                errors.append(f"Segment #{idx + 1}: Transcript text cannot be empty.")
            if start < prev_end:
                errors.append(f"Segment #{idx + 1}: Overlapping timing detected. Starts at {start}s before previous end {prev_end}s.")

            prev_end = max(prev_end, end)

        return errors

    @classmethod
    def validate_timing(cls, segments: List[Any]) -> None:
        """
        Validates timing and raises ValueError if invalid.
        """
        errors = cls.validate_segments(segments)
        if errors:
            raise ValueError(f"Timing validation failure: {'; '.join(errors)}")

    @classmethod
    def generate_webvtt(cls, segments: List[Any], title: Optional[str] = None) -> str:
        """
        Generates standard WebVTT subtitle file content from segments.
        """
        lines = ["WEBVTT", ""]
        if title:
            lines.append(f"NOTE Title: {title}")
            lines.append("")

        for i, seg in enumerate(segments):
            start_s = float(_get_val(seg, "start_time", 0.0) or 0.0)
            end_s = float(_get_val(seg, "end_time", 0.0) or 0.0)
            text = str(_get_val(seg, "text", "") or "")
            speaker = _get_val(seg, "speaker_label", None)

            start_str = seconds_to_timestamp_str(start_s, ".")
            end_str = seconds_to_timestamp_str(end_s, ".")

            lines.append(str(i + 1))
            lines.append(f"{start_str} --> {end_str}")
            if speaker and speaker != "UNKNOWN":
                lines.append(f"<v {speaker}>{text}")
            else:
                lines.append(text)
            lines.append("")

        return "\n".join(lines)

    @classmethod
    def generate_srt(cls, segments: List[Any]) -> str:
        """
        Generates SubRip (.srt) subtitle file content from segments.
        """
        lines = []
        for i, seg in enumerate(segments):
            start_s = float(_get_val(seg, "start_time", 0.0) or 0.0)
            end_s = float(_get_val(seg, "end_time", 0.0) or 0.0)
            text = str(_get_val(seg, "text", "") or "")
            speaker = _get_val(seg, "speaker_label", None)

            start_str = seconds_to_timestamp_str(start_s, ",")
            end_str = seconds_to_timestamp_str(end_s, ",")

            lines.append(str(i + 1))
            lines.append(f"{start_str} --> {end_str}")
            if speaker and speaker != "UNKNOWN":
                lines.append(f"{speaker}: {text}")
            else:
                lines.append(text)
            lines.append("")

        return "\n".join(lines)

    @classmethod
    def parse_webvtt(cls, vtt_text: str) -> List[Dict[str, Any]]:
        """
        Parses raw WebVTT text into segment dictionaries.
        """
        segments = []
        blocks = re.split(r'\n\s*\n', vtt_text.strip())
        seq = 1

        for b in blocks:
            lines = [l.strip() for l in b.split("\n") if l.strip()]
            if not lines or lines[0].startswith("WEBVTT") or lines[0].startswith("NOTE"):
                continue

            time_line_idx = 0
            if "-->" not in lines[0] and len(lines) > 1 and "-->" in lines[1]:
                time_line_idx = 1

            if time_line_idx < len(lines) and "-->" in lines[time_line_idx]:
                time_line = lines[time_line_idx]
                parts = time_line.split("-->")
                start_str = parts[0].strip().split()[0]
                end_str = parts[1].strip().split()[0]

                start_s = timestamp_str_to_seconds(start_str)
                end_s = timestamp_str_to_seconds(end_str)

                text_lines = lines[time_line_idx + 1:]
                full_text = " ".join(text_lines)

                # Check speaker tag <v Speaker> or Speaker:
                speaker = "UNKNOWN"
                sp_match = re.match(r'<v\s+([^>]+)>(.*)', full_text)
                if sp_match:
                    speaker = sp_match.group(1).strip()
                    full_text = sp_match.group(2).strip()
                else:
                    colon_match = re.match(r'^([A-Za-z0-9_-]+):\s*(.*)', full_text)
                    if colon_match:
                        speaker = colon_match.group(1).strip()
                        full_text = colon_match.group(2).strip()

                segments.append({
                    "sequence": seq,
                    "start_time": start_s,
                    "end_time": end_s,
                    "start_timestamp_str": seconds_to_timestamp_str(start_s, "."),
                    "end_timestamp_str": seconds_to_timestamp_str(end_s, "."),
                    "text": full_text,
                    "speaker_label": speaker,
                    "confidence": 1.0,
                    "verification_status": "APPROVED"
                })
                seq += 1

        return segments

    @classmethod
    def parse_srt(cls, srt_text: str) -> List[Dict[str, Any]]:
        """
        Parses raw SubRip SRT text into segment dictionaries.
        """
        segments = []
        blocks = re.split(r'\n\s*\n', srt_text.strip())
        seq = 1

        for b in blocks:
            lines = [l.strip() for l in b.split("\n") if l.strip()]
            if not lines:
                continue

            time_line_idx = 0
            if "-->" not in lines[0] and len(lines) > 1 and "-->" in lines[1]:
                time_line_idx = 1

            if time_line_idx < len(lines) and "-->" in lines[time_line_idx]:
                time_line = lines[time_line_idx]
                parts = time_line.split("-->")
                start_str = parts[0].strip().split()[0]
                end_str = parts[1].strip().split()[0]

                start_s = timestamp_str_to_seconds(start_str)
                end_s = timestamp_str_to_seconds(end_str)

                text_lines = lines[time_line_idx + 1:]
                full_text = " ".join(text_lines)

                speaker = "UNKNOWN"
                colon_match = re.match(r'^([A-Za-z0-9_-]+):\s*(.*)', full_text)
                if colon_match:
                    speaker = colon_match.group(1).strip()
                    full_text = colon_match.group(2).strip()

                segments.append({
                    "sequence": seq,
                    "start_time": start_s,
                    "end_time": end_s,
                    "start_timestamp_str": seconds_to_timestamp_str(start_s, ","),
                    "end_timestamp_str": seconds_to_timestamp_str(end_s, ","),
                    "text": full_text,
                    "speaker_label": speaker,
                    "confidence": 1.0,
                    "verification_status": "APPROVED"
                })
                seq += 1

        return segments
