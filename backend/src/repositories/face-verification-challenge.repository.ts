import { Types } from "mongoose";
import { FaceVerificationChallengeModel, type AttendanceAction, type FaceLivenessChallenge } from "../models/face-verification-challenge.model.js";

export class FaceVerificationChallengeRepository {
  async issue(input: {
    userId: string;
    action: AttendanceAction;
    challenge: FaceLivenessChallenge;
    expiresAt: Date;
    deviceIdHash?: string;
  }) {
    await FaceVerificationChallengeModel.updateMany(
      { userId: new Types.ObjectId(input.userId), status: "issued" },
      { $set: { status: "failed", consumedAt: new Date() } },
    );
    return FaceVerificationChallengeModel.create({
      ...input,
      userId: new Types.ObjectId(input.userId),
      status: "issued",
    });
  }

  async consume(challengeId: string, userId: string, action: AttendanceAction) {
    if (!Types.ObjectId.isValid(challengeId)) return null;
    return FaceVerificationChallengeModel.findOneAndUpdate(
      {
        _id: challengeId,
        userId: new Types.ObjectId(userId),
        action,
        status: "issued",
        expiresAt: { $gt: new Date() },
      },
      { $set: { status: "consumed", consumedAt: new Date() } },
      { new: true },
    ).lean();
  }
}

export const faceVerificationChallengeRepository = new FaceVerificationChallengeRepository();
