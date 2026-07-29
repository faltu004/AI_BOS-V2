import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { IntegrationKey } from "../constants/integration.js";

export type OAuthStatePayload = {
  userId: string;
  integrationKey: IntegrationKey;
  returnOrigin: string;
};

const issuer = "ai-bos-integrations";

export function signOAuthState(payload: OAuthStatePayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    issuer,
    audience: issuer,
    expiresIn: "5m",
  });
}

export function verifyOAuthState(token: string): OAuthStatePayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
    issuer,
    audience: issuer,
  }) as OAuthStatePayload;
}
