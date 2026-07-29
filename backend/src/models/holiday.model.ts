import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import { holidayTypes, type HolidayType } from "../constants/holiday.js";

export type Holiday = {
  organizationId: Types.ObjectId;
  name: string;
  date: Date;
  type: HolidayType;
  description?: string;
  isRecurringAnnually: boolean;
  branchIds: Types.ObjectId[];
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type HolidayDocument = HydratedDocument<Holiday>;

const holidaySchema = new Schema<Holiday>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: holidayTypes,
      default: "Public",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isRecurringAnnually: {
      type: Boolean,
      default: false,
    },
    branchIds: [{ type: Schema.Types.ObjectId, ref: "Branch" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

holidaySchema.index({ organizationId: 1, date: 1 });
holidaySchema.index({ organizationId: 1, name: 1, date: 1 }, { unique: true });

export const HolidayModel = model("Holiday", holidaySchema);
