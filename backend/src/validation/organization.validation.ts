import { z } from "zod";
import { businessTypes } from "../constants/organization.js";

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const pincodeRegex = /^\d{6}$/;

function base64ImageSize(dataUri: string) {
  const base64Part = dataUri.split(",")[1] ?? "";
  return Math.ceil((base64Part.length * 3) / 4);
}

export const logoDataUriSchema = z
  .string()
  .regex(/^data:image\/(png|jpeg|jpg|webp);base64,/, "Logo must be a PNG, JPEG, or WEBP data URI")
  .refine((value) => base64ImageSize(value) <= 2 * 1024 * 1024, {
    message: "Logo must be 2MB or smaller",
  });

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(180).optional(),
  legalName: z.string().max(180).optional(),
  logo: logoDataUriSchema.optional().or(z.literal("")),
  businessType: z.enum(businessTypes).optional(),
  gstin: z.string().regex(gstinRegex, "Invalid GSTIN format").optional().or(z.literal("")),
  pan: z.string().regex(panRegex, "Invalid PAN format").optional().or(z.literal("")),
  taxIdentificationNumber: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional().or(z.literal("")),
  addressLine1: z.string().max(160).optional(),
  addressLine2: z.string().max(160).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  pincode: z.string().regex(pincodeRegex, "Pincode must be 6 digits").optional().or(z.literal("")),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
