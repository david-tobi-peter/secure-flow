import { config } from "@/config/index.js";
import { Logger } from "@/utils/index.js";
import { createApp } from "@/index.js";
import { AppDataSource } from "@/database/index.js";

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();
  Logger.info("Database connected");

  const app = createApp();

  const server = app.listen(config.port, () => {
    Logger.info(
      `SecureFlow API listening on http://localhost:${config.port} (env: ${config.nodeEnv})`,
    );
  });

  function shutdown(signal: NodeJS.Signals): void {
    Logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(async (err) => {
      if (err) {
        Logger.error("Error while closing server", err);
        process.exit(1);
      }
      await AppDataSource.destroy();
      Logger.info("Server closed cleanly");
      process.exit(0);
    });

    setTimeout(() => {
      Logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  Logger.error("Failed to start", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  Logger.error("Uncaught exception, restarting", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  Logger.error("Unhandled rejection, restarting", reason);
  process.exit(1);
});
