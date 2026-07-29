import { type FilterQuery } from "mongoose";
import { UserModel, type EmployeeProfile, type User } from "../models/user.model.js";

export type CreateUserInput = Pick<
  User,
  "fullName" | "companyName" | "email" | "passwordHash" | "role"
> &
  Partial<Pick<User, "organizationId" | "employeeProfile">> & {
    /** Mongoose casts a valid hex string to ObjectId automatically on create. */
    departmentId?: string;
  };

export type UpdateEmployeeProfileInput = {
  departmentId?: string;
  employeeProfile?: EmployeeProfile;
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

  async findById(id: string) {
    return UserModel.findById(id);
  }

  async updateLastLogin(id: string) {
    return UserModel.findByIdAndUpdate(id, { lastLoginAt: new Date() }, { new: true });
  }

  async updatePassword(id: string, passwordHash: string) {
    return UserModel.findByIdAndUpdate(id, { passwordHash }, { new: true });
  }

  async findMany(filter: FilterQuery<User> = {}) {
    return UserModel.find(filter).populate("departmentId", "name").sort({ createdAt: -1 });
  }

  async updateEmployeeProfile(id: string, updates: UpdateEmployeeProfileInput) {
    const setFields: Record<string, unknown> = {};
    if (updates.departmentId !== undefined) {
      setFields.departmentId = updates.departmentId;
    }
    if (updates.employeeProfile !== undefined) {
      for (const [key, value] of Object.entries(updates.employeeProfile)) {
        setFields[`employeeProfile.${key}`] = value;
      }
    }
    return UserModel.findByIdAndUpdate(id, { $set: setFields }, { new: true, runValidators: true }).populate(
      "departmentId",
      "name",
    );
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
