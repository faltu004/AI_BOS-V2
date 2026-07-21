import { AppError } from "../utils/app-error.js";
import { projectService } from "./project.service.js";
import { userService } from "./user.service.js";
import { workflowService } from "./workflow.service.js";
import { consultantService } from "./consultant.service.js";
import { aiConfigService } from "./ai-config.service.js";

type PageContext = {
  page?: string;
  module?: string;
  recordId?: string;
  metadata?: Record<string, unknown>;
};

type CopilotContext = {
  page: PageContext | null;
  availableModules: string[];
  dataSummary: Record<string, unknown>;
  suggestions: string[];
  agent: string;
};

type CopilotResponse = {
  message: string;
  agent: string;
  context: CopilotContext;
  suggestions: string[];
  confidence: number;
};

export class CopilotService {
  async message(input: { message: string; pageContext?: PageContext; history: Array<{ role: string; content: string }> }, userId?: string): Promise<CopilotResponse> {
    const context = await this.buildContext(input.pageContext, userId);
    const agent = this.detectAgent(input.message, input.pageContext);
    const suggestions = this.generateSuggestions(input.pageContext);

    const response = this.generateResponse(input.message, context, agent);

    return {
      message: response,
      agent,
      context,
      suggestions,
      confidence: context.dataSummary ? 75 : 40,
    };
  }

  async *stream(input: { message: string; pageContext?: PageContext; history: Array<{ role: string; content: string }> }, userId?: string): AsyncGenerator<string> {
    const response = await this.message(input, userId);
    const words = response.message.split(" ");
    for (const word of words) {
      yield `${word} `;
    }
  }

  async getContext(pageContext: PageContext | undefined, userId?: string): Promise<CopilotContext> {
    return this.buildContext(pageContext, userId);
  }

  async getSuggestions(pageContext: PageContext | undefined, _userId?: string): Promise<string[]> {
    return this.generateSuggestions(pageContext);
  }

  private async buildContext(pageContext: PageContext | undefined, _userId?: string): Promise<CopilotContext> {
    const context: CopilotContext = {
      page: pageContext || null,
      availableModules: [],
      dataSummary: {},
      suggestions: [],
      agent: "ceo",
    };

    const modules = ["projects", "users", "workflows", "ai-config"];

    for (const module of modules) {
      try {
        switch (module) {
          case "projects": {
            const stats = await projectService.stats();
            context.dataSummary.projects = stats;
            context.availableModules.push("projects");
            break;
          }
          case "users": {
            const users = await userService.listUsers();
            context.dataSummary.users = { total: users.length, roles: users.map((u) => u.role) };
            context.availableModules.push("users");
            break;
          }
          case "workflows": {
            const workflowStats = await workflowService.stats();
            context.dataSummary.workflows = workflowStats;
            context.availableModules.push("workflows");
            break;
          }
          case "ai-config": {
            const aiConfig = await aiConfigService.get();
            context.dataSummary.aiConfig = aiConfig;
            context.availableModules.push("ai-config");
            break;
          }
        }
      } catch {
        // Module unavailable
      }
    }

    context.agent = this.detectAgent("", pageContext);
    context.suggestions = this.generateSuggestions(pageContext);

    return context;
  }

  private detectAgent(message: string, pageContext: PageContext | undefined): string {
    const text = `${message} ${pageContext?.page || ""} ${pageContext?.module || ""}`.toLowerCase();

    if (/(revenue|expense|invoice|cash.?flow|profit|budget|finance|financial)/.test(text)) return "finance";
    if (/(employee|attendance|leave|hiring|performance|productivity|hr)/.test(text)) return "hr";
    if (/(project|task|timeline|deadline|delay|sprint|agile)/.test(text)) return "project";
    if (/(crm|lead|customer|sales|deal|opportunity|pipeline)/.test(text)) return "sales";
    if (/(marketing|campaign|seo|blog|social|advertisement)/.test(text)) return "marketing";
    if (/(api|code|bug|developer|technical|documentation)/.test(text)) return "developer";
    if (/(support|ticket|faq|help|issue|customer.?support)/.test(text)) return "support";
    if (/(meeting|agenda|action.?item|follow.?up)/.test(text)) return "meeting";
    if (/(document|file|upload|compare|summary)/.test(text)) return "document";
    if (/(analytics|chart|insight|prediction|trend)/.test(text)) return "analytics";
    if (/(report|export|generate)/.test(text)) return "report";

    if (pageContext) {
      switch (pageContext.module) {
        case "projects":
        case "tasks":
          return "project";
        case "crm":
        case "deals":
        case "leads":
          return "sales";
        case "finance":
        case "invoices":
        case "expenses":
          return "finance";
        case "employees":
        case "attendance":
        case "leave":
          return "hr";
        case "meetings":
          return "meeting";
        case "documents":
        case "knowledge":
          return "document";
        case "analytics":
          return "analytics";
        case "reports":
          return "report";
        default:
          return "ceo";
      }
    }

    return "ceo";
  }

