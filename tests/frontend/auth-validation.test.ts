import test from "node:test";
import assert from "node:assert/strict";
import { loginSchema, resetPasswordSchema, emailVerificationSchema } from "../../shared/src/auth/schemas.ts";

test("frontend login schema enforces a valid email", () => {
  const invalid = loginSchema.safeParse({
    email: "not-email",
    password: "x",
    rememberMe: false,
  });

  assert.equal(invalid.success, false);

  const valid = loginSchema.safeParse({
    email: "aman@example.com",
    password: "Secure123",
    rememberMe: false,
  });

  assert.equal(valid.success, true);
});

test("reset and verification schemas enforce security constraints", () => {
  assert.equal(resetPasswordSchema.safeParse({ password: "Short1", confirmPassword: "Short1" }).success, false);
  assert.equal(emailVerificationSchema.safeParse({ code: "123456" }).success, true);
  assert.equal(emailVerificationSchema.safeParse({ code: "12A456" }).success, false);
});
