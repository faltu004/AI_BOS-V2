import { z } from "zod";

const faceImageSchema = z
  .string()
  .startsWith("data:image/png;base64,", "Face sample must be a PNG camera capture")
  .max(4_000_000, "Face sample is too large. Please retake it.");

export const enrollFaceSchema = z.object({
  consentAccepted: z.literal(true, {
    message: "Biometric consent is required for face enrollment",
  }),
  samples: z.array(faceImageSchema).min(3, "Capture at least 3 face samples").max(5),
});

export const resetFaceEnrollmentSchema = z.object({
  reason: z.string().min(3).max(240),
});

export type EnrollFaceInput = z.infer<typeof enrollFaceSchema>;
export type ResetFaceEnrollmentInput = z.infer<typeof resetFaceEnrollmentSchema>;
