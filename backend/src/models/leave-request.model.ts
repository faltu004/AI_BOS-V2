import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export const leaveTypes = ["Paid Leave", "Sick Leave", "Casual Leave", "Unpaid Leave"] as const;
export type LeaveType = (typeof leaveTypes)[number];

export type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export type LeaveRequest = {
  userId: Types.ObjectId;
  approverId: Types.ObjectId;
  type: LeaveType;
  from: string;
  to: string;
  reason: string;
  status: LeaveStatus;
  decidedAt?: Date;
  decisionNote?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LeaveRequestDocument = HydratedDocument<LeaveRequest>;

const leaveRequestSchema = new Schema<LeaveRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    approverId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: leaveTypes, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ["Pending", "Approved", "Rejected", "Cancelled"], default: "Pending", index: true },
    decidedAt: { type: Date },
    decisionNote: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

leaveRequestSchema.index({ userId: 1, createdAt: -1 });
leaveRequestSchema.index({ approverId: 1, status: 1, createdAt: -1 });

export const LeaveRequestModel = model("LeaveRequest", leaveRequestSchema);
