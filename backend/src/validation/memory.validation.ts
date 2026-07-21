import { z } from "zod";

export const memoryQuerySchema = z.object({
  type: z.enum(["conversation", "business", "preference", "semantic"]).optional(),
  category: z.string().max(64).optional(),
  query: z.string().max(500).optional(),
  limit: z.coerce.number().positive().max(100).default(10),
});

export const memoryItemSchema = z.object({
  type: z.enum(["conversation", "business", "preference", "semantic"]),
  category: z.string().max(64),
  key: z.string().max(128),
  value: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const memoryExportSchema = z.object({
  types: z.array(z.enum(["conversation", "business", "preference", "semantic"])).min(1),
  format: z.enum(["json", "csv"]).default("json"),
});

export const memoryClearSchema = z.object({
  type: z.enum(["conversation", "business", "preference", "semantic"]).optional(),
});

export type MemoryQueryInput = z.infer<typeof memoryQuerySchema>;
export type MemoryItemInput = z.infer<typeof memoryItemSchema>;
export type MemoryExportInput = z.infer<typeof memoryExportSchema>;
export type MemoryClearInput = z.infer<typeof memoryClearSchema>;