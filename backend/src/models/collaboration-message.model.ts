import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type CollaborationMessageAttachment = {
  fileName: string;
  storedPath: string;
  mimeType: string;
  size: number;
  url: string;
};

export type CollaborationMessageReaction = {
  emoji: string;
  userId: Types.ObjectId;
};

export type CollaborationMessage = {
  roomId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  mentionedUserIds: Types.ObjectId[];
  attachments: CollaborationMessageAttachment[];
  reactions: CollaborationMessageReaction[];
  isPinned: boolean;
  pinnedBy?: Types.ObjectId;
  pinnedAt?: Date;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CollaborationMessageDocument = HydratedDocument<CollaborationMessage>;

const attachmentSchema = new Schema<CollaborationMessageAttachment>(
  {
    fileName: { type: String, required: true, trim: true, maxlength: 200 },
    storedPath: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

const reactionSchema = new Schema<CollaborationMessageReaction>(
  {
    emoji: { type: String, required: true, maxlength: 8 },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false },
);

const collaborationMessageSchema = new Schema<CollaborationMessage>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "CollaborationRoom",
      required: true,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    mentionedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    attachments: [attachmentSchema],
    reactions: [reactionSchema],
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    pinnedBy: { type: Schema.Types.ObjectId, ref: "User" },
    pinnedAt: { type: Date },
    editedAt: { type: Date },
    deletedAt: { type: Date, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

collaborationMessageSchema.index({ roomId: 1, createdAt: -1 });
collaborationMessageSchema.index({ body: "text" });

export const CollaborationMessageModel = model("CollaborationMessage", collaborationMessageSchema);
