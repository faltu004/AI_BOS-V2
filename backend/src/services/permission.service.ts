import { roleRepository } from "../repositories/role.repository.js";

export type EffectivePermissions = {
  hasFullAccess: boolean;
  permissionKeys: Set<string>;
};

const noAccess: EffectivePermissions = { hasFullAccess: false, permissionKeys: new Set() };
const builtInFullAccessRoles = new Set(["owner", "administrator", "ceo", "admin"]);

export class PermissionService {
  async resolveEffectivePermissions(roleSlug: string): Promise<EffectivePermissions> {
    const normalizedRole = roleSlug.toLowerCase();
    const role = await roleRepository.findBySlug(normalizedRole);

    if (!role || !role.isActive) {
      if (builtInFullAccessRoles.has(normalizedRole)) {
        return { hasFullAccess: true, permissionKeys: new Set() };
      }
      return noAccess;
    }

    return {
      hasFullAccess: role.hasFullAccess,
      permissionKeys: new Set(role.permissionKeys),
    };
  }

  async hasPermission(roleSlug: string, key: string): Promise<boolean> {
    const { hasFullAccess, permissionKeys } = await this.resolveEffectivePermissions(roleSlug);
    return hasFullAccess || permissionKeys.has(key);
  }
}

export const permissionService = new PermissionService();
