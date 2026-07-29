import type { Types } from "mongoose";
import { branchRepository } from "../repositories/branch.repository.js";
import { departmentRepository } from "../repositories/department.repository.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { teamRepository } from "../repositories/team.repository.js";
import { userRepository } from "../repositories/user.repository.js";

type UserSummary = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

type TeamNode = {
  id: string;
  name: string;
  description?: string;
  lead: UserSummary | null;
  members: UserSummary[];
};

type DepartmentNode = {
  id: string;
  name: string;
  code?: string;
  head: UserSummary | null;
  teams: TeamNode[];
  children: DepartmentNode[];
};

type ReportingNode = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  directReports: ReportingNode[];
};

function toUserSummary(user: { _id: unknown; fullName: string; email: string; role: string } | undefined): UserSummary | null {
  if (!user) return null;
  return { id: String(user._id), fullName: user.fullName, email: user.email, role: user.role };
}

export class OrgHierarchyService {
  async buildHierarchy(organizationIdInput?: Types.ObjectId) {
    const organizationId =
      organizationIdInput ?? ((await organizationRepository.getOrCreateDefault())._id as Types.ObjectId);

    const [departments, branches, teams, users] = await Promise.all([
      departmentRepository.listAll(organizationId),
      branchRepository.listAll(organizationId),
      teamRepository.listAll(organizationId),
      userRepository.listByOrganization(String(organizationId)),
    ]);

    const userById = new Map(users.map((user) => [String(user._id), user]));

    const teamsByDepartment = new Map<string, TeamNode[]>();
    for (const team of teams) {
      const departmentId = String(team.departmentId);
      const node: TeamNode = {
        id: String(team._id),
        name: team.name,
        description: team.description,
        lead: toUserSummary(userById.get(String(team.leadId))),
        members: (team.memberIds ?? [])
          .map((memberId) => toUserSummary(userById.get(String(memberId))))
          .filter((member): member is UserSummary => member !== null),
      };
      const existing = teamsByDepartment.get(departmentId) ?? [];
      existing.push(node);
      teamsByDepartment.set(departmentId, existing);
    }

    const departmentNodes = new Map<string, DepartmentNode>();
    for (const department of departments) {
      const id = String(department._id);
      departmentNodes.set(id, {
        id,
        name: department.name,
        code: department.code,
        head: toUserSummary(userById.get(String(department.headId))),
        teams: teamsByDepartment.get(id) ?? [],
        children: [],
      });
    }

    const departmentRoots: DepartmentNode[] = [];
    for (const department of departments) {
      const id = String(department._id);
      const node = departmentNodes.get(id);
      if (!node) continue;

      const parentId = department.parentDepartmentId ? String(department.parentDepartmentId) : undefined;
      const parentNode = parentId ? departmentNodes.get(parentId) : undefined;

      if (parentNode) {
        parentNode.children.push(node);
      } else {
        departmentRoots.push(node);
      }
    }

    const reportingNodes = new Map<string, ReportingNode>();
    const managerIdOf = new Map<string, string | undefined>();
    for (const user of users) {
      const id = String(user._id);
      reportingNodes.set(id, {
        id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        directReports: [],
      });
      managerIdOf.set(id, user.managerId ? String(user.managerId) : undefined);
    }

    // Walks the manager chain starting at `startId` to check whether `candidateAncestorId`
    // appears in it. Used to refuse an edge that would otherwise close a reporting-line loop.
    function isAncestor(candidateAncestorId: string, startId: string): boolean {
      let current: string | undefined = startId;
      const seen = new Set<string>();
      while (current) {
        if (current === candidateAncestorId) return true;
        if (seen.has(current)) return false;
        seen.add(current);
        current = managerIdOf.get(current);
      }
      return false;
    }

    const reportingRoots: ReportingNode[] = [];
    let cycleDetected = false;

    for (const user of users) {
      const id = String(user._id);
      const node = reportingNodes.get(id);
      if (!node) continue;

      const managerId = managerIdOf.get(id);
      const managerNode = managerId ? reportingNodes.get(managerId) : undefined;

      if (!managerId || !managerNode) {
        reportingRoots.push(node);
        continue;
      }

      if (managerId === id || isAncestor(id, managerId)) {
        cycleDetected = true;
        reportingRoots.push(node);
        continue;
      }

      managerNode.directReports.push(node);
    }

    const unassignedUsers = users
      .filter((user) => !user.departmentId)
      .map((user) => toUserSummary(user))
      .filter((user): user is UserSummary => user !== null);

    return {
      departments: departmentRoots,
      reportingTree: reportingRoots,
      branches: branches.map((branch) => ({
        id: String(branch._id),
        name: branch.name,
        city: branch.city,
        isHeadOffice: branch.isHeadOffice,
      })),
      unassignedUsers,
      cycleDetected,
    };
  }
}

export const orgHierarchyService = new OrgHierarchyService();
