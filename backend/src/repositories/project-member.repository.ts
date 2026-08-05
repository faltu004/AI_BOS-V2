import type { Types } from "mongoose";
import { ProjectMemberModel, type ProjectMemberRole } from "../models/project-member.model.js";

export class ProjectMemberRepository {
  async upsert(projectId: string | Types.ObjectId, userId: string | Types.ObjectId, role: ProjectMemberRole, addedBy?: string) {
    return ProjectMemberModel.findOneAndUpdate(
      { projectId, userId },
      { $set: { role }, $setOnInsert: { projectId, userId, addedBy } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
      .populate("userId", "fullName email role")
      .lean();
  }

  async listByProject(projectId: string) {
    return ProjectMemberModel.find({ projectId })
      .sort({ role: 1, createdAt: 1 })
      .populate("userId", "fullName email role")
      .lean();
  }

  async find(projectId: string, userId: string) {
    return ProjectMemberModel.findOne({ projectId, userId }).lean();
  }

  async remove(projectId: string, userId: string) {
    return ProjectMemberModel.findOneAndDelete({ projectId, userId }).select("_id").lean();
  }

  async deleteByProjects(projectIds: string[]) {
    return ProjectMemberModel.deleteMany({ projectId: { $in: projectIds } });
  }
}

export const projectMemberRepository = new ProjectMemberRepository();
