export type AuthenticatedUser = {
  id: string;
  role: string;
  mustChangePassword?: boolean;
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
  mustChangePassword: boolean;
  hasActiveFaceEnrollment?: boolean;
  permissions: string[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
