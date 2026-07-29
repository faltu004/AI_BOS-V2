import crypto from "node:crypto";
import { type UserDocument } from "../models/user.model.js";
import { userRepository } from "../repositories/user.repository.js";
import { ResetPasswordModel } from "../models/reset-password.model.js";
import { passwordService } from "./password.service.js";
import { emailService } from "./email.service.js";
import { AppError } from "../utils/app-error.js";
import { createTokenPair } from "../utils/jwt.js";
import { securityService } from "./security.service.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import type { SetPasswordInput } from "../validation/auth.validation.js";

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export class ResetPasswordService {
  async requestReset(input: { email: string }, meta?: { ip?: string; userAgent?: string; origin?: string }) {
    const user = await userRepository.findByEmail(input.email);

    if (!user) {
      logger.info(`Password reset requested for unknown email: ${input.email}`);
      return { sent: true };
    }

    const existing = await ResetPasswordModel.findOne({ userId: user.id }).sort({ createdAt: -1 });
    if (existing && existing.used === false && existing.expiresAt > new Date()) {
      return { sent: true };
    }

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await ResetPasswordModel.create({
      userId: user.id,
      token,
      expiresAt,
      used: false,
    });

    const resetBaseUrl = meta?.origin && env.CLIENT_ORIGIN.includes(meta.origin) ? meta.origin : env.CLIENT_ORIGIN[0];
    const resetLink = `${resetBaseUrl}/reset-password/${token}`;

    await emailService.send({
      to: user.email,
      subject: "Reset your AI BOS password",
      text: `We received a request to reset your AI BOS password.\n\nReset it here (expires in 15 minutes): ${resetLink}\n\nIf you didn't request this, you can safely ignore this email.`,
    });

    await securityService.recordSecurityEvent({
      userId: user.id,
      eventType: "password_reset_requested",
      severity: "low",
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      description: "Password reset link generated",
    });

    return { sent: true };
  }

  async verifyToken(token: string) {
    const reset = await ResetPasswordModel.findOne({ token }).sort({ createdAt: -1 });

    if (!reset) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    if (reset.used) {
      throw new AppError("This reset token has already been used", 400);
    }

    if (reset.expiresAt < new Date()) {
      throw new AppError("This reset token has expired", 400);
    }

    const user = await userRepository.findById(reset.userId.toString());

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return { user, reset };
  }

  async setNewPassword(token: string, input: SetPasswordInput, meta?: { ip?: string; userAgent?: string; deviceId?: string }) {
    const { user, reset } = await this.verifyToken(token);

    const isSameAsOld = await passwordService.isSameAsPrevious(user.id, input.newPassword);
    if (isSameAsOld) {
      throw new AppError("New password must be different from previous passwords", 400);
    }

    const passwordHash = await passwordService.hash(input.newPassword);
    const previousHash = (user as UserDocument).passwordHash;

    await passwordService.changePasswordWithHistory(user.id, passwordHash, previousHash);

    await ResetPasswordModel.updateOne(
      { _id: reset._id },
      { used: true },
    );

    const tokens = createTokenPair({
      sub: user.id,
      role: user.role,
    });

    await securityService.recordSecurityEvent({
      userId: user.id,
      eventType: "password_reset_completed",
      severity: "medium",
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      deviceId: meta?.deviceId,
      description: "Password was reset via temporary reset link",
    });

    return { tokens, user };
  }
}

export const resetPasswordService = new ResetPasswordService();