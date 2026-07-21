from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile, status

from app.models.rag import (
    KnowledgeChunk,
    KnowledgeFile,
    KnowledgePermissions,
    RagAskResponse,
    RagDocument,
)
from app.rag.chunker import document_chunker
from app.rag.document_parser import document_parser
from app.rag.vector_store import PermissionContext, vector_store
from app.services.backend_client import backend_client
from app.services.llm_gateway import llm_gateway
from app.utils.errors import AppError


class RAGService:
    async def permission_context_from_token(self, authorization: str | None) -> PermissionContext:
        if not authorization:
            raise AppError(
                "Authorization is required",
                status.HTTP_401_UNAUTHORIZED,
                "AUTH_REQUIRED",
            )
        profile_response = await backend_client.get_current_user(authorization)
        profile = profile_response.get("data", profile_response)
        return PermissionContext(user_id=str(profile["id"]), role=str(profile["role"]))

    async def ingest(
        self,
        file: UploadFile,
        permissions: KnowledgePermissions,
        authorization: str | None,
    ) -> KnowledgeFile:
        context = await self.permission_context_from_token(authorization)
        if context.role != "Admin":
            raise AppError(
                "Only Admin users can upload knowledge files",
                status.HTTP_403_FORBIDDEN,
                "ADMIN_REQUIRED",
            )

        filename = file.filename or "knowledge-file"
        extension = Path(filename).suffix.lower()
        if extension not in document_parser.supported_extensions:
            raise AppError(
                "Unsupported knowledge file type",
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                "UNSUPPORTED_KNOWLEDGE_FILE",
            )

        content = await file.read()
        if not content:
            raise AppError("Uploaded file is empty", status.HTTP_400_BAD_REQUEST, "EMPTY_FILE")

        sections = document_parser.parse(filename, content)
        chunks = document_chunker.chunk(sections)
        if not chunks:
            raise AppError(
                "No readable text was found in this document",
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "NO_TEXT_EXTRACTED",
            )

        now = datetime.now(UTC).isoformat()
        document_id = str(uuid4())
        knowledge_file = KnowledgeFile(
            id=document_id,
            filename=filename,
            content_type=file.content_type or "application/octet-stream",
            size=len(content),
            status="Ready",
            owner_id=context.user_id,
            owner_role=context.role,
            chunk_count=len(chunks),
            permissions=permissions,
            created_at=now,
            updated_at=now,
        )
        knowledge_chunks = []
        for chunk in chunks:
            knowledge_chunks.append(
                KnowledgeChunk(
                    id=str(uuid4()),
                    document_id=document_id,
                    filename=filename,
                    content=chunk.content,
                    source=f"knowledge://{document_id}",
                    reference=chunk.reference,
                    embedding=await llm_gateway.embed(chunk.content),
                    permissions=permissions,
                    owner_id=context.user_id,
                    owner_role=context.role,
                )
            )
        return vector_store.add_file(knowledge_file, knowledge_chunks)

    async def list_files(self, authorization: str | None) -> list[KnowledgeFile]:
        context = await self.permission_context_from_token(authorization)
        return vector_store.list_files(context)

    async def delete_file(self, document_id: str, authorization: str | None) -> dict[str, bool]:
        context = await self.permission_context_from_token(authorization)
        if context.role != "Admin":
            raise AppError(
                "Only Admin users can delete knowledge files",
                status.HTTP_403_FORBIDDEN,
                "ADMIN_REQUIRED",
            )
        return {"deleted": vector_store.delete_file(document_id)}

    async def search(
        self,
        query: str,
        top_k: int,
        authorization: str | None,
        document_ids: list[str] | None = None,
    ) -> list[RagDocument]:
        context = await self.permission_context_from_token(authorization)
        query_embedding = await llm_gateway.embed(query)
        results = vector_store.search(query_embedding, top_k, context, document_ids)
        return [self._chunk_to_document(chunk, score) for chunk, score in results]

    async def ask(
        self,
        question: str,
        mode: str,
        top_k: int,
        authorization: str | None,
        document_ids: list[str] | None = None,
    ) -> RagAskResponse:
        sources = await self.search(question, top_k, authorization, document_ids)
        if not sources:
            return RagAskResponse(
                answer="No permitted knowledge sources matched your question.",
                sources=[],
            )

        context = "\n\n".join(
            f"Source: {source.title} ({source.reference})\n{source.content}"
            for source in sources
        )
        instruction = {
            "answer": (
                "Answer the user's question using only the provided sources. "
                "Include source references."
            ),
            "summarize": (
                "Summarize the provided document sources with concise bullets "
                "and source references."
            ),
            "explain": (
                "Explain the provided document sources in plain business language "
                "with source references."
            ),
        }[mode]
        answer = await llm_gateway.complete(
            [
                {
                    "role": "system",
                    "content": (
                        "You are the AI BOS RAG assistant. Use only retrieved sources. "
                        "If evidence is missing, say so."
                    ),
                },
                {"role": "system", "content": f"{instruction}\n\nRetrieved sources:\n{context}"},
                {"role": "user", "content": question},
            ]
        )
        return RagAskResponse(answer=answer, sources=sources)

    @staticmethod
    def _chunk_to_document(chunk: KnowledgeChunk, score: float) -> RagDocument:
        return RagDocument(
            id=chunk.id,
            document_id=chunk.document_id,
            chunk_id=chunk.id,
            title=chunk.filename,
            content=chunk.content,
            source=chunk.source,
            reference=chunk.reference,
            score=score,
        )


rag_service = RAGService()
