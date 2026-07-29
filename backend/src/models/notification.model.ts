import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import {
  notificationCategories,
  notificationPriorities,
  type NotificationCategory,
  type NotificationPriority,
} from "../constants/notification.js";

export type NotificationChannelState = {
  inApp: boolean;
  email: boolean;
  whatsapp: boolean;
  push: boolean;
};

export type Notification = {
  recipientUserId: Types.ObjectId;
  actorUserId?: Types.ObjectId;
  type: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  actionUrl?: string;
  sourceType?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  channels: NotificationChannelState;
  emailSentAt?: Date;
  whatsappSentAt?: Date;
  pushSentAt?: Date;
  isRead: boolean;
  createdAt: Date;
};

export type NotificationDocument = HydratedDocument<Notification>;

const channelStateSchema = new Schema<NotificationChannelState>(
  {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
  },
  { _id: false },
);

const notificationSchema = new Schema<Notification>(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    category: {
      type: String,
      enum: notificationCategories,
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: notificationPriorities,
      default: "Medium",
    },
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
    actionUrl: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    sourceType: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    sourceId: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    channels: {
      type: channelStateSchema,
      default: () => ({ inApp: true, email: false, whatsapp: false, push: false }),
    },
    emailSentAt: { type: Date },
    whatsappSentAt: { type: Date },
    pushSentAt: { type: Date },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

notificationSchema.index({ recipientUserId: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, category: 1 });
notificationSchema.index({ recipientUserId: 1, isRead: 1 });

export const NotificationModel = model("Notification", notificationSchema);
