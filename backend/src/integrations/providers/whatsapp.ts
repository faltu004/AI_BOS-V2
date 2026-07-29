import type { ProviderDefinition } from "../types.js";

export const whatsappProvider: ProviderDefinition = {
  family: "whatsapp",
  authType: "future_ready",
  integrations: [
    { key: "whatsapp_business", name: "WhatsApp Business", description: "Send and receive WhatsApp Business messages (coming soon).", category: "Communication" },
  ],
  async testConnection() {
    return { ok: false, detail: "WhatsApp Business is coming soon" };
  },
  async sync() {
    return { itemsSynced: 0, summary: "WhatsApp Business is coming soon" };
  },
};
