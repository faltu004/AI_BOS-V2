import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
};

export class EmailService {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (!env.SMTP_HOST) {
      return null;
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
      });
    }

    return this.transporter;
  }

  async send(payload: EmailPayload): Promise<boolean> {
    const transporter = this.getTransporter();

    if (!transporter) {
      logger.info(`[email:dev-fallback] would send to ${payload.to}: ${payload.subject}`);
      return false;
    }

    try {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
      });
      return true;
    } catch (error) {
      logger.error(error, `Failed to send email to ${payload.to}`);
      return false;
    }
  }
}

export const emailService = new EmailService();
