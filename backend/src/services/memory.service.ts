import type { MemoryClearInput, MemoryExportInput, MemoryQueryInput, MemoryItemInput } from "../validation/memory.validation.js";

type MemoryItem = {
  id: string;
  user_id: string;
  type: string;
  category: string;
  key: string;
  value: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

export class MemoryService {
  private items: Map<string, MemoryItem> = new Map();

  async createMemory(userId: string, data: MemoryItemInput): Promise<MemoryItem> {
    const id = `mem_${userId}_${data.type}_${data.category}_${data.key}`;
    const now = new Date().toISOString();
    const item: MemoryItem = {
      id,
      user_id: userId,
      type: data.type,
      category: data.category,
      key: data.key,
      value: data.value,
      metadata: data.metadata || {},
      created_at: now,
      updated_at: now,
      expires_at: null,
    };
    this.items.set(id, item);
    return item;
  }

  async getMemory(userId: string, query: MemoryQueryInput): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];
    for (const item of this.items.values()) {
      if (item.user_id !== userId) continue;
      if (query.type && item.type !== query.type) continue;
      if (query.category && item.category !== query.category) continue;
      results.push(item);
    }
    results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return results.slice(0, query.limit);
  }

  async getById(itemId: string, userId: string): Promise<MemoryItem | null> {
    const item = this.items.get(itemId);
    if (item && item.user_id === userId) return item;
    return null;
  }

  async updateMemory(itemId: string, userId: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    const item = this.items.get(itemId);
    if (!item || item.user_id !== userId) return null;
    const updated = { ...item, ...updates, updated_at: new Date().toISOString() };
    this.items.set(itemId, updated);
    return updated;
  }

  async deleteMemory(itemId: string, userId: string): Promise<boolean> {
    const item = this.items.get(itemId);
    if (!item || item.user_id !== userId) return false;
    this.items.delete(itemId);
    return true;
  }

  async clearMemory(userId: string, type?: string): Promise<number> {
    const toDelete: string[] = [];
    for (const [id, item] of this.items.entries()) {
      if (item.user_id !== userId) continue;
      if (type && item.type !== type) continue;
      toDelete.push(id);
    }
    for (const id of toDelete) this.items.delete(id);
    return toDelete.length;
  }

  async exportMemory(userId: string, types: string[], format: string): Promise<Record<string, unknown>> {
    const allItems: MemoryItem[] = [];
    for (const type of types) {
      const query = { type, limit: 1000 } as MemoryQueryInput;
      const items = await this.getMemory(userId, query);
      allItems.push(...items);
    }
    return {
      user_id: userId,
      exported_at: new Date().toISOString(),
      format,
      count: allItems.length,
      items: allItems,
    };
  }

  async searchMemory(userId: string, query: string, limit: number = 10): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];
    const queryLower = query.toLowerCase();
    for (const item of this.items.values()) {
      if (item.user_id !== userId) continue;
      const searchText = `${item.key} ${JSON.stringify(item.value)} ${item.category}`.toLowerCase();
      if (searchText.includes(queryLower)) {
        results.push(item);
      }
    }
    results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return results.slice(0, limit);
  }

  async getMemoryStats(userId: string): Promise<Record<string, unknown>> {
    const stats = {
      total: 0,
      by_type: {} as Record<string, number>,
      by_category: {} as Record<string, number>,
    };
    for (const item of this.items.values()) {
      if (item.user_id !== userId) continue;
      stats.total++;
      stats.by_type[item.type] = (stats.by_type[item.type] || 0) + 1;
      stats.by_category[item.category] = (stats.by_category[item.category] || 0) + 1;
    }
    return stats;
  }
}

export const memoryService = new MemoryService();