  private generateResponse(message: string, context: CopilotContext, agent: string): string {
    const page = context.page?.page || "general";
    const module = context.page?.module || "general";

    const projectData = context.dataSummary.projects as { total: number; active: number; delayed: number; completed: number; avgProgress: number } | undefined;
    const userData = context.dataSummary.users as { total: number } | undefined;
    const workflowData = context.dataSummary.workflows as { total: number; active: number; paused: number } | undefined;

    const lower = message.toLowerCase();

    if (projectData && /how many projects|project status|project summary|delayed/.test(lower)) {
      return `Based on real data: You have ${projectData.total} total projects. ${projectData.active} are active, ${projectData.completed} completed, and ${projectData.delayed} delayed. Average progress is ${projectData.avgProgress}%. ${projectData.delayed > 0 ? `Immediate attention needed for ${projectData.delayed} delayed project(s).` : "All projects are on track."}`;
    }

    if (userData && /how many users|team size|employees|users/.test(lower)) {
      return `Based on real data: There are ${userData.total} users in the system.`;
    }

    if (workflowData && /workflow|automation/.test(lower)) {
      return `Based on real data: ${workflowData.total} workflows total. ${workflowData.active} active, ${workflowData.paused} paused.`;
    }

    const agentResponses: Record<string, string> = {
      finance: `I'm your Finance Agent. I can help with revenue analysis, expense tracking, invoice summaries, cash flow, and profit optimization. What would you like to know?`,
      hr: `I'm your HR Agent. I can help with employee performance, attendance analysis, leave management, and hiring recommendations. What would you like to know?`,
      project: `I'm your Project Agent. I can help with project summaries, delay predictions, team suggestions, and risk analysis. What would you like to know?`,
      sales: `I'm your Sales Agent. I can help with lead suggestions, customer summaries, sales predictions, and follow-up strategies. What would you like to know?`,
      marketing: `I'm your Marketing Agent. I can help with campaign suggestions, SEO ideas, content generation, and social media strategies. What would you like to know?`,
      developer: `I'm your Developer Agent. I can help with API documentation, bug analysis, code suggestions, and technical guidance. What would you like to know?`,
      support: `I'm your Support Agent. I can help with customer support, FAQ, ticket summaries, and issue resolution. What would you like to know?`,
      meeting: `I'm your Meeting Agent. I can help with meeting summaries, action items, and follow-up tasks. What would you like to know?`,
      document: `I'm your Document Agent. I can help with document summaries, Q&A, content explanation, and document comparison. What would you like to know?`,
      analytics: `I'm your Analytics Agent. I can help explain charts, provide business insights, and make predictions. What would you like to know?`,
      report: `I'm your Report Agent. I can help explain reports, generate summaries, and compare reports. What would you like to know?`,
      ceo: `I'm your CEO Agent. I can provide company summaries, revenue insights, business growth suggestions, risk analysis, and KPI summaries. What would you like to know?`,
    };

    return agentResponses[agent] || `I'm your AI Copilot. I can help you with ${context.availableModules.join(", ") || "various business tasks"}. What would you like to know?`;
  }

  private generateSuggestions(pageContext: PageContext | undefined): string[] {
    if (!pageContext) {
      return [
        "Show me business health summary",
        "What are my active projects?",
        "Generate a revenue analysis",
        "Explain today's KPIs",
        "Create a daily summary",
      ];
    }

    switch (pageContext.module) {
      case "projects":
        return [
          "Summarize this project",
          "Predict delays",
          "Suggest team improvements",
          "Analyze project risks",
          "What's the next best action?",
        ];
      case "crm":
        return [
          "Suggest leads to follow up",
          "Summarize this customer",
          "Predict sales for this quarter",
          "Customer retention analysis",
        ];
      case "finance":
        return [
          "Analyze revenue trends",
          "Break down expenses",
          "Summarize invoices",
          "Cash flow analysis",
          "Profit optimization tips",
        ];
      case "employees":
        return [
          "Show team performance",
          "Analyze productivity",
          "Attendance summary",
          "Leave trends",
          "Hiring suggestions",
        ];
      case "meetings":
        return [
          "Summarize this meeting",
          "Extract action items",
          "Create follow-up tasks",
          "Meeting insights",
        ];
      case "documents":
        return [
          "Summarize this document",
          "Answer questions about content",
          "Explain key points",
          "Compare with other documents",
        ];
      case "analytics":
        return [
          "Explain these charts",
          "Business insights",
          "Predictions for next month",
          "Trend analysis",
        ];
      case "reports":
        return [
          "Explain this report",
          "Generate summary",
          "Compare with last report",
          "Key takeaways",
        ];
      default:
        return [
          "Show business health",
          "Generate executive summary",
          "What needs my attention?",
          "Create a report",
        ];
    }
  }
}

export const copilotService = new CopilotService();
