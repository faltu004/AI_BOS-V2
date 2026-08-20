import {
  SoftwareCatalogPackageModel,
  type SoftwarePackageType,
} from "../models/software-catalog-package.model.js";

export type CreateSoftwareCatalogRecord = {
  packageId: string;

  name: string;
  version: string;
  publisher: string;

  packageType: SoftwarePackageType;

  downloadUrl: string;
  sha256: string;
  productCode: string;

  enabled: boolean;

  createdBy: string;
  updatedBy: string;
};

export type UpdateSoftwareCatalogRecord = {
  name?: string;
  version?: string;
  publisher?: string;

  packageType?: SoftwarePackageType;

  downloadUrl?: string;
  sha256?: string;
  productCode?: string;

  enabled?: boolean;

  updatedBy: string;
};

export class SoftwareCatalogRepository {
  async create(
    input: CreateSoftwareCatalogRecord,
  ) {
    return SoftwareCatalogPackageModel
      .create(input);
  }

  async findAll() {
    return SoftwareCatalogPackageModel
      .find()
      .sort({
        name: 1,
        version: 1,
      })
      .lean();
  }

  async findByPackageId(
    packageId: string,
  ) {
    return SoftwareCatalogPackageModel
      .findOne({
        packageId,
      })
      .lean();
  }

  async updateByPackageId(
    packageId: string,
    update: UpdateSoftwareCatalogRecord,
  ) {
    return SoftwareCatalogPackageModel
      .findOneAndUpdate(
        {
          packageId,
        },
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .lean();
  }
}

export const softwareCatalogRepository =
  new SoftwareCatalogRepository();
