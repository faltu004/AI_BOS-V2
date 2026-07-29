import { logger } from "../utils/logger.js";

export type WhatsAppPayload = {
  to?: string;
  body: string;
};

/**
 * Future-ready stub: no WhatsApp Business API credentials are configured
 * anywhere in this app yet. This gives notification.service.ts a stable
 * interface to call today; swap in a real provider (Meta Cloud API, Twilio)
 * here later without touching the dispatch logic.
 */
export class WhatsAppService {
  async send(payload: WhatsAppPayload): Promise<boolean> {
    logger.info(`[whatsapp:not-configured] would send to ${payload.to ?? "unknown"}: ${payload.body}`);
    return false;
  }
}

export const whatsappService = new WhatsAppService();
