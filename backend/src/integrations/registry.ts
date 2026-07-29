import type { IntegrationFamily, IntegrationKey } from "../constants/integration.js";
import { atlassianProvider } from "./providers/atlassian.js";
import { dropboxProvider } from "./providers/dropbox.js";
import { githubProvider } from "./providers/github.js";
import { gitlabProvider } from "./providers/gitlab.js";
import { googleProvider } from "./providers/google.js";
import { microsoftProvider } from "./providers/microsoft.js";
import { slackProvider } from "./providers/slack.js";
import { whatsappProvider } from "./providers/whatsapp.js";
import { zoomProvider } from "./providers/zoom.js";
import type { ProviderDefinition, ProviderIntegrationMeta } from "./types.js";

export const providerRegistry: Record<IntegrationFamily, ProviderDefinition> = {
  google: googleProvider,
  microsoft: microsoftProvider,
  slack: slackProvider,
  zoom: zoomProvider,
  github: githubProvider,
  gitlab: gitlabProvider,
  atlassian: atlassianProvider,
  dropbox: dropboxProvider,
  whatsapp: whatsappProvider,
};

const integrationToFamily = new Map<IntegrationKey, IntegrationFamily>();
for (const provider of Object.values(providerRegistry)) {
  for (const integration of provider.integrations) {
    integrationToFamily.set(integration.key, provider.family);
  }
}

export function getFamilyForIntegration(key: IntegrationKey): IntegrationFamily {
  const family = integrationToFamily.get(key);
  if (!family) {
    throw new Error(`No provider registered for integration key "${key}"`);
  }
  return family;
}

export function getProviderForIntegration(key: IntegrationKey): ProviderDefinition {
  return providerRegistry[getFamilyForIntegration(key)];
}

export function getIntegrationMeta(key: IntegrationKey): ProviderIntegrationMeta {
  const provider = getProviderForIntegration(key);
  const meta = provider.integrations.find((integration) => integration.key === key);
  if (!meta) {
    throw new Error(`Integration metadata missing for "${key}"`);
  }
  return meta;
}

export function listAllIntegrationMeta(): (ProviderIntegrationMeta & { family: IntegrationFamily; authType: ProviderDefinition["authType"] })[] {
  return Object.values(providerRegistry).flatMap((provider) =>
    provider.integrations.map((integration) => ({ ...integration, family: provider.family, authType: provider.authType })),
  );
}

export function getScopesForIntegration(key: IntegrationKey): string[] {
  const provider = getProviderForIntegration(key);
  return provider.oauth?.scopesByIntegration[key] ?? [];
}
