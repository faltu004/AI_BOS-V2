import { Router } from "express";
import { aiController } from "../controllers/ai.controller.js";
import { route } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { aiChatSchema } from "../validation/ai.validation.js";

export const aiRoutes = Router();

aiRoutes.use(authenticate);

aiRoutes.get("/context", ...route(aiController.context));
aiRoutes.post("/chat", ...route(validate({ body: aiChatSchema }), aiController.chat));
