import { Redis } from "ioredis";
import { config } from "@/config/index.js";
import { Logger } from "@/loggers/index.js";

/** Shared Redis client (sessions, rate limiting, queues). */
export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 1,
});

redis.on("error", (err) => {
  Logger.error("Redis connection error", err);
});
