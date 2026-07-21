import { type UserDocument } from "../models/user.model.js";
import { userRepository } from "../repositories/user.repository.js";
import type { PublicUser } from "../types/auth.js";
import { AppError } from "../utils/app-error.js";
import { createTokenPair, verifyRefreshToken } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import type {
  ChangePasswordInput,
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
} from "../validation/auth.validation.js";

function toAuthUser(user: UserDocument): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    companyName: user.companyName,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new AppError("A user with this email already exists", 409);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      fullName: input.fullName,
      companyName: input.companyName,
      email: input.email,
      passwordHash,
      role: input.role,
    });

    const tokens = createTokenPair({
      sub: user.id,
      role: user.role,
    });

    return {
      user: toAuthUser(user),
      tokens,
    };
  }

  async login(input: LoginInput) {
    const user = await userRepository.findByEmailWithPassword(input.email);

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    if (!user.isActive) {
      throw new AppError("This account is disabled", 403);
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    const updatedUser = await userRepository.updateLastLogin(user.id);
    const authUser = updatedUser ?? user;
    const tokens = createTokenPair({
      sub: authUser.id,
      role: authUser.role,
    });

    return {
      user: toAuthUser(authUser),
      tokens,
    };
  }

  async refresh(input: RefreshTokenInput) {
    if (!input.refreshToken) {
      throw new AppError("Refresh token is required", 401);
    }

    const payload = verifyRefreshToken(input.refreshToken);
    const user = await userRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new AppError("Invalid refresh token", 401);
    }

    const tokens = createTokenPair({
      sub: user.id,
      role: user.role,
    });

    return {
      user: toAuthUser(user),
      tokens,
    };
  }

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return toAuthUser(user);
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const userWithPassword = await userRepository.findByEmailWithPassword(user.email);

    if (!userWithPassword) {
      throw new AppError("User not found", 404);
    }

    const isPasswordValid = await verifyPassword(
      input.currentPassword,
      userWithPassword.passwordHash,
    );

    if (!isPasswordValid) {
      throw new AppError("Current password is incorrect", 400);
    }

    const passwordHash = await hashPassword(input.newPassword);
    await userRepository.updatePassword(userId, passwordHash);

    return {
      updated: true,
    };
  }
}

export const authService = new AuthService();
