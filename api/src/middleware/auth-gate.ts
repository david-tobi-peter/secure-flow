import type { NextFunction, Request, Response } from "express";
import { Container } from "typedi";
import { HttpError } from "@/errors/index.js";
import { PowService, RateLimitService } from "@/security/index.js";

const CHALLENGE_HEADER = "x-pow-challenge";
const SOLUTION_HEADER = "x-pow-solution";

const rateLimit = Container.get(RateLimitService);
const pow = Container.get(PowService);

/** A flagged address must solve proof-of-work before any credential check. */
export async function authGate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ip = req.ip ?? "unknown";

    if ((await rateLimit.isFlagged(ip)) && !(await solve(req, ip))) {
      throw new HttpError.POWRequired("Proof of work required");
    }

    next();
  } catch (err) {
    HttpError.handle(req, err);
  }
}

async function solve(req: Request, ip: string): Promise<boolean> {
  const challenge = req.header(CHALLENGE_HEADER);
  const solution = req.header(SOLUTION_HEADER);
  if (!challenge || !solution) {
    return false;
  }

  return pow.verify(challenge, solution, ip);
}
