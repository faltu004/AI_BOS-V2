import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import {
  projectCategories,
  projectPriorities,
  projectStatuses,
  type ProjectCategory,
  type ProjectPriority,
  type ProjectStatus,
} from "../constants/projects.js";

export type ProjectAttachment = {
  name: string;
  url?: string;
  mimeType?: string;
  size?: number;
};

export type Project = {
  projectName: string;
  projectCode: string;
  description?: string;
  category: ProjectCategory;
  priority: ProjectPriority;
  status: ProjectStatus;
  progress: number;
  startDate: Date;
  endDate: Date;
  budget: number;
  estimatedHours: number;
  client?: string;
  teamMembers: string[];
  projectManager: string;
  attachments: ProjectAttachment[];
  notes?: string;
  tags: string[];
  isArchived: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectDocument = HydratedDocument<Project>;

const attachmentSchema = new Schema<ProjectAttachment>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number, min: 0 },
  },
  { _id: false },
);

const projectSchema = new Schema<Project>(
  {
    projectName: { type: String, required: true, trim: true, maxlength: 180, index: true },
    projectCode: { type: String, required: true, unique: true, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 3000 },
    category: { type: String, enum: projectCategories, default: "Internal", index: true },
    priority: { type: String, enum: projectPriorities, default: "Medium", index: true },
    status: { type: String, enum: projectStatuses, default: "Planning", index: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    budget: { type: Number, min: 0, default: 0 },
    estimatedHours: { type: Number, min: 0, default: 0 },
    client: { type: String, trim: true, maxlength: 180, index: true },
    teamMembers: [{ type: String, trim: true }],
    projectManager: { type: String, required: true, trim: true, maxlength: 120, index: true },
    attachments: { type: [attachmentSchema], default: [] },
    notes: { type: String, trim: true, maxlength: 5000 },
    tags: [{ type: String, trim: true, lowercase: true, index: true }],
    isArchived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

projectSchema.index({
  projectName: "text",
  projectCode: "text",
  description: "text",
  client: "text",
  tags: "text",
});

export const ProjectModel = model("Project", projectSchema);
