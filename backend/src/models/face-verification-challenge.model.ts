import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type FaceLivenessChallenge = "blink" | "turn_left" | "turn_right";
export type AttendanceAction = "check-in" | "check-out";

export type FaceVerificationChallenge = {
  userId: Types.ObjectId;
  action: AttendanceAction;
  challenge: FaceLivenessChallenge;
  status: "issued" | "consumed" | "failed";
  expiresAt: Date;
  consumedAt?: Date;
  deviceIdHash?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FaceVerificationChallengeDocument = HydratedDocument<FaceVerificationChallenge>;

const faceVerificationChallengeSchema = new Schema<FaceVerificationChallenge>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, enum: ["check-in", "check-out"], required: true },
    challenge: { type: String, enum: ["blink", "turn_left", "turn_right"], required: true },
    status: { type: String, enum: ["issued", "consumed", "failed"], default: "issued", index: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
    deviceIdHash: { type: String, select: false },
  },
  { timestamps: true, versionKey: false },
);

faceVerificationChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
faceVerificationChallengeSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const FaceVerificationChallengeModel = model("FaceVerificationChallenge", faceVerificationChallengeSchema);
