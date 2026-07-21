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
}

export const userController = new UserController();
