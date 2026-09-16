import "dotenv/config";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

if (isProduction) {
  for (const key of ["DATABASE_URL", "REDIS_URL", "JWT_SECRET"]) {
    if (!process.env[key]) {
      console.error(`Missing required environment variable in production: ${key}`);
      process.exit(1);
    }
  }
}

export const config = {
  nodeEnv,
  host,
  port,
  logLevel: process.env.LOG_LEVEL ?? "info",
  isProduction,
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtSecret: process.env.JWT_SECRET ?? "",
} as const;
