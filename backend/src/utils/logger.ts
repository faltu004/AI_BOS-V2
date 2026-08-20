import path from "node:path";
import pino from "pino";
import { env } from "../config/env.js";
import { createRotatingLogWriter } from "./rotating-log-writer.js";

const level = env.NODE_ENV === "production" ? "info" : "debug";

function createProductionLogger(): pino.Logger {
  const rotatingFile = createRotatingLogWriter({
    directory: path.resolve(process.cwd(), env.LOG_DIR),
    fileName: "backend.log",
    maxSizeBytes: env.LOG_MAX_FILE_SIZE_MB * 1024 * 1024,
    maxFiles: env.LOG_MAX_FILES,
  });

  /*
   * Dual sink: stdout stays available for interactive runs and for
   * whatever process supervisor (Task Scheduler, a console window,
   * etc.) captures the process's own output, while the rotating file
   * is the durable on-disk record with size-based retention.
   */
  return pino(
    { level },
    pino.multistream([
      { stream: process.stdout },
      { stream: rotatingFile },
    ]),
  );
}

function createDevelopmentLogger(): pino.Logger {
  return pino({
    level,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
      },
    },
  });
}

export const logger =
  env.NODE_ENV === "production"
    ? createProductionLogger()
    : createDevelopmentLogger();
