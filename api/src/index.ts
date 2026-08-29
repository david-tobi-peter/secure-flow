import "reflect-metadata";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import express from "express";
import swaggerUi from "swagger-ui-express";
import OpenApiValidator from "express-openapi-validator";
import { config } from "@/config/index.js";
import { requestId } from "@/middleware/index.js";
import { healthRouter } from "@/routes/index.js";
import { HttpError } from "@/errors/index.js";

export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(express.json());

  const validator = OpenApiValidator.middleware({
    apiSpec: join(process.cwd(), "spec", "openapi.json"),
    ignoreUndocumented: true,
    validateRequests: true,
    validateResponses: true,
  });

  for (const middleware of validator) {
    app.use((req, res, next) => {
      middleware(req, res, (err) => {
        if (err) {
          const message = err instanceof Error ? err.message : String(err);
          const status =
            typeof err === "object" &&
            err !== null &&
            "status" in err &&
            typeof err.status === "number"
              ? err.status
              : 400;
          HttpError.handle(req, HttpError.fromStatus(status, message));
          return;
        }
        next();
      });
    });
  }

  app.use("/health", healthRouter);

  if (!config.isProduction) {
    const spec = JSON.parse(
      readFileSync(join(process.cwd(), "spec", "openapi.json"), "utf8"),
    );
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  }

  app.use((req, _res) => {
    HttpError.handle(req, new HttpError.NotFound("Route not found"));
  });

  return app;
}
