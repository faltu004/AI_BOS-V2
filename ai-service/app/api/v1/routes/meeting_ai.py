from fastapi import APIRouter

from app.api.dependencies import get_authorization_header
from app.models.meeting_ai import MeetingAIData, MeetingReport, MeetingSummary, MeetingTranscription
from app.services.meeting_ai_service import meeting_ai_service
from app.utils.responses import ApiResponse, success_response

router = APIRouter()


@router.post("/{meeting_id}/transcribe", response_model=ApiResponse[MeetingTranscription])
async def transcribe_meeting(meeting_id: str, authorization: str | None = None) -> ApiResponse[MeetingTranscription]:
    result = await meeting_ai_service.transcribe(meeting_id)
    return success_response("Meeting transcribed", result)


@router.post("/{meeting_id}/summarize", response_model=ApiResponse[MeetingSummary])
async def summarize_meeting(meeting_id: str, authorization: str | None = None) -> ApiResponse[MeetingSummary]:
    result = await meeting_ai_service.summarize(meeting_id, "Sample transcription text")
    return success_response("Meeting summarized", result)


@router.post("/{meeting_id}/extract-actions", response_model=ApiResponse[list[dict]])
async def extract_action_items(meeting_id: str, authorization: str | None = None) -> ApiResponse[list[dict]]:
    result = await meeting_ai_service.extract_action_items(meeting_id, "Sample transcription text")
    return success_response("Action items extracted", [item.model_dump(mode="json") for item in result])


@router.post("/{meeting_id}/extract-decisions", response_model=ApiResponse[list[dict]])
async def extract_decisions(meeting_id: str, authorization: str | None = None) -> ApiResponse[list[dict]]:
    result = await meeting_ai_service.extract_decisions(meeting_id, "Sample transcription text")
    return success_response("Decisions extracted", [item.model_dump(mode="json") for item in result])


@router.post("/{meeting_id}/generate-report", response_model=ApiResponse[MeetingReport])
async def generate_meeting_report(meeting_id: str, report_type: str = "executive", authorization: str | None = None) -> ApiResponse[MeetingReport]:
    ai_data = await meeting_ai_service.process_meeting(meeting_id)
    result = await meeting_ai_service.generate_report(meeting_id, ai_data, report_type)
    return success_response("Report generated", result)


@router.get("/{meeting_id}", response_model=ApiResponse[MeetingAIData])
async def get_meeting_ai_data(meeting_id: str, authorization: str | None = None) -> ApiResponse[MeetingAIData]:
    result = await meeting_ai_service.process_meeting(meeting_id)
    return success_response("Meeting AI data retrieved", result)