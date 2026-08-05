import { z } from "zod";

export const attendanceLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
});

const faceImageSchema = z
  .string()
  .startsWith("data:image/", "Face capture must be an image data URL")
  .max(4_000_000, "Face capture is too large. Please retake the photo.");

export const attendanceMarkSchema = attendanceLocationSchema.extend({
  faceImage: faceImageSchema,
});

export const attendanceHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(100),
});

export const attendanceSummaryQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type AttendanceLocationInput = z.infer<typeof attendanceLocationSchema>;
export type AttendanceMarkInput = z.infer<typeof attendanceMarkSchema>;
export type AttendanceHistoryQuery = z.infer<typeof attendanceHistoryQuerySchema>;
export type AttendanceSummaryQuery = z.infer<typeof attendanceSummaryQuerySchema>;
