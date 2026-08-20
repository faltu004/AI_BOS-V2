import {
  model,
  Schema,
  type HydratedDocument,
} from "mongoose";

export const softwarePackageTypes = [
  "MSI",
] as const;

export type SoftwarePackageType =
  (typeof softwarePackageTypes)[number];

export type SoftwareCatalogPackage = {
  packageId: string;

  name: string;
  version: string;
  publisher: string;

  packageType: SoftwarePackageType;

  downloadUrl: string;
  sha256: string;
  productCode: string;

  enabled: boolean;

  createdBy?: string;
  updatedBy?: string;
};

export type SoftwareCatalogPackageDocument =
  HydratedDocument<SoftwareCatalogPackage>;

const softwareCatalogPackageSchema =
  new Schema<SoftwareCatalogPackage>(
    {
      packageId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        maxlength: 100,
      },

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
        index: true,
      },

      version: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      publisher: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
        index: true,
      },

      packageType: {
        type: String,
        required: true,
        enum: softwarePackageTypes,
        default: "MSI",
      },

      downloadUrl: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2048,
      },

      sha256: {
        type: String,
        required: true,
        trim: true,
        minlength: 64,
        maxlength: 64,
      },

      productCode: {
        type: String,
        required: true,
        trim: true,
        maxlength: 64,
      },

      enabled: {
        type: Boolean,
        default: true,
        index: true,
      },

      createdBy: {
        type: String,
        maxlength: 200,
      },

      updatedBy: {
        type: String,
        maxlength: 200,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

softwareCatalogPackageSchema.index({
  enabled: 1,
  name: 1,
});

export const SoftwareCatalogPackageModel =
  model(
    "SoftwareCatalogPackage",
    softwareCatalogPackageSchema,
  );
