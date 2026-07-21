import { useCallback } from "react";
import { useMemoryActions } from "./useMemory";

export function useChatMemory() {
  const { saveConversation, trackRecentProject, trackRecentDocument } = useMemoryActions();

  const onChatMessage = useCallback(
    async (conversationId: string, message: { role: string; content: string }) => {
      console.log("Chat message for memory:", conversationId, message);
    },
    [],
  );

  const onChatComplete = useCallback(
    async (conversationId: string, messages: Array<{ role: string; content: string }>) => {
      await saveConversation(conversationId, messages);
    },
    [saveConversation],
  );

  const onProjectAccessed = useCallback(
    async (projectId: string, projectName: string, projectStatus: string) => {
      await trackRecentProject(projectId, projectName, projectStatus);
    },
    [trackRecentProject],
  );

  const onDocumentAccessed = useCallback(
    async (documentId: string, documentName: string, documentType: string) => {
      await trackRecentDocument(documentId, documentName, documentType);
    },
    [trackRecentDocument],
  );

  return {
    onChatMessage,
    onChatComplete,
    onProjectAccessed,
    onDocumentAccessed,
  };
}