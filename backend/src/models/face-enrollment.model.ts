import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type FaceEnrollmentStatus = "active" | "revoked" | "reset_required";

export type FaceEnrollmentQualityCheck = {
  facePresent: boolean;
  singleFace: boolean;
  imageQuality: "pass" | "fail";
  liveness: "pass" | "fail" | "not_supported";
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
    facePresent: { type: Boolean, required: true },
    singleFace: { type: Boolean, required: true },
    imageQuality: { type: String, enum: ["pass", "fail"], required: true },
    liveness: { type: String, enum: ["pass", "fail", "not_supported"], required: true },
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
