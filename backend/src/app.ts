import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { appConfig } from "./config/app.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import { apiRateLimiter } from "./middleware/rate-limit.middleware.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { routes } from "./routes/index.js";
import { logger } from "./utils/logger.js";

export function createApp() {
  const app = express();

  if (appConfig.isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: appConfig.clientOrigin,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    morgan(appConfig.isProduction ? "combined" : "dev", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    }),
  );
  app.use(apiRateLimiter);

  app.get("/health", (_req, res) => {
    res.status(200).json({
      success: true,
      message: "AI BOS API is healthy",
      service: appConfig.name,
    });
  });

  app.use(appConfig.apiPrefix, routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
