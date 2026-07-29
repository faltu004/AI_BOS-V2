import { aiAuditService } from "./ai-audit.service.js";
import { aiContextService, type AIContextBundle } from "./ai-context.service.js";
import { aiProviderService } from "./ai-provider.service.js";
import type { AIChatInput } from "../validation/ai.validation.js";

function systemPrompt(context: AIContextBundle) {
  return [
    "You are the role-aware company assistant for this business operating system.",
    "Answer in the user's language when possible. The product owner often uses Hindi/Hinglish, so concise Hinglish is acceptable.",
    "You must follow RBAC strictly. Never infer or invent data outside the provided context.",
    "If the user requests data or action outside their role, refuse politely and explain what they can access.",
    "For write actions, do not claim completion. Give a draft and say confirmation-enabled actions are not active yet.",
    "",
    "Security instructions:",
    ...context.instructions.map((item) => `- ${item}`),
    "",
    "Allowed context JSON:",
    JSON.stringify(context.sections, null, 2).slice(0, 14000),
  ].join("\n");
}

function suggestionsForScope(scope: string) {
  if (scope === "executive_full" || scope === "admin_full") {
    return ["Company health summary", "Show project risks", "Summarize employees by role", "What needs attention today?"];
  }
  if (scope === "manager_team") {
    return ["Team workload summary", "At-risk projects", "Pending priorities", "What should I follow up today?"];
  }
  if (scope === "hr_people") {
    return ["Employee status summary", "Onboarding priorities", "Policy questions", "Department overview"];
  }
  if (scope === "sales_revenue") {
    return ["Sales project summary", "Client follow-ups", "Revenue priorities", "Pipeline risks"];
  }
  if (scope === "finance_financial") {
    return ["Finance summary", "Budget risks", "Project budget view", "Payment follow-ups"];
  }
  return ["My tasks and updates", "Company policies", "My meetings", "What can I access?"];
}

export class AIService {
  async getContext(userId: string, role: string) {
    const context = await aiContextService.buildForUser(userId, role);
    return {
      role: context.role,
      scope: context.scope,
      sources: context.sources,
      suggestions: suggestionsForScope(context.scope),
      preview: context.sections,
    };
  }

  async chat(input: AIChatInput, userId: string, role: string) {
    const context = await aiContextService.buildForUser(userId, role);
    const history = input.history.slice(-8).map((item) => ({ role: item.role, content: item.content }));
    const result = await aiProviderService.chat([
      { role: "system", content: systemPrompt(context) },
      ...history,
      { role: "user", content: input.message },
    ]);

    await aiAuditService.record({
      userId,
      role,
      success: true,
      promptLength: input.message.length,
      responseLength: result.answer.length,
      scope: context.scope,
      usedFallback: result.usedFallback,
    });

    return {
      answer: result.answer,
      role,
      scope: context.scope,
      sources: context.sources,
      suggestions: suggestionsForScope(context.scope),
      usedFallback: result.usedFallback,
    };
  }
}

export const aiService = new AIService();
