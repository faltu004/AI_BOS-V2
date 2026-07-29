import type { Request, RequestHandler, Response } from "express";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";

export type AuthenticatedUser = {
  id: string;
  role: string;
};

export function resolveBearerToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authorizationHeader.slice("Bearer ".length);
}

export const authenticate: RequestHandler = async (req: Request, _res: Response, next) => {
  try {
    const token = resolveBearerToken(req.headers.authorization);

    if (!token) {
      throw new AppError("Authentication required", 401);
    }

    const user = await userRepository.findById(verifyAccessToken(token).sub);

    if (!user || !user.isActive) {
      throw new AppError("User is not authorized", 401);
    }

    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError("Invalid or expired token", 401));
  }
};
