import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type FaceEnrollmentStatus = "active" | "revoked" | "reset_required";

export type FaceEnrollmentQualityCheck = {
  faceScore: number;
  real: number;
  live: number;
  faceSize: number;
  pose?: { roll: number; yaw: number; pitch: number } | null;
};

export type FaceEnrollment = {
  userId: Types.ObjectId;
  status: FaceEnrollmentStatus;
  provider: string;
  templateEncrypted?: string;
  templateHash?: string;
  templateVersion: string;
  samplesCount: number;
  qualityChecks: FaceEnrollmentQualityCheck[];
  consentAcceptedAt: Date;
  enrolledAt?: Date;
  revokedAt?: Date;
  resetBy?: Types.ObjectId;
  resetReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FaceEnrollmentDocument = HydratedDocument<FaceEnrollment>;

const qualityCheckSchema = new Schema<FaceEnrollmentQualityCheck>(
  {
    faceScore: { type: Number, required: true, min: 0, max: 1 },
    real: { type: Number, required: true, min: 0, max: 1 },
    live: { type: Number, required: true, min: 0, max: 1 },
    faceSize: { type: Number, required: true, min: 1 },
    pose: {
      roll: { type: Number },
      yaw: { type: Number },
      pitch: { type: Number },
    },
  },
  { _id: false },
);

const faceEnrollmentSchema = new Schema<FaceEnrollment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["active", "revoked", "reset_required"], required: true, index: true },
    provider: { type: String, required: true, trim: true, maxlength: 80 },
    templateEncrypted: { type: String, select: false },
    templateHash: { type: String, select: false },
    templateVersion: { type: String, required: true, trim: true, maxlength: 80 },
    samplesCount: { type: Number, required: true, min: 0, max: 10 },
    qualityChecks: { type: [qualityCheckSchema], default: [] },
    consentAcceptedAt: { type: Date, required: true },
    enrolledAt: { type: Date },
    revokedAt: { type: Date },
    resetBy: { type: Schema.Types.ObjectId, ref: "User" },
    resetReason: { type: String, trim: true, maxlength: 240 },
  },
  { timestamps: true, versionKey: false },
);

faceEnrollmentSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);

export const FaceEnrollmentModel = model("FaceEnrollment", faceEnrollmentSchema);
