import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export const projectMemberRoles = ["Owner", "Manager", "Contributor", "Viewer"] as const;
export type ProjectMemberRole = (typeof projectMemberRoles)[number];

export type ProjectMember = {
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  role: ProjectMemberRole;
  addedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectMemberDocument = HydratedDocument<ProjectMember>;

const projectMemberSchema = new Schema<ProjectMember>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: projectMemberRoles, required: true, default: "Contributor", index: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectMemberSchema.index({ userId: 1, role: 1 });

export const ProjectMemberModel = model("ProjectMember", projectMemberSchema);
