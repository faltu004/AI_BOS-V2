import { z } from "zod";
import { dateFormats } from "../models/organization-settings.model.js";
import { weekdays } from "../constants/weekday.js";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const updateOrganizationSettingsSchema = z
  .object({
    workingDays: z.array(z.enum(weekdays)).min(1).optional(),
    businessHoursStart: z.string().regex(timeRegex, "Use HH:mm format").optional(),
    businessHoursEnd: z.string().regex(timeRegex, "Use HH:mm format").optional(),
    timezone: z.string().min(1).max(60).optional(),
    weekStartsOn: z.enum(weekdays).optional(),
    dateFormat: z.enum(dateFormats).optional(),
    currency: z.string().length(3).optional(),
    fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
    workspacePreferences: z
      .object({
        allowRemoteCheckIn: z.boolean().optional(),
        enforceGeoFence: z.boolean().optional(),
        officeLocation: z
          .object({
            name: z.string().min(1).max(120).optional(),
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
            radiusMeters: z.number().int().positive(),
          })
          .optional(),
        defaultLeavePolicyNote: z.string().max(500).optional(),
      })
      .optional(),
  })
  .refine(
    (data) =>
      !data.businessHoursStart || !data.businessHoursEnd || data.businessHoursEnd > data.businessHoursStart,
    { message: "Business hours end must be after start", path: ["businessHoursEnd"] },
  );

export type UpdateOrganizationSettingsInput = z.infer<typeof updateOrganizationSettingsSchema>;

export const updateModuleAccessSchema = z.object({
  adminPanelEnabled: z.boolean(),
});

export type UpdateModuleAccessInput = z.infer<typeof updateModuleAccessSchema>;
