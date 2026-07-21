import type { UserRole } from "../constants/roles.js";

export type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

export type PublicUser = {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
