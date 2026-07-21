import { Router } from "express";
import { memoryController } from "../controllers/memory.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { memoryQuerySchema, memoryItemSchema, memoryExportSchema, memoryClearSchema } from "../validation/memory.validation.js";

export const memoryRoutes = Router();

memoryRoutes.use(authenticate);

memoryRoutes.get("/", validate({ query: memoryQuerySchema }), asyncHandler(memoryController.getItems));

memoryRoutes.get("/:id", asyncHandler(memoryController.getById));

memoryRoutes.post("/", validate({ body: memoryItemSchema }), asyncHandler(memoryController.createItem));

memoryRoutes.patch("/:id", validate({ body: memoryItemSchema }), asyncHandler(memoryController.updateItem));

memoryRoutes.delete("/:id", asyncHandler(memoryController.deleteItem));

memoryRoutes.delete("/", validate({ body: memoryClearSchema }), asyncHandler(memoryController.clearAll));

memoryRoutes.post("/export", validate({ body: memoryExportSchema }), asyncHandler(memoryController.exportMemory));

memoryRoutes.get("/search", asyncHandler(memoryController.search));

memoryRoutes.get("/stats/:userId", asyncHandler(memoryController.getStats));