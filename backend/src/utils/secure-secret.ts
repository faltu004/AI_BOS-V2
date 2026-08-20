import {
  createHash,
  timingSafeEqual,
} from "node:crypto";

function clean(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function hashSecret(
  value: string,
): Buffer {
  return createHash(
    "sha256",
  )
    .update(
      value,
      "utf8",
    )
    .digest();
}

export function secureSecretEqual(
  expectedValue: unknown,
  receivedValue: unknown,
): boolean {
  const expected =
    clean(
      expectedValue,
    );

  const received =
    clean(
      receivedValue,
    );

  if (
    !expected ||
    !received
  ) {
    return false;
  }

  const expectedHash =
    hashSecret(
      expected,
    );

  const receivedHash =
    hashSecret(
      received,
    );

  return timingSafeEqual(
    expectedHash,
    receivedHash,
  );
}

/**
 * Migration compatibility flags default
 * to enabled while Phase 20 migration
 * remains incomplete.
 *
 * Compatibility is disabled unless explicitly enabled.
 * Unrecognized non-empty values also
 * fail closed.
 */
export function migrationCompatibilityEnabled(
  value: unknown,
): boolean {
  const normalized =
    clean(
      value,
    ).toLowerCase();

  if (!normalized) {
    return false;
  }

  return [
    "1",
    "true",
    "yes",
    "on",
  ].includes(
    normalized,
  );
}
