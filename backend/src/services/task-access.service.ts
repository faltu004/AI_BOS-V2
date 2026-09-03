import type { FilterQuery } from "mongoose";
import { ProjectMemberModel } from "../models/project-member.model.js";
import type { Task } from "../models/task.model.js";
import { TeamModel } from "../models/team.model.js";
import { UserModel } from "../models/user.model.js";
import type { AuthenticatedUser } from "../types/auth.js";
import { permissionService } from "./permission.service.js";

const taskManagementPermissions = [
  "task.view_stats",
  "task.export",
  "task.delete",
  "task.bulk_update",
  "task.bulk_delete",
] as const;

type UserScopeRecord = {
  _id: unknown;
  departmentId?: unknown;
  managerId?: unknown;
};

export type TaskAccess = {
  allTasks: boolean;
  actorUserId: string;
  visibleAssigneeIds: string[];
  managedAssigneeIds: string[];
  managedProjectIds: string[];
};

function referenceId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

function uniqueIds(ids: Array<string | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function subordinateIds(actorUserId: string, users: UserScopeRecord[]) {
  const subordinates = new Set<string>();
  let foundAnotherLevel = true;

  while (foundAnotherLevel) {
    foundAnotherLevel = false;
    for (const user of users) {
      const userId = referenceId(user._id);
      const managerId = referenceId(user.managerId);
      if (!userId || !managerId || subordinates.has(userId)) continue;
      if (managerId === actorUserId || subordinates.has(managerId)) {
        subordinates.add(userId);
        foundAnotherLevel = true;
      }
    }
  }

  return [...subordinates];
}

export class TaskAccessService {
  async resolve(actor: AuthenticatedUser): Promise<TaskAccess> {
    const effective = await permissionService.resolveEffectivePermissions(actor.role);
    if (effective.hasFullAccess) {
      return {
        allTasks: true,
        actorUserId: actor.id,
        visibleAssigneeIds: [],
        managedAssigneeIds: [],
        managedProjectIds: [],
      };
    }

    const actorProfile = await UserModel.findById(actor.id)
      .select("_id organizationId departmentId")
      .lean();

    const organizationId = referenceId(actorProfile?.organizationId);
    const users = organizationId
      ? await UserModel.find({ organizationId, isActive: true })
          .select("_id departmentId managerId")
          .lean()
      : [];

    const managedAssignees = new Set(subordinateIds(actor.id, users as UserScopeRecord[]));
    const normalizedRole = actor.role.trim().toLowerCase();
    const isDepartmentManager = normalizedRole === "manager"
      || normalizedRole === "department manager"
      || normalizedRole === "department-manager";
    const actorDepartmentId = referenceId(actorProfile?.departmentId);

    if (isDepartmentManager && actorDepartmentId) {
      for (const user of users as UserScopeRecord[]) {
        if (referenceId(user.departmentId) === actorDepartmentId) {
          const userId = referenceId(user._id);
          if (userId && userId !== actor.id) managedAssignees.add(userId);
        }
      }
    }

    const [ledTeams, managedProjectMemberships] = await Promise.all([
      TeamModel.find({ leadId: actor.id, status: "Active" }).select("memberIds").lean(),
      ProjectMemberModel.find({ userId: actor.id, role: { $in: ["Owner", "Manager"] } })
        .select("projectId")
        .lean(),
    ]);

    for (const team of ledTeams) {
      for (const memberId of team.memberIds ?? []) {
        const id = referenceId(memberId);
        if (id && id !== actor.id) managedAssignees.add(id);
      }
    }

    const hasTaskManagementPermission = taskManagementPermissions.some((key) =>
      effective.permissionKeys.has(key),
    );
    if (hasTaskManagementPermission) managedAssignees.add(actor.id);

    const managedAssigneeIds = [...managedAssignees];
    return {
      allTasks: false,
      actorUserId: actor.id,
      visibleAssigneeIds: uniqueIds([actor.id, ...managedAssigneeIds]),
      managedAssigneeIds,
      managedProjectIds: uniqueIds(
        managedProjectMemberships.map((membership) => referenceId(membership.projectId)),
      ),
    };
  }

  toFilter(access: TaskAccess): FilterQuery<Task> {
    if (access.allTasks) return {};

    const filters: FilterQuery<Task>[] = [
      { assigneeId: { $in: access.visibleAssigneeIds } },
    ];
    if (access.managedProjectIds.length > 0) {
      filters.push({ projectId: { $in: access.managedProjectIds } });
    }

    return { $or: filters };
  }

  canView(task: Pick<Task, "assigneeId" | "projectId">, access: TaskAccess) {
    if (access.allTasks) return true;
    const assigneeId = referenceId(task.assigneeId);
    const projectId = referenceId(task.projectId);
    return Boolean(
      (assigneeId && access.visibleAssigneeIds.includes(assigneeId))
      || (projectId && access.managedProjectIds.includes(projectId)),
    );
  }

  canManage(task: Pick<Task, "assigneeId" | "projectId">, access: TaskAccess) {
    if (access.allTasks) return true;
    const assigneeId = referenceId(task.assigneeId);
    const projectId = referenceId(task.projectId);
    return Boolean(
      (assigneeId && access.managedAssigneeIds.includes(assigneeId))
      || (projectId && access.managedProjectIds.includes(projectId)),
    );
  }
}

export const taskAccessService = new TaskAccessService();
