import { readFileSync } from "node:fs";
import { join } from "node:path";
import express from "express";
import type { RequestHandler } from "express";
import swaggerUi from "swagger-ui-express";
import OpenApiValidator from "express-openapi-validator";
import { config } from "@/config/index.js";
import { requestId } from "@/middleware/index.js";
import { authRouter, healthRouter, organizationRouter, projectsRouter, tasksRouter } from "@/routes/index.js";
import { HttpError } from "@/errors/index.js";
import { errorMeta } from "@/loggers/index.js";

/** Largest request body accepted, enforced by the parser as it reads the stream - 100KB. */
const MAX_BODY_BYTES = 100 * 1024;

type HttpErrorClass = new (message: string) => HttpError;

/** Wrap a middleware with appropriate error class */
function withEnvelope(
  middleware: RequestHandler,
  errorFor: (err: unknown) => HttpErrorClass,
): RequestHandler {
  return (req, res, next) => {
    middleware(req, res, (err?: unknown) => {
      if (err) {
        const ErrorClass = errorFor(err);
        HttpError.handle(req, new ErrorClass(errorMeta(err).message));
        return;
      }
      next();
    });
  };
}

/** Builds the Express app: middleware, OpenAPI validation, routes. */
export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(
    withEnvelope(express.json({ limit: MAX_BODY_BYTES }), (err) =>
      err instanceof SyntaxError ? HttpError.BadRequest : HttpError.PayloadTooLarge,
    ),
  );

  const validator = OpenApiValidator.middleware({
    apiSpec: join(process.cwd(), "spec", "openapi.json"),
    ignoreUndocumented: false,
    validateRequests: { coerceTypes: false },
    validateResponses: true,
  });

  for (const middleware of validator) {
    app.use(withEnvelope(middleware, () => HttpError.BadRequest));
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
