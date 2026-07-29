import type { RequestHandler } from "express";
import { userService } from "../services/user.service.js";
import { sendSuccess } from "../utils/api-response.js";

export class UserController {
  list: RequestHandler = async (_req, res) => {
    const users = await userService.listUsers();

    sendSuccess(res, 200, {
      message: "Users fetched successfully",
      data: users,
    });
  };

  assignableRoles: RequestHandler = async (req, res) => {
    const roles = userService.getAssignableRoles(req.user!.role);

    sendSuccess(res, 200, {
      message: "Assignable roles fetched successfully",
      data: roles,
    });
  };

  create: RequestHandler = async (req, res) => {
    const user = await userService.createUser(req.user!.id, req.body);

    sendSuccess(res, 201, {
      message: "User profile created successfully",
      data: user,
    });
  };

  updateProfile: RequestHandler = async (req, res) => {
    const user = await userService.updateEmployeeProfile(req.user!.id, req.params.id, req.body);

    sendSuccess(res, 200, {
      message: "Employee profile updated successfully",
      data: user,
    });
  };

  me: RequestHandler = async (req, res) => {
    const profile = await userService.getProfile(req.user!.id);

    sendSuccess(res, 200, {
      message: "Profile fetched successfully",
      data: profile,
    });
  };

  passwordChanges: RequestHandler = async (req, res) => {
    const history = await userService.getPasswordChanges(req.user!.id);

    sendSuccess(res, 200, {
      message: "Password change history fetched successfully",
      data: history,
    });
  };
}

export const userController = new UserController();
