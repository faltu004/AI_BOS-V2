import { type FilterQuery } from "mongoose";
import { UserModel, type EmployeeProfile, type User } from "../models/user.model.js";

export type CreateUserInput = Pick<
  User,
  "fullName" | "companyName" | "email" | "passwordHash" | "role"
> &
  Partial<
    Pick<
      User,
      | "organizationId"
      | "employeeProfile"
      | "isProfileComplete"
      | "mustChangePassword"
      | "passwordChangedAt"
      | "temporaryPasswordExpiresAt"
      | "isEmailVerified"
      | "isActive"
    >
  > & {
    /** Mongoose casts a valid hex string to ObjectId automatically on create. */
    departmentId?: string;
    branchId?: string;
    managerId?: string;
    teamIds?: string[];
  };

export type UpdateEmployeeProfileInput = {
  fullName?: string;
  avatar?: string | null;
  departmentId?: string;
  branchId?: string;
  managerId?: string;
  teamIds?: string[];
  employeeProfile?: EmployeeProfile;
  isProfileComplete?: boolean;
};

export class UserRepository {
  async create(input: CreateUserInput) {
    return UserModel.create(input);
  }

  async findByEmail(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() });
  }

  async findByEmailWithPassword(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  }

  async countActiveByRole(role: string) {
    return UserModel.countDocuments({ role, isActive: true });
  }

  async findActiveByRole(role: string) {
    return UserModel.findOne({ role, isActive: true });
  }

  async findById(id: string) {
    return UserModel.findById(id);
  }

  async updateLastLogin(id: string) {
    return UserModel.findByIdAndUpdate(id, { lastLoginAt: new Date() }, { new: true });
  }

  async updatePassword(id: string, passwordHash: string) {
    return UserModel.findByIdAndUpdate(
      id,
      {
        $set: {
          passwordHash,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
        },
        $unset: {
          temporaryPasswordExpiresAt: "",
        },
      },
      { new: true },
    );
  }

  async updateAccountCredentials(
    id: string,
    input: {
      email?: string;
      passwordHash?: string;
      mustChangePassword?: boolean;
      passwordChangedAt?: Date;
      temporaryPasswordExpiresAt?: Date | null;
    },
  ) {
    const setFields: Record<string, unknown> = {};
    const unsetFields: Record<string, ""> = {};
    if (input.email !== undefined) setFields.email = input.email.toLowerCase();
    if (input.passwordHash !== undefined) setFields.passwordHash = input.passwordHash;
    if (input.mustChangePassword !== undefined) setFields.mustChangePassword = input.mustChangePassword;
    if (input.passwordChangedAt !== undefined) setFields.passwordChangedAt = input.passwordChangedAt;
    if (input.temporaryPasswordExpiresAt === null) unsetFields.temporaryPasswordExpiresAt = "";
    if (input.temporaryPasswordExpiresAt instanceof Date) setFields.temporaryPasswordExpiresAt = input.temporaryPasswordExpiresAt;

    return UserModel.findByIdAndUpdate(
      id,
      {
        ...(Object.keys(setFields).length > 0 ? { $set: setFields } : {}),
        ...(Object.keys(unsetFields).length > 0 ? { $unset: unsetFields } : {}),
      },
      { new: true, runValidators: true },
    );
  }

  async findMany(filter: FilterQuery<User> = {}) {
    return UserModel.find(filter).populate("departmentId", "name").populate("managerId", "fullName email role").sort({ createdAt: -1 });
  }

  async deactivate(id: string) {
    return UserModel.findByIdAndUpdate(
      id,
      {
        $set: {
          isActive: false,
          "employeeProfile.employmentStatus": "Inactive",
        },
      },
      { new: true, runValidators: true },
    ).populate("departmentId", "name").populate("managerId", "fullName email role");
  }

  async updateEmployeeProfile(id: string, updates: UpdateEmployeeProfileInput) {
    const setFields: Record<string, unknown> = {};
    if (updates.fullName !== undefined) {
      setFields.fullName = updates.fullName;
    }
    if (updates.avatar !== undefined) {
      setFields.avatar = updates.avatar;
    }
    if (updates.departmentId !== undefined) {
      setFields.departmentId = updates.departmentId;
    }
    if (updates.branchId !== undefined) {
      setFields.branchId = updates.branchId;
    }
    if (updates.managerId !== undefined) {
      setFields.managerId = updates.managerId;
    }
    if (updates.teamIds !== undefined) {
      setFields.teamIds = updates.teamIds;
    }
    if (updates.employeeProfile !== undefined) {
      for (const [key, value] of Object.entries(updates.employeeProfile)) {
        setFields[`employeeProfile.${key}`] = value;
      }
    }
    if (updates.isProfileComplete !== undefined) {
      setFields.isProfileComplete = updates.isProfileComplete;
    }
    return UserModel.findByIdAndUpdate(id, { $set: setFields }, { new: true, runValidators: true }).populate(
      "departmentId",
      "name",
    ).populate("managerId", "fullName email role");
  }

  async updateRole(id: string, role: string) {
    return UserModel.findByIdAndUpdate(id, { $set: { role } }, { new: true, runValidators: true })
      .populate("departmentId", "name")
      .populate("managerId", "fullName email role");
  }

  async existsWithFilter(filter: FilterQuery<User>) {
    return UserModel.exists(filter);
  }

  async listByOrganization(organizationId: string) {
    return UserModel.find({ organizationId })
      .select("fullName email role departmentId branchId managerId teamIds")
      .lean();
  }

  async findActiveByRoles(roles: string[]) {
    return UserModel.find({ role: { $in: roles }, isActive: true }).select("_id").lean();
  }

  async findAllActive() {
    return UserModel.find({ isActive: true }).select("_id").lean();
  }
}

export const userRepository = new UserRepository();
