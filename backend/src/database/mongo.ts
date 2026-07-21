import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.MONGODB_URI);

  logger.info("MongoDB connected");
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
