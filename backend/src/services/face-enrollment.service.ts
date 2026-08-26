import { Types } from "mongoose";
import type { AttendanceAction } from "../models/face-verification-challenge.model.js";
import { faceEnrollmentRepository } from "../repositories/face-enrollment.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import {
  biometricEncryptionConfigured,
  encryptBiometricTemplate,
  hashBiometricTemplate,
} from "../utils/crypto.js";
import type { AttendanceMarkInput } from "../validation/attendance.validation.js";
import type {
  DeleteOwnFaceEnrollmentInput,
  EnrollFaceInput,
  ResetFaceEnrollmentInput,
} from "../validation/face-enrollment.validation.js";
import { faceRecognitionProvider } from "./face-recognition-provider.js";
import { faceVerificationChallengeService } from "./face-verification-challenge.service.js";
import { securityService } from "./security.service.js";

type RequestMeta = { ip?: string; userAgent?: string; deviceId?: string };

function toStatus(enrollment: Awaited<ReturnType<typeof faceEnrollmentRepository.findActiveByUser>>) {
  const configured = biometricEncryptionConfigured();
  return {
    configured,
    unavailableReason: configured ? undefined : "Biometric encryption is not configured on the backend.",
    enrolled: Boolean(enrollment),
    status: enrollment?.status ?? "not_enrolled",
    enrolledAt: enrollment?.enrolledAt,
    provider: enrollment?.provider,
    templateVersion: enrollment?.templateVersion,
  };
}

export class FaceEnrollmentService {
  async hasActiveEnrollment(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return false;
    return Boolean(await faceEnrollmentRepository.findActiveByUser(userId));
  }

  async getOwnStatus(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return toStatus(null);
    return toStatus(await faceEnrollmentRepository.findActiveByUser(userId));
  }

  async getUserStatus(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);
    return {
      userId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      ...toStatus(await faceEnrollmentRepository.findActiveByUser(userId)),
    };
  }

  async enrollSelf(userId: string, input: EnrollFaceInput, meta?: RequestMeta) {
    if (!biometricEncryptionConfigured()) {
      throw new AppError("Face enrollment is not configured. An administrator must configure biometric encryption.", 503);
    }
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) throw new AppError("User not found", 404);

    const providerResult = await faceRecognitionProvider.enroll(input.samples);
    const templateEncrypted = encryptBiometricTemplate(providerResult.template);
    const templateHash = hashBiometricTemplate(providerResult.template);
    const enrollment = await faceEnrollmentRepository.upsertActive({
      userId: new Types.ObjectId(userId),
      status: "active",
      provider: providerResult.provider,
      templateEncrypted,
      templateHash,
      templateVersion: providerResult.templateVersion,
      samplesCount: 5,
      qualityChecks: providerResult.qualityChecks,
      consentAcceptedAt: new Date(),
      enrolledAt: new Date(),
    });

    await securityService.recordSecurityEvent({
      userId,
      eventType: "face_enrollment_completed",
      severity: "medium",
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      description: "Face enrollment completed with five descriptor samples",
      metadata: {
        provider: providerResult.provider,
        templateVersion: providerResult.templateVersion,
        sampleCount: 5,
        deviceIdentifierPresent: Boolean(meta?.deviceId),
      },
    });
    return toStatus(enrollment.toObject());
  }

  async deleteOwnEnrollment(userId: string, input: DeleteOwnFaceEnrollmentInput, meta?: RequestMeta) {
    await faceEnrollmentRepository.deleteOwnEnrollment(userId, input.reason);
    await securityService.recordSecurityEvent({
      userId,
      eventType: "face_enrollment_deleted",
      severity: "high",
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      description: "Employee deleted active face enrollment",
      metadata: { reason: input.reason, deviceIdentifierPresent: Boolean(meta?.deviceId) },
    });
    return toStatus(null);
  }

  async resetUserEnrollment(actorUserId: string, targetUserId: string, input: ResetFaceEnrollmentInput) {
    if (actorUserId === targetUserId) throw new AppError("Use the self-service deletion flow for your own face data", 400);
    const target = await userRepository.findById(targetUserId);
    if (!target) throw new AppError("User not found", 404);
    await faceEnrollmentRepository.resetUserEnrollment(targetUserId, actorUserId, input.reason);
    await securityService.recordSecurityEvent({
      userId: targetUserId,
      eventType: "face_enrollment_reset",
      severity: "high",
      description: "Face enrollment reset by Owner or Administrator",
      metadata: { resetBy: actorUserId, reason: input.reason },
    });
    return { reset: true };
  }

  async verifyAttendance(
    userId: string,
    action: AttendanceAction,
    verification: AttendanceMarkInput["verification"],
    meta?: RequestMeta,
  ) {
    const enrollment = await faceEnrollmentRepository.findActiveWithTemplate(userId);
    if (!enrollment?.templateEncrypted) throw new AppError("Face setup is required before face attendance.", 428);

    const challenge = await faceVerificationChallengeService.consume(
      userId,
      action,
      verification.challengeId,
      verification.evidence,
    );
    const result = await faceRecognitionProvider.verify(verification.embedding, enrollment.templateEncrypted);
    if (!result.matched) {
      await securityService.recordSecurityEvent({
        userId,
        eventType: "face_verification_failed",
        severity: "medium",
        ip: meta?.ip,
        userAgent: meta?.userAgent,
        description: "One-to-one attendance face verification failed",
        metadata: { action, challenge: challenge.challenge, modelVersion: result.modelVersion },
      });
      throw new AppError("Face did not match the active enrollment.", 403);
    }
    return {
      faceVerified: true as const,
      livenessPassed: true as const,
      faceEnrollmentId: enrollment.id,
      verificationChallengeId: challenge._id.toString(),
      verificationModelVersion: result.modelVersion,
    };
  }
}

export const faceEnrollmentService = new FaceEnrollmentService();
