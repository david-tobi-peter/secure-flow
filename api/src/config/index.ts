import "dotenv/config";

const port = Number(process.env.PORT ?? 3000);

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port,
  logLevel: process.env.LOG_LEVEL ?? "info",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtSecret: process.env.JWT_SECRET ?? "",
} as const;
