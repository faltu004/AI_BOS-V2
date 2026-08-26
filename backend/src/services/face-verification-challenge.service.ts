import crypto from "node:crypto";
import type { AttendanceAction, FaceLivenessChallenge } from "../models/face-verification-challenge.model.js";
import { faceVerificationChallengeRepository } from "../repositories/face-verification-challenge.repository.js";
import { AppError } from "../utils/app-error.js";
import { hashValue } from "../utils/crypto.js";
import { faceEnrollmentRepository } from "../repositories/face-enrollment.repository.js";
import type { FaceLivenessEvidence } from "../validation/attendance.validation.js";

const challenges: FaceLivenessChallenge[] = ["blink", "turn_left", "turn_right"];
const challengeTtlMs = 30_000;

export class FaceVerificationChallengeService {
  async issue(userId: string, action: AttendanceAction, deviceId?: string) {
    if (!(await faceEnrollmentRepository.findActiveByUser(userId))) {
      throw new AppError("Face setup is required before face attendance.", 428);
    }
    const challenge = challenges[crypto.randomInt(challenges.length)];
    const record = await faceVerificationChallengeRepository.issue({
      userId,
      action,
      challenge,
      expiresAt: new Date(Date.now() + challengeTtlMs),
      deviceIdHash: deviceId ? hashValue(deviceId) : undefined,
    });
    return {
      challengeId: record.id,
      challenge,
      expiresAt: record.expiresAt.toISOString(),
      timeoutMs: challengeTtlMs,
    };
  }

  async consume(userId: string, action: AttendanceAction, challengeId: string, evidence: FaceLivenessEvidence) {
    const record = await faceVerificationChallengeRepository.consume(challengeId, userId, action);
    if (!record) throw new AppError("Liveness challenge expired or was already used. Start a new attempt.", 400);
    if (
      evidence.challenge !== record.challenge ||
      !evidence.neutralObserved ||
      !evidence.challengeObserved ||
      !evidence.returnedToCenter ||
      evidence.durationMs < 300 ||
      evidence.durationMs > challengeTtlMs ||
      evidence.framesEvaluated < 3 ||
      evidence.faceScoreMin < 0.6 ||
      evidence.antispoofScoreMin < 0.6 ||
      evidence.passiveLivenessScoreMin < 0.6
    ) {
      throw new AppError("Active liveness challenge was not completed. Start a new attempt.", 400);
    }
    return record;
  }
}

export const faceVerificationChallengeService = new FaceVerificationChallengeService();
