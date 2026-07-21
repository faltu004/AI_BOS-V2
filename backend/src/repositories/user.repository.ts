import { type FilterQuery } from "mongoose";
import { UserModel, type User } from "../models/user.model.js";

export type CreateUserInput = Pick<
  User,
  "fullName" | "companyName" | "email" | "passwordHash" | "role"
>;

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
    return UserModel.find(filter).sort({ createdAt: -1 });
  }
}

export const userRepository = new UserRepository();
