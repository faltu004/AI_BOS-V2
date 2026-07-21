from dataclasses import dataclass

from app.config import settings
from app.rag.document_parser import ParsedSection


@dataclass(frozen=True)
class TextChunk:
    content: str
    reference: str


class DocumentChunker:
    def __init__(
        self,
        chunk_size: int = settings.rag_chunk_size,
        overlap: int = settings.rag_chunk_overlap,
    ) -> None:
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk(self, sections: list[ParsedSection]) -> list[TextChunk]:
        chunks: list[TextChunk] = []
        for section in sections:
            normalized = " ".join(section.text.split())
            if not normalized:
                continue
            start = 0
            index = 1
            while start < len(normalized):
                end = min(start + self.chunk_size, len(normalized))
                content = normalized[start:end].strip()
                if content:
                    chunks.append(
                        TextChunk(
                            content=content,
                            reference=f"{section.reference}, chunk {index}",
                        )
                    )
                if end >= len(normalized):
                    break
                start = max(0, end - self.overlap)
                index += 1
        return chunks


document_chunker = DocumentChunker()
