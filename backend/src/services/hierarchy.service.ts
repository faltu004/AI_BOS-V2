import { userRepository } from "../repositories/user.repository.js";
import { permissionService } from "./permission.service.js";
import { AppError } from "../utils/app-error.js";

const maxChainHops = 20;

/** Walks `targetId`'s manager chain looking for `actorId`. True if actor is target's direct or indirect manager. */
export async function isSeniorOf(actorId: string, targetId: string): Promise<boolean> {
  if (actorId === targetId) return false;

  let current = await userRepository.findById(targetId);
  let hops = 0;

  while (current?.managerId && hops < maxChainHops) {
    const managerId = current.managerId.toString();
    if (managerId === actorId) return true;
    current = await userRepository.findById(managerId);
    hops += 1;
  }

  return false;
}

/**
 * Guard for actions that move an employee between departments/managers or change their
 * role. Owner/Administrator (hasFullAccess roles) bypass the hierarchy check entirely,
 * matching how hasFullAccess already short-circuits requirePermission() everywhere else.
 * Everyone else must be the target's direct or indirect manager.
 */
export async function assertCanManage(actor: { id: string; role: string }, targetId: string): Promise<void> {
  const { hasFullAccess } = await permissionService.resolveEffectivePermissions(actor.role);
  if (hasFullAccess) return;

  const senior = await isSeniorOf(actor.id, targetId);
  if (!senior) {
    throw new AppError("You can only manage employees who report to you.", 403);
  }
}
