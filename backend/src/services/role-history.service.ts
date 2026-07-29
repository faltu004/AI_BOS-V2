import { roleHistoryRepository } from "../repositories/role-history.repository.js";
import type { ListRoleHistoryQuery } from "../validation/role-history.validation.js";

export class RoleHistoryService {
  async listByRole(roleId: string, query: ListRoleHistoryQuery) {
    return roleHistoryRepository.listByRole(roleId, query);
  }
}

export const roleHistoryService = new RoleHistoryService();
