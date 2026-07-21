import json
from pathlib import Path

from app.config import settings
from app.models.rag import KnowledgeChunk, KnowledgeFile, KnowledgePermissions


class PermissionContext:
    def __init__(self, user_id: str, role: str) -> None:
        self.user_id = user_id
        self.role = role


class JsonVectorStore:
    def __init__(self, storage_dir: str = settings.rag_storage_dir) -> None:
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.files_path = self.storage_dir / "knowledge_files.json"
        self.chunks_path = self.storage_dir / "knowledge_chunks.json"

    def list_files(
        self,
        permission_context: PermissionContext | None = None,
    ) -> list[KnowledgeFile]:
        files = [KnowledgeFile.model_validate(item) for item in self._read_json(self.files_path)]
        if not permission_context:
            return files
        return [
            file
            for file in files
            if self._can_access(file.permissions, file.owner_id, permission_context)
        ]

    def get_file(self, document_id: str) -> KnowledgeFile | None:
        return next((file for file in self.list_files() if file.id == document_id), None)

    def add_file(self, file: KnowledgeFile, chunks: list[KnowledgeChunk]) -> KnowledgeFile:
        files = [item for item in self.list_files() if item.id != file.id]
        files.insert(0, file)
        existing_chunks = [chunk for chunk in self.list_chunks() if chunk.document_id != file.id]
        self._write_json(self.files_path, [item.model_dump() for item in files])
        self._write_json(
            self.chunks_path,
            [
                *[chunk.model_dump() for chunk in existing_chunks],
                *[chunk.model_dump() for chunk in chunks],
            ],
        )
        return file

    def delete_file(self, document_id: str) -> bool:
        files = self.list_files()
        next_files = [file for file in files if file.id != document_id]
        chunks = [chunk for chunk in self.list_chunks() if chunk.document_id != document_id]
        self._write_json(self.files_path, [file.model_dump() for file in next_files])
        self._write_json(self.chunks_path, [chunk.model_dump() for chunk in chunks])
        return len(next_files) != len(files)

    def list_chunks(self) -> list[KnowledgeChunk]:
        return [KnowledgeChunk.model_validate(item) for item in self._read_json(self.chunks_path)]

    def search(
        self,
        query_embedding: dict[str, float],
        top_k: int,
        permission_context: PermissionContext,
        document_ids: list[str] | None = None,
    ) -> list[tuple[KnowledgeChunk, float]]:
        allowed_documents = {file.id for file in self.list_files(permission_context)}
        if document_ids:
            allowed_documents = allowed_documents.intersection(set(document_ids))

        scored = []
        for chunk in self.list_chunks():
            if chunk.document_id not in allowed_documents:
                continue
            score = self._similarity(query_embedding, chunk.embedding)
            scored.append((chunk, score))
        return sorted(scored, key=lambda item: item[1], reverse=True)[:top_k]

    @staticmethod
    def _can_access(
        permissions: KnowledgePermissions,
        owner_id: str,
        context: PermissionContext,
    ) -> bool:
        if context.role == "Admin":
            return True
        if owner_id == context.user_id:
            return True
        if permissions.visibility == "workspace":
            return True
        if permissions.visibility == "restricted":
            return (
                context.role in permissions.allowed_roles
                or context.user_id in permissions.allowed_user_ids
            )
        return False

    @staticmethod
    def _similarity(left: dict[str, float], right: dict[str, float]) -> float:
        return sum(value * right.get(word, 0) for word, value in left.items())

    @staticmethod
    def _read_json(path: Path) -> list[dict]:
        if not path.exists():
            return []
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return []

    @staticmethod
    def _write_json(path: Path, data: list[dict]) -> None:
        tmp_path = path.with_suffix(f"{path.suffix}.tmp")
        tmp_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        tmp_path.replace(path)


vector_store = JsonVectorStore()
