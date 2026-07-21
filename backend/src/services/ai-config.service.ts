import { aiProviders, type AIProvider } from "../constants/ai-config.js";
import { aiConfigRepository } from "../repositories/ai-config.repository.js";
import { decryptSecret, encryptSecret } from "../utils/crypto.js";
import type { UpdateAIConfigInput } from "../validation/ai-config.validation.js";

function mapKeys(value: unknown): Partial<Record<AIProvider, string>> {
  if (!value) return {};
  if (value instanceof Map) {
    return Object.fromEntries(value.entries()) as Partial<Record<AIProvider, string>>;
  }
  return value as Partial<Record<AIProvider, string>>;
}

function maskConfig(config: Awaited<ReturnType<typeof aiConfigRepository.upsertGlobal>>) {
  if (!config) return null;
  const apiKeys = mapKeys(config.apiKeys);

  return {
    id: config.id,
    provider: config.provider,
    defaultModel: config.defaultModel,
    embeddingModel: config.embeddingModel,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    contextWindow: config.contextWindow,
    features: config.features,
    keyStatus: Object.fromEntries(aiProviders.map((provider) => [provider, Boolean(apiKeys[provider])])),
    updatedBy: config.updatedBy,
    updatedAt: config.updatedAt,
  };
}

export class AIConfigService {
  async get() {
    const config = await aiConfigRepository.findGlobal(true);
    if (config) {
      return maskConfig(config);
    }

    const created = await aiConfigRepository.upsertGlobal({});
    return maskConfig(created);
  }

  async update(input: UpdateAIConfigInput, userId?: string) {
    const existing = await aiConfigRepository.findGlobal(true);
    const existingKeys = mapKeys(existing?.apiKeys);
    const encryptedKeys: Partial<Record<AIProvider, string>> = { ...existingKeys };

    for (const provider of aiProviders) {
      const value = input.apiKeys[provider];
      if (value && value.trim()) {
        encryptedKeys[provider] = encryptSecret(value.trim());
      }
    }

    const updated = await aiConfigRepository.upsertGlobal({
      provider: input.provider,
      apiKeys: encryptedKeys,
      defaultModel: input.defaultModel,
      embeddingModel: input.embeddingModel,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      contextWindow: input.contextWindow,
      features: input.features,
      updatedBy: userId,
    });

    return maskConfig(updated);
  }

  async getRuntimeConfig() {
    const config = await aiConfigRepository.findGlobal(true);
    if (!config) return null;

    const apiKeys = mapKeys(config.apiKeys);
    const encryptedKey = apiKeys[config.provider];

    return {
      provider: config.provider,
      apiKey: encryptedKey ? decryptSecret(encryptedKey) : "",
      defaultModel: config.defaultModel,
      embeddingModel: config.embeddingModel,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      contextWindow: config.contextWindow,
      features: config.features,
    };
  }
}

export const aiConfigService = new AIConfigService();
