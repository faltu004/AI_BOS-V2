import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import type { ChannelPreference, NotificationCategory } from "../constants/notification.js";

export type NotificationPreference = {
  userId: Types.ObjectId;
  preferences: Partial<Record<NotificationCategory, ChannelPreference>>;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationPreferenceDocument = HydratedDocument<NotificationPreference>;

const notificationPreferenceSchema = new Schema<NotificationPreference>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    preferences: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const NotificationPreferenceModel = model("NotificationPreference", notificationPreferenceSchema);
