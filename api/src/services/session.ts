import { randomUUID } from "node:crypto";
import { Service } from "typedi";
import { redis } from "@/database/index.js";

const KEY_PREFIX = "session:";

/** Server-side sessions: maps a token id to a user id with a TTL. */
@Service()
export class SessionService {
  static readonly TTL_SECONDS = 3 * 24 * 60 * 60;

  /** Create a session for the user; returns the token id. */
  async create(userId: string): Promise<string> {
    const jti = randomUUID();
    await redis.set(`${KEY_PREFIX}${jti}`, userId, "EX", SessionService.TTL_SECONDS);
    return jti;
  }

  /** True when the token id maps to the given user. */
  async verify(jti: string, userId: string): Promise<boolean> {
    const stored = await redis.get(`${KEY_PREFIX}${jti}`);
    return stored === userId;
  }

  /** Revoke a session. */
  async revoke(jti: string): Promise<void> {
    await redis.del(`${KEY_PREFIX}${jti}`);
  }
}
