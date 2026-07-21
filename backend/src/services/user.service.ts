import { userRepository } from "../repositories/user.repository.js";

export class UserService {
  async listUsers() {
    const users = await userRepository.findMany();

    return users.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      companyName: user.companyName,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    }));
  }
}

export const userService = new UserService();
