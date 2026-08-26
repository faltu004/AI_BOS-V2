import { Types } from "mongoose";
import { FaceEnrollmentModel, type FaceEnrollment } from "../models/face-enrollment.model.js";

export class FaceEnrollmentRepository {
  async findActiveByUser(userId: string) {
    return FaceEnrollmentModel.findOne({ userId, status: "active" }).lean();
  }

  async findActiveWithTemplate(userId: string) {
    return FaceEnrollmentModel.findOne({ userId, status: "active" }).select("+templateEncrypted +templateHash");
  }

  async upsertActive(input: Omit<FaceEnrollment, "createdAt" | "updatedAt">) {
    await FaceEnrollmentModel.updateMany(
      { userId: input.userId, status: "active" },
      {
        $set: { status: "revoked", revokedAt: new Date(), resetReason: "Replaced by newer enrollment" },
        $unset: { templateEncrypted: 1, templateHash: 1 },
      },
    );

    return FaceEnrollmentModel.create(input);
  }

  async resetUserEnrollment(userId: string, actorUserId: string, reason: string) {
    return FaceEnrollmentModel.updateMany(
      { userId: new Types.ObjectId(userId), status: "active" },
      {
        $set: {
          status: "reset_required",
          revokedAt: new Date(),
          resetBy: new Types.ObjectId(actorUserId),
          resetReason: reason,
        },
        $unset: { templateEncrypted: 1, templateHash: 1 },
      },
    );
  }

  async deleteOwnEnrollment(userId: string, reason: string) {
    return FaceEnrollmentModel.updateMany(
      { userId: new Types.ObjectId(userId), status: "active" },
      {
        $set: { status: "revoked", revokedAt: new Date(), resetReason: reason },
        $unset: { templateEncrypted: 1, templateHash: 1 },
      },
    );
  }

  async findLatestStatusesByUsers(userIds: string[]) {
    if (userIds.length === 0) return [];
    return FaceEnrollmentModel.find({ userId: { $in: userIds } })
      .select("userId status enrolledAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
  }
}

export const faceEnrollmentRepository = new FaceEnrollmentRepository();
