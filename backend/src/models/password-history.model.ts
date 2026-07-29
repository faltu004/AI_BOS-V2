import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type PasswordHistory = {
  user: Types.ObjectId;
  passwordHash: string;
};

export type PasswordHistoryDocument = HydratedDocument<PasswordHistory>;

const passwordHistorySchema = new Schema<PasswordHistory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true, versionKey: false },
);

passwordHistorySchema.index({ user: 1, createdAt: -1 });

export const PasswordHistoryModel = model("PasswordHistory", passwordHistorySchema);

export type PasswordChange = {
  user: Types.ObjectId;
  previousPasswordHash: string;
  changedAt: Date;
  changedBy: Types.ObjectId;
};

export type PasswordChangeDocument = HydratedDocument<PasswordChange>;

const passwordChangeSchema = new Schema<PasswordChange>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    previousPasswordHash: { type: String, required: true, select: false },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: false, versionKey: false },
);

passwordChangeSchema.index({ user: 1, changedAt: -1 });

export const PasswordChangeModel = model("PasswordChange", passwordChangeSchema);
