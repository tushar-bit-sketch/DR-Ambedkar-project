"""
Windows System.Speech SAPI TTS Provider.
Strictly adheres to Condition 6 & 7:
- Uses Windows System.Speech for native English archival narration.
- Accurately inspects installed SAPI voices.
- Does NOT claim multilingual TTS support unless verified.
- REFUSES to silently use English voice for Tamil/Hindi/Marathi; returns TTS_UNAVAILABLE.
- Calculates genuine duration and SHA-256 checksum on output WAV.
"""

import os
import wave
import hashlib
import logging
import subprocess
import tempfile
from typing import List, Dict, Any, Tuple, Optional

from app.services.tts.base import (
    BaseTTSProvider, TTSUnavailableError, UnsupportedVoiceError
)

logger = logging.getLogger("archive.tts.windows_sapi")

class WindowsSAPITTSProvider(BaseTTSProvider):
    """
    Windows native System.Speech TTS engine.
    Executes offline without external API dependencies.
    """

    def __init__(self):
        self._provider_name = "windows_sapi"
        self._installed_voices: List[Dict[str, Any]] = []
        self._supported_languages: List[str] = []
        self._is_available = False
        self._status = "UNINITIALIZED"
        self._discover_voices()

    def _discover_voices(self):
        """Inspects actual installed SAPI voices via PowerShell."""
        cmd = [
            "powershell.exe",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; "
            "Add-Type -AssemblyName System.Speech; "
            "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            "foreach ($v in $synth.GetInstalledVoices()) { "
            "  $info = $v.VoiceInfo; "
            "  Write-Output ($info.Name + '|' + $info.Culture.Name + '|' + $info.Gender.ToString()); "
            "}"
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=5, check=False)
            if res.returncode == 0 and res.stdout.strip():
                lines = [line.strip() for line in res.stdout.strip().splitlines() if line.strip()]
                voices = []
                langs = set()
                for line in lines:
                    parts = line.split("|")
                    if len(parts) >= 3:
                        name, culture, gender = parts[0], parts[1], parts[2]
                        lang_code = culture.split("-")[0].lower() if "-" in culture else culture.lower()
                        langs.add(lang_code)
                        voices.append({
                            "name": name,
                            "culture": culture,
                            "language": lang_code,
                            "gender": gender
                        })
                self._installed_voices = voices
                self._supported_languages = sorted(list(langs))
                self._is_available = len(self._installed_voices) > 0
                self._status = "READY" if self._is_available else "VOICE_UNAVAILABLE"
            else:
                self._installed_voices = []
                self._supported_languages = []
                self._is_available = False
                self._status = "TTS_UNAVAILABLE"
        except Exception as e:
            logger.warning(f"Error discovering Windows SAPI voices: {e}")
            self._installed_voices = []
            self._supported_languages = []
            self._is_available = False
            self._status = "TTS_UNAVAILABLE"

    @property
    def provider_name(self) -> str:
        return self._provider_name

    @property
    def is_available(self) -> bool:
        return self._is_available

    @property
    def status(self) -> str:
        return self._status

    def supported_languages(self) -> List[str]:
        return list(self._supported_languages)

    def available_voices(self) -> List[Dict[str, Any]]:
        return list(self._installed_voices)

    def _is_indic_language(self, language: str) -> bool:
        lang_lower = language.lower().strip()
        return lang_lower in ("hi", "hindi", "mr", "marathi", "ta", "tamil", "sa", "sanskrit", "bn", "bengali")

    def synthesize(
        self,
        text: str,
        language: str,
        output_file_path: str,
        voice: Optional[str] = None
    ) -> Tuple[str, float, int, str]:
        """
        Synthesizes text into a standard WAV file.
        Strictly refuses to synthesize Indic text with English voice.
        """
        lang_norm = language.lower().strip()
        lang_prefix = lang_norm[:2] if len(lang_norm) >= 2 else lang_norm

        # Check if the requested language is supported by installed voices
        has_voice_for_lang = any(v["language"] == lang_prefix for v in self._installed_voices)

        if not has_voice_for_lang:
            if self._is_indic_language(lang_norm):
                # Condition 6 & 7: Strictly refuse silent English fallback for Indic languages
                raise TTSUnavailableError(
                    f"TTS_UNAVAILABLE: No native SAPI voice installed for Indic language '{language}'. "
                    f"Installed voices support: {self._supported_languages}. Silent fallback to English voice is prohibited."
                )
            else:
                raise TTSUnavailableError(
                    f"TTS_UNAVAILABLE: No voice installed for requested language '{language}'."
                )

        if not text or not text.strip():
            raise ValueError("Cannot synthesize empty text.")

        os.makedirs(os.path.dirname(os.path.abspath(output_file_path)), exist_ok=True)

        # Build PowerShell speech synthesis command
        # Use temp script or base64 to avoid quote escaping issues
        clean_text = text.replace('"', '""').replace("`", "``").replace("$", "`$")
        voice_selection = f"$synth.SelectVoice('{voice}'); " if voice else ""

        ps_script = (
            "Add-Type -AssemblyName System.Speech; "
            "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            f"{voice_selection}"
            f"$synth.SetOutputToWaveFile('{output_file_path}'); "
            f"$synth.Speak(\"{clean_text}\"); "
            "$synth.Dispose();"
        )

        try:
            res = subprocess.run(
                ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", ps_script],
                capture_output=True,
                text=True,
                timeout=30,
                check=False
            )
            if res.returncode != 0:
                raise TTSUnavailableError(f"Windows SAPI synthesis failed: {res.stderr}")

            if not os.path.exists(output_file_path) or os.path.getsize(output_file_path) == 0:
                raise TTSUnavailableError("Windows SAPI synthesis produced empty or missing audio file.")

            # Calculate exact duration from WAV header
            file_size = os.path.getsize(output_file_path)
            duration = 0.0
            try:
                with wave.open(output_file_path, "rb") as wf:
                    frames = wf.getnframes()
                    rate = wf.getframerate()
                    duration = round(frames / float(rate), 2)
            except Exception as e:
                logger.warning(f"Could not calculate WAV duration: {e}")
                # Approximate duration based on standard 16kHz 16-bit mono PCM if needed
                duration = round(file_size / (16000 * 2), 2)

            # Compute SHA-256 checksum
            with open(output_file_path, "rb") as f:
                sha256 = hashlib.sha256(f.read()).hexdigest()

            return output_file_path, duration, file_size, sha256

        except subprocess.TimeoutExpired:
            raise TTSUnavailableError("Windows SAPI synthesis timed out.")
        except Exception as e:
            if isinstance(e, TTSUnavailableError):
                raise
            raise TTSUnavailableError(f"Windows SAPI error: {e}")

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "status": self._status,
            "is_available": self._is_available,
            "supported_languages": self._supported_languages,
            "installed_voices": self._installed_voices,
            "multilingual_verified": False # Only English is installed on standard Windows
        }
