import { getAssignableRoles } from "../constants/user-hierarchy.js";
import { userRepository } from "../repositories/user.repository.js";
import { PasswordChangeModel } from "../models/password-history.model.js";
import { AppError } from "../utils/app-error.js";
import { hashPassword } from "../utils/password.js";
import { Types } from "mongoose";
import type { CreateUserProfileInput, UpdateEmployeeProfileInput } from "../validation/user.validation.js";
import type { UserDocument } from "../models/user.model.js";

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function toEmployeeDto(user: UserDocument) {
  const department = user.departmentId as unknown as { _id: Types.ObjectId; name: string } | null;
  const profile = user.employeeProfile ?? {};

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
    avatar: getInitials(user.fullName),
    departmentId: department && typeof department === "object" ? department._id : user.departmentId,
    department: department && typeof department === "object" ? department.name : undefined,
    employeeCode: profile.employeeCode ?? `EMP-${user.id.slice(-6).toUpperCase()}`,
    phone: profile.phone,
    location: profile.location,
    designation: profile.designation,
    employmentType: profile.employmentType,
    joiningDate: profile.joiningDate,
    employmentStatus: profile.employmentStatus ?? "Active",
    personalInformation: profile.personalInformation,
    contact: profile.contact,
    skills: profile.skills ?? [],
    experience: profile.experience ?? [],
    education: profile.education ?? [],
    documents: profile.documents ?? [],
    salaryDetails: profile.salaryDetails,
    performanceScore: profile.performanceScore,
  };
}

export class UserService {
  async listUsers() {
    const users = await userRepository.findMany();
    return users.map((user) => toEmployeeDto(user));
  }

  getAssignableRoles(creatorRole: string) {
    return getAssignableRoles(creatorRole);
  }

  async createUser(creatorUserId: string, input: CreateUserProfileInput) {
    const creator = await userRepository.findById(creatorUserId);

    if (!creator) {
      throw new AppError("Creator account not found", 404);
    }

    const assignableRoles = getAssignableRoles(creator.role);

    if (!assignableRoles.includes(input.role)) {
      throw new AppError("You are not allowed to create a user with this role", 403);
    }

    const existingUser = await userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new AppError("A user with this email already exists", 409);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      fullName: input.fullName,
      companyName: creator.companyName,
      email: input.email,
      passwordHash,
      role: input.role,
      organizationId: creator.organizationId,
      departmentId: input.departmentId,
      employeeProfile: input.employeeProfile,
    });

    const isValidId = Types.ObjectId.isValid(user.id);
    if (isValidId) {
      const objectId = new Types.ObjectId(user.id);
      await Promise.all([
        PasswordChangeModel.create({
          user: objectId,
          previousPasswordHash: passwordHash,
          changedBy: objectId,
        }),
      ]);
    }

    return toEmployeeDto(user);
  }

  async updateEmployeeProfile(actorUserId: string, targetUserId: string, input: UpdateEmployeeProfileInput) {
    const target = await userRepository.findById(targetUserId);
    if (!target) {
      throw new AppError("User not found", 404);
    }

    const updated = await userRepository.updateEmployeeProfile(targetUserId, input);
    if (!updated) {
      throw new AppError("User not found", 404);
    }

    return toEmployeeDto(updated);
  }

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return {
      id: user.id,
      fullName: user.fullName,
      companyName: user.companyName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      branchId: user.branchId,
      managerId: user.managerId,
      teamIds: user.teamIds,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getPasswordChanges(userId: string) {
    const history = await PasswordChangeModel.find({ user: userId })
      .sort({ changedAt: -1 })
      .limit(20)
      .select("previousPasswordHash changedAt changedBy")
      .populate("changedBy", "fullName email")
      .lean();

    return history.map((entry) => ({
      changedAt: entry.changedAt,
      changedBy: entry.changedBy,
    }));
  }
}

export const userService = new UserService();
