import { z } from "zod";

export const faceEmbeddingSchema = z
  .array(z.number().finite().min(-100).max(100))
  .min(128, "Face descriptor is incomplete")
  .max(2048, "Face descriptor is invalid");

export const faceQualitySchema = z.object({
  faceScore: z.number().min(0).max(1),
  real: z.number().min(0).max(1),
  live: z.number().min(0).max(1),
  faceSize: z.number().positive().max(4096),
  pose: z
    .object({
      roll: z.number().finite().min(-7).max(7),
      yaw: z.number().finite().min(-7).max(7),
      pitch: z.number().finite().min(-7).max(7),
    })
    .nullable(),
});

export const faceDescriptorSampleSchema = z.object({
  embedding: faceEmbeddingSchema,
  quality: faceQualitySchema,
});

export const enrollFaceSchema = z
  .object({
    consentAccepted: z.literal(true, { message: "Biometric consent is required for face enrollment" }),
    samples: z.array(faceDescriptorSampleSchema).length(5, "Exactly 5 validated face samples are required"),
  })
  .superRefine((input, context) => {
    const expectedLength = input.samples[0]?.embedding.length;
    if (input.samples.some((sample) => sample.embedding.length !== expectedLength)) {
      context.addIssue({ code: "custom", path: ["samples"], message: "All face samples must use the same descriptor model" });
    }
  });

export const resetFaceEnrollmentSchema = z.object({ reason: z.string().trim().min(3).max(240) });
export const deleteOwnFaceEnrollmentSchema = z.object({
  confirmDeletion: z.literal(true, { message: "Face data deletion must be explicitly confirmed" }),
  reason: z.string().trim().min(3).max(240).default("Deleted by employee"),
});

export type EnrollFaceInput = z.infer<typeof enrollFaceSchema>;
export type ResetFaceEnrollmentInput = z.infer<typeof resetFaceEnrollmentSchema>;
export type DeleteOwnFaceEnrollmentInput = z.infer<typeof deleteOwnFaceEnrollmentSchema>;
