import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export const commentResourceTypes = ["Task", "Project"] as const;
export type CommentResourceType = (typeof commentResourceTypes)[number];

export type TaskComment = {
  resourceType: CommentResourceType;
  resourceId: Types.ObjectId;
  authorId: Types.ObjectId;
  body: string;
  mentionedUserIds: Types.ObjectId[];
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskCommentDocument = HydratedDocument<TaskComment>;

const taskCommentSchema = new Schema<TaskComment>(
  {
    resourceType: { type: String, enum: commentResourceTypes, required: true, index: true },
    resourceId: { type: Schema.Types.ObjectId, required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
    mentionedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    editedAt: { type: Date },
    deletedAt: { type: Date, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

taskCommentSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });

export const TaskCommentModel = model("TaskComment", taskCommentSchema);
