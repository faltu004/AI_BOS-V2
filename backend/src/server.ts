import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./database/mongo.js";
import { logger } from "./utils/logger.js";

const app = createApp();
const server = createServer(app);

async function bootstrap() {
  await connectDatabase();

  server.listen(env.PORT, () => {
    logger.info(`AI BOS API running on port ${env.PORT}`);
  });
}

async function shutdown(signal: string) {
  logger.info(`${signal} received. Shutting down API server.`);

  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

void bootstrap().catch((error) => {
  logger.error(error);
  process.exit(1);
});
