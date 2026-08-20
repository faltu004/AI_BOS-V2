import { Types } from "mongoose";
import { organizationRepository } from "../repositories/organization.repository.js";
import { sessionRepository } from "../repositories/session.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { PasswordChangeModel } from "../models/password-history.model.js";
import { AppError } from "../utils/app-error.js";
import { passwordService } from "./password.service.js";
import { securityService } from "./security.service.js";
import type {
  AdministratorCredentialsInput,
  FirstOwnerBootstrapInput,
} from "../validation/protected-account.validation.js";

function toAdminStatus(admin: Awaited<ReturnType<typeof userRepository.findActiveByRole>>) {
  return {
    configured: Boolean(admin),
    email: admin?.email,
    fullName: admin?.fullName,
    updatedAt: admin?.updatedAt,
  };
}

export class ProtectedAccountService {
  async ownerBootstrapStatus() {
    const ownerCount = await userRepository.countActiveByRole("Owner");
    return {
      available: ownerCount === 0,
    };
  }

  async createFirstOwner(input: FirstOwnerBootstrapInput, meta?: { ip?: string; userAgent?: string; deviceId?: string }) {
    const ownerCount = await userRepository.countActiveByRole("Owner");
    if (ownerCount > 0) {
      throw new AppError("First Owner setup is already closed", 409);
    }

    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError("A user with this email already exists", 409);
    }

    await passwordService.validatePolicy(input.password);
    const passwordHash = await passwordService.hash(input.password);
    const organization = await organizationRepository.getOrCreateDefault();

    const owner = await userRepository.create({
      fullName: input.fullName,
      companyName: organization.name,
      email: input.email,
      passwordHash,
      role: "Owner",
      organizationId: organization._id,
      isEmailVerified: true,
      isProfileComplete: true,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    });

    const ownerObjectId = new Types.ObjectId(owner.id);
    await PasswordChangeModel.create({
      user: ownerObjectId,
      previousPasswordHash: passwordHash,
      changedBy: ownerObjectId,
    });

    await securityService.recordSecurityEvent({
      userId: owner.id,
      eventType: "first_owner_bootstrap_created",
      severity: "high",
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      deviceId: meta?.deviceId,
      description: "First Owner account was created through local setup",
      metadata: { bootstrap: true },
    });

    return {
      created: true,
      owner: {
        id: owner.id,
        fullName: owner.fullName,
        email: owner.email,
        role: owner.role,
      },
    };
  }

  async getAdministratorStatus() {
    const admin = await userRepository.findActiveByRole("Administrator");
    return toAdminStatus(admin);
  }

  async saveAdministratorCredentials(actorUserId: string, input: AdministratorCredentialsInput) {
    const actor = await userRepository.findById(actorUserId);
    if (!actor || actor.role !== "Owner") {
      throw new AppError("Only Owner can manage Administrator credentials", 403);
    }

    const existingAdmin = await userRepository.findActiveByRole("Administrator");
    if (!existingAdmin && (!input.email || !input.password)) {
      throw new AppError("Administrator email and password are required for initial setup", 400);
    }

    const nextEmail = input.email?.toLowerCase();
    if (nextEmail) {
      const emailOwner = await userRepository.findByEmail(nextEmail);
      if (emailOwner && emailOwner.id !== existingAdmin?.id) {
        throw new AppError("A user with this email already exists", 409);
      }
    }

    if (input.password) {
      await passwordService.validatePolicy(input.password);
    }

    if (!existingAdmin) {
      const organization = await organizationRepository.getOrCreateDefault();
      const passwordHash = await passwordService.hash(input.password!);
      const admin = await userRepository.create({
        fullName: "Administrator",
        companyName: organization.name,
        email: nextEmail!,
        passwordHash,
        role: "Administrator",
        organizationId: organization._id,
        isEmailVerified: true,
        isProfileComplete: true,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      });

      const adminObjectId = new Types.ObjectId(admin.id);
      await PasswordChangeModel.create({
        user: adminObjectId,
        previousPasswordHash: passwordHash,
        changedBy: new Types.ObjectId(actorUserId),
      });

      await securityService.recordSecurityEvent({
        userId: admin.id,
        eventType: "administrator_credentials_created",
        severity: "high",
        description: "Administrator credentials were created by Owner",
        metadata: { changedBy: actorUserId },
      });

      return toAdminStatus(admin);
    }

    const updates: Parameters<typeof userRepository.updateAccountCredentials>[1] = {};
    if (nextEmail) updates.email = nextEmail;
    if (input.password) {
      updates.passwordHash = await passwordService.hash(input.password);
      updates.mustChangePassword = false;
      updates.passwordChangedAt = new Date();
      updates.temporaryPasswordExpiresAt = null;
    }

    const updated = Object.keys(updates).length > 0
      ? await userRepository.updateAccountCredentials(existingAdmin.id, updates)
      : existingAdmin;

    if (input.password || (nextEmail && nextEmail !== existingAdmin.email)) {
      await sessionRepository.revokeAllForUser(existingAdmin.id);
    }

    await securityService.recordSecurityEvent({
      userId: existingAdmin.id,
      eventType: "administrator_credentials_updated",
      severity: "high",
      description: "Administrator credentials were updated by Owner",
      metadata: {
        changedBy: actorUserId,
        emailChanged: Boolean(nextEmail && nextEmail !== existingAdmin.email),
        passwordChanged: Boolean(input.password),
      },
    });

    return toAdminStatus(updated);
  }
}

export const protectedAccountService = new ProtectedAccountService();
