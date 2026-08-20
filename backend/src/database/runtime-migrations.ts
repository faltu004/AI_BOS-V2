import {
  administratorMonitoringPermissionKeys,
} from "../constants/administrator-monitoring-access.js";
import {
  AdministratorMonitoringAccessModel,
} from "../models/administrator-monitoring-access.model.js";
import {
  RuntimeMigrationModel,
} from "../models/runtime-migration.model.js";
import {
  UserModel,
} from "../models/user.model.js";

const administratorMonitoringAccessMigrationKey =
  "administrator-monitoring-access-v1";

export async function applyRuntimeMigrations():
  Promise<void> {
  const applied =
    await RuntimeMigrationModel
      .findOne({
        key:
          administratorMonitoringAccessMigrationKey,
      })
      .lean();

  if (applied) {
    return;
  }

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
        "_id",
      )
      .lean();

  if (administrators.length > 0) {
    await AdministratorMonitoringAccessModel
      .bulkWrite(
        administrators.map(
          (administrator) => ({
            updateOne: {
              filter: {
                administratorUserId:
                  administrator._id,
              },
              update: {
                $setOnInsert: {
                  administratorUserId:
                    administrator._id,
                  enabled: true,
                  permissionKeys: [
                    ...administratorMonitoringPermissionKeys,
                  ],
                },
              },
              upsert: true,
            },
          }),
        ),
      );
  }

  await RuntimeMigrationModel.create({
    key:
      administratorMonitoringAccessMigrationKey,
    appliedAt:
      new Date(),
  });
}
