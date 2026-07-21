export type MemoryType = "note" | "fact" | "context" | "preference" | "document" | "conversation";
export const memoryTypes = ["note", "fact", "context", "preference", "document", "conversation"] as const;
export type MemoryItem = {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  tags: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
};

export type MemoryQuery = {
  type?: MemoryType;
  category?: string;
  query?: string;
  limit?: number;
};

export type MemorySettings = {
  enabled: boolean;
  autoSaveConversations: boolean;
  trackBusinessContext: boolean;
  semanticSearchEnabled: boolean;
  retentionDays: number;
};

export type MemoryStats = {
  totalItems: number;
  totalTypes: Record<string, number>;
  lastUpdated: string;
  storageUsed: string;
};
