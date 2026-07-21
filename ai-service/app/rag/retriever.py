from app.embeddings import SimpleEmbeddingProvider
from app.models.rag import RagDocument


class InMemoryRetriever:
    def __init__(self, embeddings: SimpleEmbeddingProvider | None = None) -> None:
        self._embeddings = embeddings or SimpleEmbeddingProvider()
        self._documents = [
            RagDocument(
                id="projects-overview",
                title="Projects Module",
                source="ai-bos://modules/projects",
                content="Projects manage deadlines, budgets, progress, project managers, team members, tasks, documents, and delivery risk.",
            ),
            RagDocument(
                id="crm-overview",
                title="CRM Module",
                source="ai-bos://modules/crm",
                content="CRM manages leads, customers, companies, contacts, deals, quotes, follow-ups, meetings, and conversion stages.",
            ),
            RagDocument(
                id="finance-overview",
                title="Finance Module",
                source="ai-bos://modules/finance",
                content="Finance manages income, expenses, invoices, payments, taxes, budgets, revenue, profit, and outstanding payments.",
            ),
            RagDocument(
                id="hr-overview",
                title="Employee Module",
                source="ai-bos://modules/employees",
                content="Employee management covers departments, attendance, leave, salary, holidays, performance, skills, experience, and documents.",
            ),
        ]

    def search(self, query: str, top_k: int, module: str | None = None) -> list[RagDocument]:
        documents = self._documents
        if module:
            documents = [doc for doc in documents if module.lower() in doc.source.lower()] or documents

        scored = [
            doc.model_copy(update={"score": self._embeddings.similarity(query, doc.content)})
            for doc in documents
        ]
        return sorted(scored, key=lambda document: document.score, reverse=True)[:top_k]


retriever = InMemoryRetriever()
