import {
  model,
  Schema,
  type HydratedDocument,
  type Types,
} from "mongoose";

export type AdministratorMonitoringAccess = {
  administratorUserId: Types.ObjectId;
  enabled: boolean;
  permissionKeys: string[];
  changedBy?: Types.ObjectId;
  changedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type AdministratorMonitoringAccessDocument =
  HydratedDocument<
    AdministratorMonitoringAccess
  >;

const administratorMonitoringAccessSchema =
  new Schema<AdministratorMonitoringAccess>(
    {
      administratorUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
      },
      enabled: {
        type: Boolean,
        required: true,
        default: false,
      },
      permissionKeys: {
        type: [String],
        required: true,
        default: [],
      },
      changedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      changedAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

export const AdministratorMonitoringAccessModel =
  model(
    "AdministratorMonitoringAccess",
    administratorMonitoringAccessSchema,
  );
