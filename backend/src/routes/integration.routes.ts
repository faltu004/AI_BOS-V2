import { Router } from "express";
import { integrationController } from "../controllers/integration.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/rbac.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  connectQuerySchema,
  integrationKeyParamsSchema,
  oauthCallbackQuerySchema,
  providerFamilyParamsSchema,
  updateIntegrationSettingsSchema,
  updateProviderConfigSchema,
} from "../validation/integration.validation.js";

export const integrationRoutes = Router();

// Public: the browser lands here directly from the provider's OAuth redirect with no
// Authorization header available. The signed, short-lived `state` token (minted by
// getConnectUrl, embedding the requesting user's id) is the authorization proof instead.
integrationRoutes.get(
  "/oauth/callback",
  ...route(validate({ query: oauthCallbackQuerySchema }), integrationController.oauthCallback),
);

integrationRoutes.use(authenticate, requirePermission("integration.manage"));

integrationRoutes.get("/", ...route(integrationController.list));

integrationRoutes.get(
  "/admin/providers",
  ...route(integrationController.listProviderConfigs),
);
integrationRoutes.patch(
  "/admin/providers/:family",
  ...route(validate({ params: providerFamilyParamsSchema, body: updateProviderConfigSchema }), integrationController.updateProviderConfig),
);

integrationRoutes.get(
  "/:key/connect",
  ...route(validate({ params: integrationKeyParamsSchema, query: connectQuerySchema }), integrationController.getConnectUrl),
);
integrationRoutes.post(
  "/:key/disconnect",
  ...route(validate({ params: integrationKeyParamsSchema }), integrationController.disconnect),
);
integrationRoutes.post(
  "/:key/test",
  ...route(validate({ params: integrationKeyParamsSchema }), integrationController.testConnection),
);
integrationRoutes.post(
  "/:key/sync",
  ...route(validate({ params: integrationKeyParamsSchema }), integrationController.sync),
);
integrationRoutes.patch(
  "/:key/settings",
  ...route(validate({ params: integrationKeyParamsSchema, body: updateIntegrationSettingsSchema }), integrationController.updateSettings),
);
integrationRoutes.get(
  "/:key/logs",
  ...route(validate({ params: integrationKeyParamsSchema }), integrationController.getLogs),
);
