import type { Response } from "express";
import { HttpError } from "@/errors/index.js";

/** The authenticated actor's id; throws when requireAuth hasn't set it. */
export function actorId(res: Response): string {
  const id = res.locals?.actor?.id;
  if (!id) {
    throw new HttpError.Unauthorized("Not authenticated");
  }

  return id;
}
