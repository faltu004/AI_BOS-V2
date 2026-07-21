import type { RequestHandler } from "express";
import { memoryService } from "../services/memory.service.js";
import { sendSuccess } from "../utils/api-response.js";
import { validate } from "../middleware/validate.middleware.js";
import { memoryQuerySchema, memoryItemSchema, memoryExportSchema, memoryClearSchema } from "../validation/memory.validation.js";

export class MemoryController {
  getItems: RequestHandler = async (req, res) => {
    const result = await memoryService.getMemory(req.user!.id, req.query as unknown as import("../validation/memory.validation.js").MemoryQueryInput);
    sendSuccess(res, 200, { message: "Memory items retrieved", data: result });
  };

  getById: RequestHandler = async (req, res) => {
    const result = await memoryService.getById(req.params.id, req.user!.id);
    if (!result) {
      return sendSuccess(res, 404, { message: "Memory item not found", data: null });
    }
    sendSuccess(res, 200, { message: "Memory item retrieved", data: result });
  };

  createItem: RequestHandler = async (req, res) => {
    const result = await memoryService.createMemory(req.user!.id, req.body);
    sendSuccess(res, 201, { message: "Memory item created", data: result });
  };

  updateItem: RequestHandler = async (req, res) => {
    const result = await memoryService.updateMemory(req.params.id, req.user!.id, req.body);
    if (!result) {
      return sendSuccess(res, 404, { message: "Memory item not found", data: null });
    }
    sendSuccess(res, 200, { message: "Memory item updated", data: result });
  };

  deleteItem: RequestHandler = async (req, res) => {
    const deleted = await memoryService.deleteMemory(req.params.id, req.user!.id);
    sendSuccess(res, 200, { message: deleted ? "Memory item deleted" : "Memory item not found", data: { deleted } });
  };

  clearAll: RequestHandler = async (req, res) => {
    const { type } = req.body as import("../validation/memory.validation.js").MemoryClearInput;
    const deletedCount = await memoryService.clearMemory(req.user!.id, type);
    sendSuccess(res, 200, { message: "Memory cleared", data: { deleted_count: deletedCount } });
  };

  exportMemory: RequestHandler = async (req, res) => {
    const result = await memoryService.exportMemory(req.user!.id, req.body.types, req.body.format);
    sendSuccess(res, 200, { message: "Memory exported", data: result });
  };

  search: RequestHandler = async (req, res) => {
    const result = await memoryService.searchMemory(req.user!.id, req.query.q as string, Number(req.query.limit) || 10);
    sendSuccess(res, 200, { message: "Memory search completed", data: result });
  };

  getStats: RequestHandler = async (req, res) => {
    const result = await memoryService.getMemoryStats(req.user!.id);
    sendSuccess(res, 200, { message: "Memory stats retrieved", data: result });
  };
}

export const memoryController = new MemoryController();