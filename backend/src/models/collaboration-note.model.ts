import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type CollaborationNote = {
  roomId: Types.ObjectId;
  title: string;
  body: string;
  lastEditedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type CollaborationNoteDocument = HydratedDocument<CollaborationNote>;

const collaborationNoteSchema = new Schema<CollaborationNote>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "CollaborationRoom",
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 180,
      default: "Shared notes",
    },
    body: {
      type: String,
      trim: true,
      maxlength: 20000,
      default: "",
    },
    lastEditedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const CollaborationNoteModel = model("CollaborationNote", collaborationNoteSchema);
