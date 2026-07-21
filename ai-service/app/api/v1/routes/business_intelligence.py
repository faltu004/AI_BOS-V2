from fastapi import APIRouter, Depends

from app.api.dependencies import get_authorization_header
from app.models.business_intelligence import BIQueryRequest, BIQueryResponse
from app.services.business_intelligence_service import business_intelligence_service
from app.utils.responses import ApiResponse, success_response

router = APIRouter()


@router.post("/query", response_model=ApiResponse[BIQueryResponse])
async def query_business_intelligence(
    payload: BIQueryRequest,
    authorization: str | None = Depends(get_authorization_header),
) -> ApiResponse[BIQueryResponse]:
    response = await business_intelligence_service.query(payload, authorization)
    return success_response("Business intelligence generated", response)


@router.post("/summary", response_model=ApiResponse[BIQueryResponse])
async def weekly_business_summary(
    payload: BIQueryRequest,
    authorization: str | None = Depends(get_authorization_header),
) -> ApiResponse[BIQueryResponse]:
    request = payload.model_copy(update={"question": "Create a weekly business summary."})
    response = await business_intelligence_service.query(request, authorization)
    return success_response("Weekly business summary generated", response)
