from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.api.dependencies import get_authorization_header
from app.models.rag import (
    KnowledgeFile,
    KnowledgePermissions,
    RagAskRequest,
    RagAskResponse,
    RagQueryRequest,
    RagQueryResponse,
)
from app.services.rag_service import rag_service
from app.utils.errors import AppError
from app.utils.responses import ApiResponse, success_response

router = APIRouter()


def parse_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def parse_permissions(
    visibility: str,
    allowed_roles: str,
    allowed_user_ids: str,
) -> KnowledgePermissions:
    if visibility not in {"private", "workspace", "restricted"}:
        raise AppError(
            "Invalid knowledge file visibility",
            status.HTTP_400_BAD_REQUEST,
            "INVALID_VISIBILITY",
        )
    return KnowledgePermissions(
        visibility=visibility,
        allowed_roles=parse_csv(allowed_roles),
        allowed_user_ids=parse_csv(allowed_user_ids),
    )


@router.post("/upload", response_model=ApiResponse[KnowledgeFile])
async def upload_knowledge_file(
    file: UploadFile = File(...),
    visibility: str = Form("workspace"),
    allowed_roles: str = Form(""),
    allowed_user_ids: str = Form(""),
    authorization: str | None = Depends(get_authorization_header),
) -> ApiResponse[KnowledgeFile]:
    permissions = parse_permissions(visibility, allowed_roles, allowed_user_ids)
    knowledge_file = await rag_service.ingest(file, permissions, authorization)
    return success_response("Knowledge file uploaded and embedded", knowledge_file)


@router.get("/files", response_model=ApiResponse[list[KnowledgeFile]])
async def list_knowledge_files(
    authorization: str | None = Depends(get_authorization_header),
) -> ApiResponse[list[KnowledgeFile]]:
    files = await rag_service.list_files(authorization)
    return success_response("Knowledge files fetched", files)


@router.delete("/files/{document_id}", response_model=ApiResponse[dict[str, bool]])
async def delete_knowledge_file(
    document_id: str,
    authorization: str | None = Depends(get_authorization_header),
) -> ApiResponse[dict[str, bool]]:
    result = await rag_service.delete_file(document_id, authorization)
    return success_response("Knowledge file deleted", result)


@router.post("/query", response_model=ApiResponse[RagQueryResponse])
async def query_rag(
    payload: RagQueryRequest,
    authorization: str | None = Depends(get_authorization_header),
) -> ApiResponse[RagQueryResponse]:
    documents = await rag_service.search(
        query=payload.query,
        top_k=payload.top_k,
        authorization=authorization,
        document_ids=payload.document_ids,
    )
    return success_response("Semantic search completed", RagQueryResponse(documents=documents))


@router.post("/ask", response_model=ApiResponse[RagAskResponse])
async def ask_rag(
    payload: RagAskRequest,
    authorization: str | None = Depends(get_authorization_header),
) -> ApiResponse[RagAskResponse]:
    result = await rag_service.ask(
        question=payload.question,
        mode=payload.mode,
        top_k=payload.top_k,
        authorization=authorization,
        document_ids=payload.document_ids,
    )
    return success_response("RAG answer generated", result)


@router.post("/summarize", response_model=ApiResponse[RagAskResponse])
async def summarize_documents(
    payload: RagAskRequest,
    authorization: str | None = Depends(get_authorization_header),
) -> ApiResponse[RagAskResponse]:
    result = await rag_service.ask(
        question=payload.question,
        mode="summarize",
        top_k=payload.top_k,
        authorization=authorization,
        document_ids=payload.document_ids,
    )
    return success_response("Document summary generated", result)


@router.post("/explain", response_model=ApiResponse[RagAskResponse])
async def explain_documents(
    payload: RagAskRequest,
    authorization: str | None = Depends(get_authorization_header),
) -> ApiResponse[RagAskResponse]:
    result = await rag_service.ask(
        question=payload.question,
        mode="explain",
        top_k=payload.top_k,
        authorization=authorization,
        document_ids=payload.document_ids,
    )
    return success_response("Document explanation generated", result)
