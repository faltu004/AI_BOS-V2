import { z } from "zod";
import { leaveTypes } from "../models/leave-request.model.js";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const applyLeaveSchema = z
  .object({
    type: z.enum(leaveTypes),
    from: dateStringSchema,
    to: dateStringSchema,
    reason: z.string().min(3).max(500),
  })
  .refine((value) => value.to >= value.from, {
    message: "End date must be on or after the start date",
    path: ["to"],
  });

export const leaveDecisionSchema = z.object({
  status: z.enum(["Approved", "Rejected"]),
  decisionNote: z.string().max(500).optional(),
});

export const leaveIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listMyLeaveQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const listApprovalsQuerySchema = z.object({
  status: z.enum(["Pending", "Approved", "Rejected", "Cancelled"]).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;
export type LeaveDecisionInput = z.infer<typeof leaveDecisionSchema>;
export type ListMyLeaveQuery = z.infer<typeof listMyLeaveQuerySchema>;
export type ListApprovalsQuery = z.infer<typeof listApprovalsQuerySchema>;
