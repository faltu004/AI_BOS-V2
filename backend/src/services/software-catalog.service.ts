import {
  randomUUID,
} from "node:crypto";

import {
  softwareCatalogRepository,
  type CreateSoftwareCatalogRecord,
  type UpdateSoftwareCatalogRecord,
} from "../repositories/software-catalog.repository.js";

import type {
  SoftwarePackageType,
} from "../models/software-catalog-package.model.js";

import {
  AppError,
} from "../utils/app-error.js";

export type CreateSoftwareCatalogInput = {
  name?: unknown;
  version?: unknown;
  publisher?: unknown;

  packageType?: unknown;

  downloadUrl?: unknown;
  sha256?: unknown;
  productCode?: unknown;

  enabled?: unknown;

  requestedBy?: unknown;
};

export type UpdateSoftwareCatalogInput = {
  packageId?: unknown;

  name?: unknown;
  version?: unknown;
  publisher?: unknown;

  packageType?: unknown;

  downloadUrl?: unknown;
  sha256?: unknown;
  productCode?: unknown;

  enabled?: unknown;

  requestedBy?: unknown;
};

function normalizeRequiredString(
  value: unknown,
  maxLength: number,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new AppError(
      "Required string value is missing",
      400,
    );
  }

  const normalized =
    value
      .trim()
      .slice(
        0,
        maxLength,
      );

  if (!normalized) {
    throw new AppError(
      "Required string value is empty",
      400,
    );
  }

  return normalized;
}

function normalizePackageType(
  value: unknown,
): SoftwarePackageType {
  if (
    value === undefined ||
    value === "MSI"
  ) {
    return "MSI";
  }

  throw new AppError(
    "Only MSI packages are supported in the current phase",
    400,
  );
}

function normalizeHttpsUrl(
  value: unknown,
): string {
  const normalized =
    normalizeRequiredString(
      value,
      2048,
    );

  let parsed: URL;

  try {
    parsed =
      new URL(
        normalized,
      );
  } catch {
    throw new AppError(
      "Package download URL is invalid",
      400,
    );
  }

  if (
    parsed.protocol !==
    "https:"
  ) {
    throw new AppError(
      "Package download URL must use HTTPS",
      400,
    );
  }

  if (
    parsed.username ||
    parsed.password
  ) {
    throw new AppError(
      "Package download URL cannot contain credentials",
      400,
    );
  }

  return parsed.toString();
}

function normalizeSha256(
  value: unknown,
): string {
  const normalized =
    normalizeRequiredString(
      value,
      64,
    ).toUpperCase();

  if (
    !/^[A-F0-9]{64}$/.test(
      normalized,
    )
  ) {
    throw new AppError(
      "SHA256 must contain exactly 64 hexadecimal characters",
      400,
    );
  }

  return normalized;
}

function normalizeProductCode(
  value: unknown,
): string {
  const normalized =
    normalizeRequiredString(
      value,
      64,
    ).toUpperCase();

  const msiGuid =
    /^\{[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}\}$/;

  if (
    !msiGuid.test(
      normalized,
    )
  ) {
    throw new AppError(
      "MSI Product Code must be a GUID enclosed in braces",
      400,
    );
  }

  return normalized;
}

function normalizeRequestedBy(
  value: unknown,
): string {
  return normalizeRequiredString(
    value,
    200,
  );
}

export class SoftwareCatalogService {
  async createPackage(
    input: CreateSoftwareCatalogInput,
  ) {
    const requestedBy =
      normalizeRequestedBy(
        input.requestedBy,
      );

    const record:
      CreateSoftwareCatalogRecord = {
        packageId:
          "PKG-" +
          randomUUID(),

        name:
          normalizeRequiredString(
            input.name,
            200,
          ),

        version:
          normalizeRequiredString(
            input.version,
            100,
          ),

        publisher:
          normalizeRequiredString(
            input.publisher,
            200,
          ),

        packageType:
          normalizePackageType(
            input.packageType,
          ),

        downloadUrl:
          normalizeHttpsUrl(
            input.downloadUrl,
          ),

        sha256:
          normalizeSha256(
            input.sha256,
          ),

        productCode:
          normalizeProductCode(
            input.productCode,
          ),

        enabled:
          typeof input.enabled ===
          "boolean"
            ? input.enabled
            : true,

        createdBy:
          requestedBy,

        updatedBy:
          requestedBy,
      };

    return softwareCatalogRepository
      .create(
        record,
      );
  }

  async listPackages() {
    return softwareCatalogRepository
      .findAll();
  }

  async getPackage(
    packageIdInput: unknown,
  ) {
    const packageId =
      normalizeRequiredString(
        packageIdInput,
        100,
      );

    const softwarePackage =
      await softwareCatalogRepository
        .findByPackageId(
          packageId,
        );

    if (!softwarePackage) {
      throw new AppError(
        "Software package not found",
        404,
      );
    }

    return softwarePackage;
  }

  async updatePackage(
    input: UpdateSoftwareCatalogInput,
  ) {
    const packageId =
      normalizeRequiredString(
        input.packageId,
        100,
      );

    const requestedBy =
      normalizeRequestedBy(
        input.requestedBy,
      );

    const existing =
      await softwareCatalogRepository
        .findByPackageId(
          packageId,
        );

    if (!existing) {
      throw new AppError(
        "Software package not found",
        404,
      );
    }

    const update:
      UpdateSoftwareCatalogRecord = {
        updatedBy:
          requestedBy,
      };

    if (
      input.name !== undefined
    ) {
      update.name =
        normalizeRequiredString(
          input.name,
          200,
        );
    }

    if (
      input.version !== undefined
    ) {
      update.version =
        normalizeRequiredString(
          input.version,
          100,
        );
    }

    if (
      input.publisher !== undefined
    ) {
      update.publisher =
        normalizeRequiredString(
          input.publisher,
          200,
        );
    }

    if (
      input.packageType !==
      undefined
    ) {
      update.packageType =
        normalizePackageType(
          input.packageType,
        );
    }

    if (
      input.downloadUrl !==
      undefined
    ) {
      update.downloadUrl =
        normalizeHttpsUrl(
          input.downloadUrl,
        );
    }

    if (
      input.sha256 !== undefined
    ) {
      update.sha256 =
        normalizeSha256(
          input.sha256,
        );
    }

    if (
      input.productCode !==
      undefined
    ) {
      update.productCode =
        normalizeProductCode(
          input.productCode,
        );
    }

    if (
      input.enabled !== undefined
    ) {
      if (
        typeof input.enabled !==
        "boolean"
      ) {
        throw new AppError(
          "Enabled must be true or false",
          400,
        );
      }

      update.enabled =
        input.enabled;
    }

    return softwareCatalogRepository
      .updateByPackageId(
        packageId,
        update,
      );
  }
}

export const softwareCatalogService =
  new SoftwareCatalogService();
