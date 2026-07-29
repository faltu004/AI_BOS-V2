import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import {
  notificationCategories,
  notificationPriorities,
  recurrenceFrequencies,
  type NotificationCategory,
  type NotificationPriority,
  type RecurrenceFrequency,
} from "../constants/notification.js";

export type ScheduledNotificationRecurrence = {
  frequency: RecurrenceFrequency;
  interval: number;
  endDate?: Date;
};

export type ScheduledNotification = {
  createdBy: Types.ObjectId;
  recipientUserIds: Types.ObjectId[];
  recipientRoles: string[];
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionUrl?: string;
  scheduledFor: Date;
  recurrence?: ScheduledNotificationRecurrence;
  isActive: boolean;
  lastFiredAt?: Date;
  nextFireAt: Date;
  timesFired: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduledNotificationDocument = HydratedDocument<ScheduledNotification>;

const recurrenceSchema = new Schema<ScheduledNotificationRecurrence>(
  {
    frequency: { type: String, enum: recurrenceFrequencies, required: true },
    interval: { type: Number, min: 1, default: 1 },
    endDate: { type: Date },
  },
  { _id: false },
);

const scheduledNotificationSchema = new Schema<ScheduledNotification>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    recipientRoles: [{ type: String, trim: true }],
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      enum: notificationCategories,
      required: true,
    },
    priority: {
      type: String,
      enum: notificationPriorities,
      default: "Medium",
    },
    actionUrl: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    recurrence: {
      type: recurrenceSchema,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastFiredAt: { type: Date },
    nextFireAt: {
      type: Date,
      required: true,
      index: true,
    },
    timesFired: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

scheduledNotificationSchema.index({ isActive: 1, nextFireAt: 1 });
scheduledNotificationSchema.index({ createdBy: 1, createdAt: -1 });

export const ScheduledNotificationModel = model("ScheduledNotification", scheduledNotificationSchema);
