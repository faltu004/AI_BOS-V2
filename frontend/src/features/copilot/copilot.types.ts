export type CopilotAgent = "ceo" | "hr" | "finance" | "sales" | "marketing" | "developer" | "support" | "meeting" | "document" | "analytics" | "report" | "project";

export type PageContext = {
  page?: string;
  module?: string;
  recordId?: string;
  metadata?: Record<string, unknown>;
};

export type CopilotSuggestion = {
  id: string;
  text: string;
  icon: string;
  agent?: CopilotAgent;
};

export type CopilotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent?: CopilotAgent;
  timestamp: string;
  confidence?: number;
};

export type CopilotContext = {
  page: PageContext | null;
  availableModules: string[];
  dataSummary: Record<string, unknown>;
  suggestions: string[];
  agent: CopilotAgent;
};

export type CopilotView = "floating" | "fullpage";
