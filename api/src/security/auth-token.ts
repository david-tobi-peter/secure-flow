import { randomUUID } from "node:crypto";
import { Service } from "typedi";
import jwt from "jsonwebtoken";
import { config } from "@/config/index.js";
import { redis } from "@/database/index.js";

export type TokenKind = "verify" | "pending";

/** A service for minting and verifying flow tokens. */
@Service()
export class AuthTokenService {
  static readonly TTL_SECONDS = 5 * 60;

  /**
   * Mint a jwt token for the given kind and email.
   *
   * @param kind
   * @param email
   */
  async create(kind: TokenKind, email: string): Promise<string> {
    const jti = randomUUID();
    await redis.set(AuthTokenService.tokenKey(kind, jti), email, "EX", AuthTokenService.TTL_SECONDS);

    return jwt.sign({ kind, email, jti }, config.jwtSecret, {
      expiresIn: AuthTokenService.TTL_SECONDS,
    });
  }

  /**
   * Decode the given token and return the email if it is valid.
   *
   * @param kind
   * @param token
   */
  async read(kind: TokenKind, token: string): Promise<string | null> {
    const payload = AuthTokenService.decode(token);
    if (payload === null || payload.kind !== kind) {
      return null;
    }
    if (typeof payload.jti !== "string" || typeof payload.email !== "string") {
      return null;
    }

    const stored = await redis.get(AuthTokenService.tokenKey(kind, payload.jti));
    return stored === payload.email ? payload.email : null;
  }

  /**
   * Revoke the given token, making it no longer valid.
   *
   * @param kind
   * @param token
   */
  async revoke(kind: TokenKind, token: string): Promise<void> {
    const payload = AuthTokenService.decode(token);
    if (payload !== null && typeof payload.jti === "string") {
      await redis.del(AuthTokenService.tokenKey(kind, payload.jti));
    }
  }

  /** Decode the given token and return the payload if it is valid. */
  private static decode(token: string): Record<string, unknown> | null {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      return typeof payload === "string" ? null : payload;
    } catch {
      return null;
    }
  }

  /** Return the Redis key used to store the given token's record. */
  private static tokenKey(kind: TokenKind, jti: string): string {
    return `auth:${kind}:${jti}`;
  }
}
