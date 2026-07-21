import { useCallback } from "react";
import { useMemory } from "../MemoryProvider";
import type { MemoryItem } from "../memory.types";

export function useMemoryActions() {
  const { fetchItems, createItem, updateItem, deleteItem, clearAll, exportMemory, search } = useMemory();

  const saveConversation = useCallback(
    async (conversationId: string, messages: Array<{ role: string; content: string }>) => {
      const now = new Date().toISOString();
      await createItem({
        type: "conversation",
        title: `Chat: ${conversationId}`,
        content: JSON.stringify({ conversationId, messages, lastMessageAt: now }),
        tags: ["chat", conversationId],
        source: "ai-assistant",
        metadata: { messageCount: messages.length },
        createdAt: now,
        updatedAt: now,
      });
    },
    [createItem],
  );

  const pinReport = useCallback(
    async (reportId: string, reportName: string, reportData: Record<string, unknown>) => {
      const now = new Date().toISOString();
      await createItem({
        type: "document",
        title: reportName,
        content: JSON.stringify({ reportId, reportName, reportData, pinnedAt: now }),
        tags: ["report", "pinned"],
        source: "consultant",
        metadata: { reportType: reportData.type || "analytics" },
        createdAt: now,
        updatedAt: now,
      });
    },
    [createItem],
  );

  const trackRecentDocument = useCallback(
    async (documentId: string, documentName: string, documentType: string) => {
      const now = new Date().toISOString();
      await createItem({
        type: "document",
        title: documentName,
        content: JSON.stringify({ documentId, documentName, documentType, accessedAt: now }),
        tags: ["document", "recent"],
        source: "documents",
        metadata: {},
        createdAt: now,
        updatedAt: now,
      });
    },
    [createItem],
  );

  const trackRecentProject = useCallback(
    async (projectId: string, projectName: string, projectStatus: string) => {
      const now = new Date().toISOString();
      await createItem({
        type: "note",
        title: projectName,
        content: JSON.stringify({ projectId, projectName, projectStatus, accessedAt: now }),
        tags: ["project", "recent"],
        source: "projects",
        metadata: {},
        createdAt: now,
        updatedAt: now,
      });
    },
    [createItem],
  );

  const setFavoritePage = useCallback(
    async (pageId: string, pageName: string, pagePath: string) => {
      const now = new Date().toISOString();
      await createItem({
        type: "preference",
        title: pageName,
        content: JSON.stringify({ pageId, pageName, pagePath, favoritedAt: now }),
        tags: ["page", "favorite"],
        source: "navigation",
        metadata: {},
        createdAt: now,
        updatedAt: now,
      });
    },
    [createItem],
  );

  const saveUserPreference = useCallback(
    async (preferenceKey: string, preferenceValue: unknown) => {
      const now = new Date().toISOString();
      await createItem({
        type: "preference",
        title: preferenceKey,
        content: JSON.stringify({ key: preferenceKey, value: preferenceValue, updatedAt: now }),
        tags: ["preference"],
        source: "settings",
        metadata: {},
        createdAt: now,
        updatedAt: now,
      });
    },
    [createItem],
  );

  return {
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    clearAll,
    exportMemory,
    search,
    saveConversation,
    pinReport,
    trackRecentDocument,
    trackRecentProject,
    setFavoritePage,
    saveUserPreference,
  };
}

export function useMemoryQuery() {
  const { fetchItems, items, isLoading, error } = useMemory();

  const queryByType = useCallback(
    async (type: MemoryItem["type"]) => {
      await fetchItems({ type, limit: 50 });
    },
    [fetchItems],
  );

  const queryRecent = useCallback(async () => {
    await fetchItems({ limit: 20 });
  }, [fetchItems]);

  return {
    items,
    isLoading,
    error,
    queryByType,
    queryRecent,
  };
}

export function useMemorySearch() {
  const { search, items } = useMemory();

  const semanticSearch = useCallback(
    async (query: string) => {
      return await search(query);
    },
    [search],
  );

  return {
    semanticSearch,
    results: items,
  };
}
