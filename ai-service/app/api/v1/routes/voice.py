from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.api.dependencies import get_authorization_header
from app.models.voice import VoiceProcessRequest, VoiceSttRequest, VoiceSttResponse, VoiceTtsRequest
from app.services.voice_service import voice_service
from app.utils.responses import ApiResponse, success_response

router = APIRouter()


@router.post("/stt", response_model=ApiResponse[VoiceSttResponse])
async def speech_to_text(
    payload: VoiceSttRequest,
) -> ApiResponse[VoiceSttResponse]:
    result = await voice_service.stt(payload.audio_base64)
    response = VoiceSttResponse(
        text=result["text"],
        confidence=result["confidence"],
        duration=result["duration"],
        language=result["language"],
    )
    return success_response("Speech-to-text processed", response)


@router.post("/tts")
async def text_to_speech(
    payload: VoiceTtsRequest,
) -> Response:
    audio_data = await voice_service.tts(payload.text, payload.voice)
    return Response(
        content=audio_data,
        media_type="audio/wav",
        headers={
            "Content-Disposition": 'inline; filename="response.wav"',
            "Content-Length": str(len(audio_data)),
        },
    )


@router.post("/process")
async def process_voice_input(
    payload: VoiceProcessRequest,
    authorization: str | None = Depends(get_authorization_header),
) -> ApiResponse[dict[str, object]]:
    result = await voice_service.process(
        text=payload.text,
        session_id=payload.session_id,
        authorization=authorization or payload.authorization,
    )
    return success_response("Voice input processed", result)