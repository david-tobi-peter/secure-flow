import type { Request } from "express";
import { errorMeta, Logger } from "@/utils/index.js";

export abstract class HttpError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  static get BadRequest(): typeof BadRequestError {
    return BadRequestError;
  }
  static get Unauthorized(): typeof UnauthorizedError {
    return UnauthorizedError;
  }
  static get Forbidden(): typeof ForbiddenError {
    return ForbiddenError;
  }
  static get NotFound(): typeof NotFoundError {
    return NotFoundError;
  }
  static get Conflict(): typeof ConflictError {
    return ConflictError;
  }
  static get Internal(): typeof InternalError {
    return InternalError;
  }

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }

  /**
   * Write this error as the envelope response for the given request.
   *
   * @param req
   */
  respond(req: Request): void {
    const res = req.res;
    if (!res) {
      return;
    }
    const requestId = (res.locals.requestId as string | undefined) ?? null;
    res.status(this.statusCode).json({
      error: {
        code: this.code,
        message: this.message,
        ...(requestId && { requestId }),
      },
    });
  }

  /**
   * Map a database error to an HttpError.
   *
   * @param err
   * @returns The mapped HttpError, or null when the error isn't a recognized database error.
   */
  static fromDatabase(err: unknown): HttpError | null {
    const state = sqlState(err);
    if (!state) {
      return null;
    }
    return SQLSTATE_ERRORS[state]?.() ?? null;
  }

  /**
   * Map an HTTP status code to the matching error class.
   *
   * @param status
   * @param message
   */
  static fromStatus(status: number, message: string): HttpError {
    if (status >= 500) {
      return new HttpError.Internal(message);
    }
    if (status === 401) {
      return new HttpError.Unauthorized(message);
    }
    if (status === 403) {
      return new HttpError.Forbidden(message);
    }
    if (status === 404) {
      return new HttpError.NotFound(message);
    }
    if (status === 409) {
      return new HttpError.Conflict(message);
    }
    return new HttpError.BadRequest(message);
  }

  /**
   * Normalize anything thrown into an HttpError and respond for the request.
   *
   * @param req
   * @param err
   * @returns Writes the envelope; unknown errors are logged and become 500s.
   */
  static handle(req: Request, err: unknown): void {
    if (err instanceof HttpError) {
      err.respond(req);
      return;
    }
    
    const databaseError = HttpError.fromDatabase(err);
    if (databaseError) {
      databaseError.respond(req);
      return;
    }
    
    const requestId = (req.res?.locals.requestId as string | undefined) ?? null;
    Logger.error("Unhandled error", { requestId, ...errorMeta(err) });
    new HttpError.Internal("Internal server error").respond(req);
  }
}

class BadRequestError extends HttpError {
  statusCode = 400;
  code = "BAD_REQUEST";
}

class UnauthorizedError extends HttpError {
  statusCode = 401;
  code = "UNAUTHORIZED";
}

class ForbiddenError extends HttpError {
  statusCode = 403;
  code = "FORBIDDEN";
}

class NotFoundError extends HttpError {
  statusCode = 404;
  code = "NOT_FOUND";
}

class ConflictError extends HttpError {
  statusCode = 409;
  code = "CONFLICT";
}

class InternalError extends HttpError {
  statusCode = 500;
  code = "INTERNAL";
}

const SQLSTATE = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  NOT_NULL_VIOLATION: "23502",
  CHECK_VIOLATION: "23514",
  INVALID_TEXT_REPRESENTATION: "22P02",
  STRING_DATA_RIGHT_TRUNCATION: "22001",
  NUMERIC_VALUE_OUT_OF_RANGE: "22003",
} as const;

type SqlState = (typeof SQLSTATE)[keyof typeof SQLSTATE];

const SQLSTATE_ERRORS: Record<SqlState, () => HttpError> = {
  [SQLSTATE.UNIQUE_VIOLATION]: () => new HttpError.Conflict("Resource already exists"),
  [SQLSTATE.FOREIGN_KEY_VIOLATION]: () => new HttpError.Conflict("Resource is in use"),
  [SQLSTATE.NOT_NULL_VIOLATION]: () => new HttpError.BadRequest("Missing required value"),
  [SQLSTATE.CHECK_VIOLATION]: () => new HttpError.BadRequest("Value violates a constraint"),
  [SQLSTATE.INVALID_TEXT_REPRESENTATION]: () =>
    new HttpError.BadRequest("Invalid value format"),
  [SQLSTATE.STRING_DATA_RIGHT_TRUNCATION]: () => new HttpError.BadRequest("Value is too long"),
  [SQLSTATE.NUMERIC_VALUE_OUT_OF_RANGE]: () => new HttpError.BadRequest("Value is out of range"),
};

function sqlState(err: unknown): SqlState | undefined {
  if (!(err instanceof Error)) {
    return undefined;
  }
  const driverError = (err as { driverError?: unknown }).driverError;
  const candidate = driverError ?? err;
  if (candidate && typeof candidate === "object" && "code" in candidate) {
    const code = (candidate as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
      return code as SqlState;
    }
  }
  return undefined;
}
