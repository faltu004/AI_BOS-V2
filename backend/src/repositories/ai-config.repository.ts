import { aiConfigScope } from "../constants/ai-config.js";
import { AIConfigModel, type AIConfig } from "../models/ai-config.model.js";

export class AIConfigRepository {
  async findGlobal(includeSecrets = false) {
    const query = AIConfigModel.findOne({ scope: aiConfigScope });
    if (includeSecrets) {
      query.select("+apiKeys");
    }
    return query;
  }

  async upsertGlobal(input: Partial<AIConfig>) {
    return AIConfigModel.findOneAndUpdate(
      { scope: aiConfigScope },
      { $set: { ...input, scope: aiConfigScope } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).select("+apiKeys");
  }
}

export const aiConfigRepository = new AIConfigRepository();
