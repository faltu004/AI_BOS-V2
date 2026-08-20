import {
  model,
  Schema,
  type HydratedDocument,
} from "mongoose";

export type RuntimeMigration = {
  key: string;
  appliedAt: Date;
};

export type RuntimeMigrationDocument =
  HydratedDocument<RuntimeMigration>;

const runtimeMigrationSchema =
  new Schema<RuntimeMigration>(
    {
      key: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },
      appliedAt: {
        type: Date,
        required: true,
      },
    },
    {
      versionKey: false,
    },
  );

export const RuntimeMigrationModel =
  model(
    "RuntimeMigration",
    runtimeMigrationSchema,
  );
