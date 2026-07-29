import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type ResetPassword = {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
};

export type ResetPasswordDocument = HydratedDocument<ResetPassword>;

const resetPasswordSchema = new Schema<ResetPassword>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false }, versionKey: false },
);

resetPasswordSchema.index({ userId: 1, createdAt: -1 });

export const ResetPasswordModel = model("ResetPassword", resetPasswordSchema);