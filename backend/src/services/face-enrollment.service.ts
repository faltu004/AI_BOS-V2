import { Types } from "mongoose";
import { faceEnrollmentRepository } from "../repositories/face-enrollment.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import { encryptSecret, hashValue } from "../utils/crypto.js";
import { securityService } from "./security.service.js";
import { faceRecognitionProvider } from "./face-recognition-provider.js";
import type { EnrollFaceInput, ResetFaceEnrollmentInput } from "../validation/face-enrollment.validation.js";

function toStatus(enrollment: Awaited<ReturnType<typeof faceEnrollmentRepository.findActiveByUser>>) {
  return {
    enrolled: Boolean(enrollment),
    status: enrollment?.status ?? "not_enrolled",
    enrolledAt: enrollment?.enrolledAt,
    provider: enrollment?.provider,
    templateVersion: enrollment?.templateVersion,
  };
}

export class FaceEnrollmentService {
  async hasActiveEnrollment(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return false;
    }
    const enrollment = await faceEnrollmentRepository.findActiveByUser(userId);
    return Boolean(enrollment);
  }

  async getOwnStatus(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return toStatus(null);
    }
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

  async enrollSelf(userId: string, input: EnrollFaceInput, meta?: { ip?: string; userAgent?: string; deviceId?: string }) {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) throw new AppError("User not found", 404);

    const providerResult = await faceRecognitionProvider.enroll(input.samples);
    const templateEncrypted = encryptSecret(providerResult.template);
    const templateHash = hashValue(providerResult.template);

    const enrollment = await faceEnrollmentRepository.upsertActive({
      userId: new Types.ObjectId(userId),
      status: "active",
      provider: providerResult.provider,
      templateEncrypted,
      templateHash,
      templateVersion: providerResult.templateVersion,
      samplesCount: input.samples.length,
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
      deviceId: meta?.deviceId,
      description: "Face enrollment completed",
      metadata: { provider: providerResult.provider, templateVersion: providerResult.templateVersion },
    });

    return toStatus(enrollment.toObject());
  }

  async resetUserEnrollment(actorUserId: string, targetUserId: string, input: ResetFaceEnrollmentInput) {
    if (actorUserId === targetUserId) {
      throw new AppError("Use self enrollment to replace your own face data", 400);
    }

    const target = await userRepository.findById(targetUserId);
    if (!target) throw new AppError("User not found", 404);

    await faceEnrollmentRepository.resetUserEnrollment(targetUserId, actorUserId, input.reason);
    await securityService.recordSecurityEvent({
      userId: targetUserId,
      eventType: "face_enrollment_reset",
      severity: "high",
      description: "Face enrollment reset by administrator",
      metadata: { resetBy: actorUserId, reason: input.reason },
    });

    return { reset: true };
  }

  async verifyAttendance(userId: string, faceImage: string) {
    const enrollment = await faceEnrollmentRepository.findActiveWithTemplate(userId);
    if (!enrollment) {
      throw new AppError("Face setup required before marking attendance.", 428);
    }

    if (!enrollment.templateEncrypted) {
      throw new AppError("Face enrollment is not usable. Please re-enroll.", 428);
    }

    const result = await faceRecognitionProvider.verify(faceImage, enrollment.templateEncrypted);
    if (!result.livenessPassed) {
      throw new AppError("Liveness check failed. Please try again.", 400);
    }
    if (!result.matched) {
      throw new AppError("Face did not match the active enrollment.", 403);
    }

    return {
      faceVerified: true,
      livenessPassed: result.livenessPassed,
      faceEnrollmentId: enrollment.id,
      verificationModelVersion: result.modelVersion,
    };
  }
}

export const faceEnrollmentService = new FaceEnrollmentService();
