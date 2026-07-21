from fastapi import APIRouter

from app.api.dependencies import get_authorization_header
from app.models.report_ai import ReportFormat, ReportRequest, ReportResponse, ScheduledReport
from app.services.report_ai_service import report_ai_service
from app.utils.responses import ApiResponse, success_response

router = APIRouter()


@router.post("/generate", response_model=ApiResponse[ReportResponse])
async def generate_report(request: ReportRequest, authorization: str | None = None) -> ApiResponse[ReportResponse]:
    result = await report_ai_service.generate_report(request)
    return success_response("Report generated", result)


@router.post("/export/{report_id}")
async def export_report(report_id: str, format: ReportFormat = ReportFormat.pdf, authorization: str | None = None):
    data = await report_ai_service.export_report(report_id, format)
    from fastapi.responses import Response
    content_type_map = {
        ReportFormat.pdf: "application/pdf",
        ReportFormat.excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ReportFormat.word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    return Response(content=data, media_type=content_type_map.get(format, "application/octet-stream"), headers={"Content-Disposition": f"attachment; filename={report_id}.{format.value}"})


@router.post("/schedule", response_model=ApiResponse[ScheduledReport])
async def schedule_report(request: ReportRequest, authorization: str | None = None) -> ApiResponse[ScheduledReport]:
    result = await report_ai_service.schedule_report(request)
    return success_response("Report scheduled", result)


@router.get("/scheduled", response_model=ApiResponse[list[ScheduledReport]])
async def list_scheduled_reports(authorization: str | None = None) -> ApiResponse[list[ScheduledReport]]:
    return success_response("Scheduled reports retrieved", [])


@router.delete("/scheduled/{report_id}")
async def delete_scheduled_report(report_id: str, authorization: str | None = None):
    return success_response("Scheduled report deleted", None)