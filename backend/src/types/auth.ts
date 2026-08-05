export type AuthenticatedUser = {
  id: string;
  role: string;
};

export type PublicUser = {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  role: string;
  avatar?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  isProfileComplete: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
