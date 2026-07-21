import type { Response } from "express";
import type { ApiSuccessResponse } from "../types/api.js";

type ApiResponsePayload<T> = {
  message: string;
  data?: T;
};

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  payload: ApiResponsePayload<T>,
) {
  const response: ApiSuccessResponse<T> = {
    success: true,
    ...payload,
  };

  return res.status(statusCode).json(response);
}
