import type { RequestHandler } from "express";
import { refreshTokenCookieName } from "../constants/auth.js";
import { authService } from "../services/auth.service.js";
import { sendSuccess } from "../utils/api-response.js";
import { clearRefreshTokenCookie, setRefreshTokenCookie } from "../utils/cookies.js";

export class AuthController {
  register: RequestHandler = async (req, res) => {
    const result = await authService.register(req.body);
    setRefreshTokenCookie(res, result.tokens.refreshToken);

    sendSuccess(res, 201, {
      message: "User registered successfully",
      data: result,
    });
  };

  login: RequestHandler = async (req, res) => {
    const result = await authService.login(req.body);
    setRefreshTokenCookie(res, result.tokens.refreshToken);

    sendSuccess(res, 200, {
      message: "Login successful",
      data: result,
    });
  };

  refresh: RequestHandler = async (req, res) => {
    const result = await authService.refresh({
      refreshToken: req.body.refreshToken ?? req.cookies[refreshTokenCookieName],
    });
    setRefreshTokenCookie(res, result.tokens.refreshToken);

    sendSuccess(res, 200, {
      message: "Token refreshed successfully",
      data: result,
    });
  };

  me: RequestHandler = async (req, res) => {
    const profile = await authService.getProfile(req.user!.id);

    sendSuccess(res, 200, {
      message: "Profile fetched successfully",
      data: profile,
    });
  };

  changePassword: RequestHandler = async (req, res) => {
    const result = await authService.changePassword(req.user!.id, req.body);

    sendSuccess(res, 200, {
      message: "Password changed successfully",
      data: result,
    });
  };

  logout: RequestHandler = async (_req, res) => {
    clearRefreshTokenCookie(res);

    sendSuccess(res, 200, {
      message: "Logout successful",
    });
  };
}

export const authController = new AuthController();
