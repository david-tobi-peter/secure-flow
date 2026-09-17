import { readFileSync } from "node:fs";
import { join } from "node:path";
import express from "express";
import swaggerUi from "swagger-ui-express";
import OpenApiValidator from "express-openapi-validator";
import { config } from "@/config/index.js";
import { requestId } from "@/middleware/index.js";
import { authRouter, healthRouter, organizationRouter, projectsRouter, tasksRouter } from "@/routes/index.js";
import { HttpError } from "@/errors/index.js";
import { errorMeta } from "@/loggers/index.js";

/** Builds the Express app: middleware, OpenAPI validation, routes. */
export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(express.json());

  const validator = OpenApiValidator.middleware({
    apiSpec: join(process.cwd(), "spec", "openapi.json"),
    ignoreUndocumented: true,
    validateRequests: { coerceTypes: true },
    validateResponses: true,
  });

  for (const middleware of validator) {
    app.use((req, res, next) => {
      middleware(req, res, (err) => {
        if (err) {
          const message = errorMeta(err).message;
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
  app.use("/auth", authRouter);
  app.use("/organizations", organizationRouter);
  app.use(projectsRouter);
  app.use(tasksRouter);

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
