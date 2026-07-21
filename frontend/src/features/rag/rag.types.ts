export type KnowledgePermissions = {
  visibility: "private" | "workspace" | "restricted";
  allowed_roles: string[];
  allowed_user_ids: string[];
};

export type KnowledgeFile = {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  status: "Processing" | "Ready" | "Failed";
  owner_id: string;
  owner_role: string;
  chunk_count: number;
  permissions: KnowledgePermissions;
  created_at: string;
  updated_at: string;
  error?: string | null;
};

export type RagSource = {
  id: string;
  document_id: string;
  chunk_id: string;
  title: string;
  content: string;
  source: string;
  score: number;
  reference?: string | null;
};

export type RagAskResponse = {
  answer: string;
  sources: RagSource[];
};
