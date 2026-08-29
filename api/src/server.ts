import { config } from "@/config/index.js";
import { Logger } from "@/utils/index.js";
import { createApp } from "@/index.js";

const app = createApp();

const server = app.listen(config.port, () => {
  Logger.info(
    `SecureFlow API listening on http://localhost:${config.port} (env: ${config.nodeEnv})`,
  );
});

function shutdown(signal: NodeJS.Signals): void {
  Logger.info(`Received ${signal}, shutting down gracefully`);
  server.close((err) => {
    if (err) {
      Logger.error("Error while closing server", { message: err.message, stack: err.stack });
      process.exit(1);
    }
    Logger.info("Server closed cleanly");
    process.exit(0);
  });

  setTimeout(() => {
    Logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("uncaughtException", (err) => {
  Logger.error("Uncaught exception, restarting", { message: err.message, stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  Logger.error("Unhandled rejection, restarting", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
