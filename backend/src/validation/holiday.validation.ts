import { z } from "zod";
import { holidayTypes } from "../constants/holiday.js";

const dateStringSchema = z.coerce.date();

export const createHolidaySchema = z.object({
  name: z.string().min(2).max(150),
  date: dateStringSchema,
  type: z.enum(holidayTypes).default("Public"),
  description: z.string().max(500).optional(),
  isRecurringAnnually: z.boolean().default(false),
  branchIds: z.array(z.string().min(1)).default([]),
});

export const updateHolidaySchema = z.object({
  name: z.string().min(2).max(150).optional(),
  date: dateStringSchema.optional(),
  type: z.enum(holidayTypes).optional(),
  description: z.string().max(500).optional(),
  isRecurringAnnually: z.boolean().optional(),
  branchIds: z.array(z.string().min(1)).optional(),
});

export const holidayIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const listHolidaysQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  year: z.coerce.number().int().optional(),
  type: z.enum(holidayTypes).optional(),
  sortBy: z.enum(["date", "name", "createdAt"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;
export type ListHolidaysQuery = z.infer<typeof listHolidaysQuerySchema>;
