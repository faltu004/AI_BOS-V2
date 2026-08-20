import {
  Types,
} from "mongoose";

import {
  administratorMonitoringPermissionKeys,
  administratorMonitoringPermissionSet,
  type AdministratorMonitoringPermissionKey,
} from "../constants/administrator-monitoring-access.js";
import {
  AdministratorMonitoringAccessModel,
} from "../models/administrator-monitoring-access.model.js";
import {
  UserModel,
} from "../models/user.model.js";
import {
  auditService,
} from "./audit.service.js";
import {
  AppError,
} from "../utils/app-error.js";

const administratorRoles =
  new Set([
    "Administrator",
    "Admin",
  ]);

function isOwnerRole(
  role: string,
): boolean {
  return (
    role === "Owner" ||
    role === "CEO"
  );
}

function publicAccess(
  policy: {
    enabled: boolean;
    permissionKeys: string[];
    changedBy?: unknown;
    changedAt?: Date;
    updatedAt?: Date;
  } | null,
) {
  const changedBy =
    typeof policy?.changedBy ===
      "object" &&
    policy.changedBy !== null &&
    "_id" in policy.changedBy
      ? {
          id: String(
            (
              policy.changedBy as {
                _id: unknown;
              }
            )._id,
          ),
          fullName:
            "fullName" in
            policy.changedBy
              ? String(
                  (
                    policy.changedBy as {
                      fullName: unknown;
                    }
                  ).fullName ??
                    "",
                ) || undefined
              : undefined,
          email:
            "email" in
            policy.changedBy
              ? String(
                  (
                    policy.changedBy as {
                      email: unknown;
                    }
                  ).email ??
                    "",
                ) || undefined
              : undefined,
        }
      : policy?.changedBy
        ? String(
            policy.changedBy,
          )
        : undefined;

  return {
    enabled:
      policy?.enabled ??
      false,
    permissionKeys:
      policy?.permissionKeys ??
      [],
    changedBy,
    changedAt:
      policy?.changedAt ??
      policy?.updatedAt,
  };
}

export class AdministratorMonitoringAccessService {
  async getCurrent(
    userId: string,
    role: string,
  ) {
    if (isOwnerRole(role)) {
      return {
        enabled: true,
        permissionKeys: [
          ...administratorMonitoringPermissionKeys,
        ],
        ownerAuthority: true,
      };
    }

    if (!administratorRoles.has(role)) {
      throw new AppError(
        "Monitoring access is unavailable for this role",
        403,
      );
    }

    const policy =
      await AdministratorMonitoringAccessModel
        .findOne({
          administratorUserId:
            userId,
        })
        .populate(
          "changedBy",
          "fullName email",
        )
        .lean();

    return {
      ...publicAccess(
        policy,
      ),
      ownerAuthority: false,
    };
  }

  async listAdministrators() {
    const administrators =
      await UserModel.find({
        role: {
          $in: [
            "Administrator",
            "Admin",
          ],
        },
      })
        .select(
          "_id fullName email isActive",
        )
        .sort({
          fullName: 1,
        })
        .lean();

    const policies =
      await AdministratorMonitoringAccessModel
        .find({
          administratorUserId: {
            $in: administrators.map(
              (administrator) =>
                administrator._id,
            ),
          },
        })
        .populate(
          "changedBy",
          "fullName email",
        )
        .lean();

    const policyByUserId =
      new Map(
        policies.map(
          (policy) => [
            String(
              policy.administratorUserId,
            ),
            policy,
          ],
        ),
      );

    return administrators.map(
      (administrator) => ({
        administratorUserId:
          String(
            administrator._id,
          ),
        fullName:
          administrator.fullName,
        email:
          administrator.email,
        isActive:
          administrator.isActive,
        ...publicAccess(
          policyByUserId.get(
            String(
              administrator._id,
            ),
          ) ?? null,
        ),
      }),
    );
  }

  async updateAdministrator(
    administratorUserId: string,
    input: {
      enabled: boolean;
      permissionKeys: string[];
    },
    changedBy: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        administratorUserId,
      )
    ) {
      throw new AppError(
        "Administrator user ID is invalid",
        400,
      );
    }

    const administrator =
      await UserModel.findById(
        administratorUserId,
      )
        .select(
          "_id fullName email role isActive",
        )
        .lean();

    if (
      !administrator ||
      !administratorRoles.has(
        administrator.role,
      )
    ) {
      throw new AppError(
        "Administrator account not found",
        404,
      );
    }

    const permissionKeys =
      [
        ...new Set(
          input.permissionKeys,
        ),
      ];

    if (
      permissionKeys.some(
        (key) =>
          !administratorMonitoringPermissionSet.has(
            key,
          ),
      )
    ) {
      throw new AppError(
        "Administrator monitoring permission is invalid",
        400,
      );
    }

    const before =
      await AdministratorMonitoringAccessModel
        .findOne({
          administratorUserId:
            administrator._id,
        })
        .lean();

    const changedAt =
      new Date();

    const policy =
      await AdministratorMonitoringAccessModel
        .findOneAndUpdate(
          {
            administratorUserId:
              administrator._id,
          },
          {
            $set: {
              enabled:
                input.enabled,
              permissionKeys,
              changedBy,
              changedAt,
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          },
        )
        .populate(
          "changedBy",
          "fullName email",
        )
        .lean();

    await auditService.record({
      actorUserId:
        changedBy,
      action:
        "administrator_monitoring_access.update",
      targetType:
        "AdministratorMonitoringAccess",
      targetId:
        administrator._id,
      before:
        publicAccess(
          before,
        ),
      after:
        publicAccess(
          policy,
        ),
      metadata: {
        administratorEmail:
          administrator.email,
      },
    });

    return {
      administratorUserId:
        String(
          administrator._id,
        ),
      fullName:
        administrator.fullName,
      email:
        administrator.email,
      isActive:
        administrator.isActive,
      ...publicAccess(
        policy,
      ),
    };
  }

  async hasPermission(
    userId: string,
    role: string,
    permission?:
      AdministratorMonitoringPermissionKey,
  ): Promise<boolean> {
    if (isOwnerRole(role)) {
      return true;
    }

    if (!administratorRoles.has(role)) {
      return false;
    }

    const policy =
      await AdministratorMonitoringAccessModel
        .findOne({
          administratorUserId:
            userId,
        })
        .select(
          "enabled permissionKeys",
        )
        .lean();

    if (!policy?.enabled) {
      return false;
    }

    return permission
      ? policy.permissionKeys.includes(
          permission,
        )
      : true;
  }

  async requirePermission(
    userId: string,
    role: string,
    permission?:
      AdministratorMonitoringPermissionKey,
  ): Promise<void> {
    if (
      !(await this.hasPermission(
        userId,
        role,
        permission,
      ))
    ) {
      throw new AppError(
        "Owner-enabled Monitoring and Device Management permission is required",
        403,
      );
    }
  }
}

export const administratorMonitoringAccessService =
  new AdministratorMonitoringAccessService();
