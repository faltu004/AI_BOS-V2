import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import { collaborationRoomTypes, type CollaborationRoomType } from "../constants/collaboration.js";

export type CollaborationRoom = {
  organizationId: Types.ObjectId;
  roomType: CollaborationRoomType;
  name: string;
  teamId?: Types.ObjectId;
  projectId?: Types.ObjectId;
  entityType?: string;
  entityId?: string;
  participantIds: Types.ObjectId[];
  createdBy?: Types.ObjectId;
  isArchived: boolean;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CollaborationRoomDocument = HydratedDocument<CollaborationRoom>;

const collaborationRoomSchema = new Schema<CollaborationRoom>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    roomType: {
      type: String,
      enum: collaborationRoomTypes,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },
    entityType: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    entityId: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    participantIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastMessageAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

collaborationRoomSchema.index(
  { organizationId: 1, roomType: 1, teamId: 1 },
  { unique: true, partialFilterExpression: { roomType: "team" } },
);
collaborationRoomSchema.index(
  { organizationId: 1, roomType: 1, projectId: 1 },
  { unique: true, partialFilterExpression: { roomType: "project" } },
);
collaborationRoomSchema.index(
  { organizationId: 1, roomType: 1, entityType: 1, entityId: 1 },
  { unique: true, partialFilterExpression: { roomType: "entity" } },
);
collaborationRoomSchema.index(
  { organizationId: 1 },
  { unique: true, partialFilterExpression: { roomType: "workspace" } },
);

export const CollaborationRoomModel = model("CollaborationRoom", collaborationRoomSchema);
