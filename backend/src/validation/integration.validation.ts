import { z } from "zod";
import { integrationFamilies, integrationKeys, integrationSyncFrequencies } from "../constants/integration.js";

export const integrationKeyParamsSchema = z.object({
  key: z.enum(integrationKeys),
});

export const connectQuerySchema = z.object({
  returnOrigin: z.string().min(1).optional(),
});

export const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export const updateIntegrationSettingsSchema = z.object({
  autoSyncEnabled: z.boolean().optional(),
  syncFrequency: z.enum(integrationSyncFrequencies).optional(),
});

export const providerFamilyParamsSchema = z.object({
  family: z.enum(integrationFamilies),
});

export const updateProviderConfigSchema = z.object({
  clientId: z.string().max(300).optional(),
  clientSecret: z.string().max(2000).optional(),
  redirectUri: z.string().max(300).optional(),
  isEnabled: z.boolean().optional(),
});

export type UpdateIntegrationSettingsInput = z.infer<typeof updateIntegrationSettingsSchema>;
export type UpdateProviderConfigInput = z.infer<typeof updateProviderConfigSchema>;
