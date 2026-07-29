import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export type JwtPayload = {
  sub: string;
  role: string;
  jti?: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
};

function signToken(payload: JwtPayload, secret: string, expiresIn: string) {
  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions["expiresIn"],
    algorithm: "HS256",
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  };

  return jwt.sign(payload, secret, options);
}

export function createTokenPair(payload: JwtPayload): TokenPair {
  const payloadWithJti: JwtPayload = { ...payload, jti: payload.jti ?? crypto.randomUUID() };

  return {
    accessToken: signToken(payloadWithJti, env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRES_IN),
    refreshToken: signToken(payloadWithJti, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN),
    tokenType: "Bearer",
  };
}

/** Decodes a token's payload without verifying its signature — only use on tokens this server just signed, or purely for expiry/jti bookkeeping. */
export function decodeToken(token: string): (JwtPayload & { exp?: number }) | null {
  return jwt.decode(token) as (JwtPayload & { exp?: number }) | null;
}

export function getTokenExpiry(token: string): Date {
  const decoded = decodeToken(token);
  return decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  }) as JwtPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    algorithms: ["HS256"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  }) as JwtPayload;
}
