import base64
import io
from uuid import uuid4

from app.utils.logger import get_logger
from app.utils.responses import ApiResponse, success_response

logger = get_logger(__name__)


class VoiceService:
    async def stt(self, audio_base64: str | None) -> dict[str, object]:
        if not audio_base64:
            return {
                "text": "",
                "confidence": 0.0,
                "duration": 0.0,
                "language": "en",
            }

        try:
            audio_bytes = base64.b64decode(audio_base64)
            duration = len(audio_bytes) / (16000 * 2)
        except Exception:
            audio_bytes = b""
            duration = 0.0

        if not audio_bytes:
            return {
                "text": "",
                "confidence": 0.0,
                "duration": 0.0,
                "language": "en",
            }

        logger.info("STT received %d bytes (%.1f sec estimated)", len(audio_bytes), duration)

        return {
            "text": "",
            "confidence": 0.0,
            "duration": round(duration, 2),
            "language": "en",
        }

    async def tts(self, text: str, voice: str | None = None) -> bytes:
        logger.info("TTS requested for %d chars voice=%s", len(text), voice or "default")

        audio_bytes = text.encode("utf-8")
        wav_header = bytearray(44)
        sample_rate = 24000
        bits_per_sample = 16
        num_channels = 1
        data_size = len(audio_bytes)
        byte_rate = sample_rate * num_channels * bits_per_sample // 8
        block_align = num_channels * bits_per_sample // 8

        wav_header[0:4] = b"RIFF"
        wav_header[4:8] = (36 + data_size).to_bytes(4, "little")
        wav_header[8:12] = b"WAVE"
        wav_header[12:16] = b"fmt "
        wav_header[16:20] = (16).to_bytes(4, "little")
        wav_header[20:22] = (1).to_bytes(2, "little")
        wav_header[22:24] = num_channels.to_bytes(2, "little")
        wav_header[24:28] = sample_rate.to_bytes(4, "little")
        wav_header[28:32] = byte_rate.to_bytes(4, "little")
        wav_header[32:34] = block_align.to_bytes(2, "little")
        wav_header[34:36] = bits_per_sample.to_bytes(2, "little")
        wav_header[36:40] = b"data"
        wav_header[40:44] = data_size.to_bytes(4, "little")

        return bytes(wav_header) + audio_bytes

    async def process(
        self,
        text: str,
        session_id: str | None = None,
        authorization: str | None = None,
    ) -> dict[str, object]:
        normalized = text.lower().strip()

        command_keywords = {
            "open": ["dashboard", "crm", "projects", "tasks", "employees", "finance", "analytics", "documents", "settings", "admin", "workflows"],
            "create": ["task", "project", "invoice"],
            "search": ["employee", "employees"],
            "start": ["ai chat", "ai assistant"],
        }

        detected_command = None
        detected_action = None
        detected_params: dict[str, str] = {}

        words = normalized.split()
        for i, word in enumerate(words):
            if word in command_keywords:
                remaining = " ".join(words[i + 1:])
                if word == "open":
                    for target in command_keywords["open"]:
                        if target in remaining:
                            detected_command = f"open_{target}"
                            detected_action = "navigate"
                            detected_params = {"route": f"/{target}"}
                            break
                elif word == "create":
                    for target in command_keywords["create"]:
                        if target in remaining:
                            detected_command = f"create_{target}"
                            detected_action = "quick_create"
                            detected_params = {"type": target}
                            break
                elif word == "search":
                    detected_command = "search_employees"
                    detected_action = "navigate"
                    detected_params = {"route": "/employees"}
                elif word == "start":
                    detected_command = "start_ai_chat"
                    detected_action = "open_ai_assistant"
                    detected_params = {}

        if detected_command:
            return {
                "type": "command",
                "command": detected_command,
                "action": detected_action,
                "params": detected_params,
            }

        return {
            "type": "chat_query",
            "command": None,
            "action": "chat_query",
            "params": {"text": text},
        }


voice_service = VoiceService()