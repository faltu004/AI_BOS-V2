import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { appConfig } from "./config/app.js";
import { dataChangeBroadcastMiddleware } from "./middleware/data-change-broadcast.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import { apiRateLimiter } from "./middleware/rate-limit.middleware.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { requestLoggerMiddleware } from "./middleware/request-logger.middleware.js";
import { routes } from "./routes/index.js";

export function createApp() {
  const app = express();
  // Direct server/LAN deployment: do not trust forwarded proxy headers.
  app.set("trust proxy", false);

  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: appConfig.clientOrigins,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));
  app.use(apiRateLimiter);
  app.use(appConfig.apiPrefix, (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });
  app.use(appConfig.apiPrefix, dataChangeBroadcastMiddleware);

  app.get("/health", (_req, res) => {
    res.status(200).json({
      success: true,
      message: "AI BOS API is healthy",
      service: appConfig.name,
    });
  });

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.use(appConfig.apiPrefix, routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
