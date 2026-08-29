import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Container } from "typedi";
import { config } from "@/config/index.js";
import { HttpError } from "@/errors/index.js";
import { SessionService } from "@/services/index.js";

const sessions = Container.get(SessionService);

/** Requires a valid Bearer token with a live session; sets actor and jti on res.locals. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      throw new HttpError.Unauthorized("Missing bearer token");
    }

    const payload = jwt.verify(token, config.jwtSecret);
    if (typeof payload === "string" || !payload.sub || !payload.jti) {
      throw new HttpError.Unauthorized("Invalid token");
    }

    const valid = await sessions.verify(payload.jti, payload.sub);
    if (!valid) {
      throw new HttpError.Unauthorized("Invalid or expired session");
    }

    res.locals.actor = { id: payload.sub };
    res.locals.jti = payload.jti;
    next();
  } catch (err) {
    HttpError.handle(req, err);
  }
}
