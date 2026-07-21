from fastapi import APIRouter

from app.models.analytics import AnalyticsPredictionRequest, AnalyticsPredictionResponse
from app.services.analytics_service import analytics_service
from app.utils.responses import ApiResponse, success_response

router = APIRouter()


@router.post("/predict", response_model=ApiResponse[AnalyticsPredictionResponse])
async def predict_analytics(payload: AnalyticsPredictionRequest) -> ApiResponse[AnalyticsPredictionResponse]:
    result = await analytics_service.predict(
        section=payload.section,
        date_range=payload.date_range,
        department=payload.department,
        metric=payload.metric,
    )
    response = AnalyticsPredictionResponse(
        section=result["section"],
        data=result["data"],
        generated_at="2025-01-01T00:00:00Z",
    )
    return success_response("Analytics prediction generated", response)