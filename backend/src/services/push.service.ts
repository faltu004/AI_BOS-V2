import { logger } from "../utils/logger.js";

export type PushPayload = {
  userId: string;
  title: string;
  body: string;
};

/**
 * Future-ready stub: no push provider (web-push/FCM/APNs) or device-token
 * storage exists yet. Stable interface for notification.service.ts to call
 * today; swap in a real provider here later without touching dispatch logic.
 */
export class PushService {
  async send(payload: PushPayload): Promise<boolean> {
    logger.info(`[push:not-configured] would send to user ${payload.userId}: ${payload.title}`);
    return false;
  }
}

export const pushService = new PushService();
