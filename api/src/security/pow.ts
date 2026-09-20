import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Service } from "typedi";
import { config } from "@/config/index.js";
import { redis } from "@/database/index.js";

const CHALLENGE_TTL_SECONDS = 300;

const SPENT_KEY_PREFIX = "auth:pow:";

export interface PowChallenge {
  challenge: string;
  difficulty: number;
  algorithm: string;
  expiresAt: number;
}

/** Proof-of-work challenges: signed, IP-bound, single-use. */
@Service()
export class PowService {
  /** Leading hex zeros a solution must produce. */
  static readonly DIFFICULTY = 5;

  /**
   * Mint a challenge. It carries its own parameters, so verifying it needs no stored state.
   *
   * @param ip
   */
  issue(ip: string): PowChallenge {
    const issuedAt = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(8).toString("hex");
    const challenge = PowService.encode(`${issuedAt}.${nonce}.${this.signature(ip, issuedAt, nonce)}`);

    return {
      challenge,
      difficulty: PowService.DIFFICULTY,
      algorithm: "sha256",
      expiresAt: Number(issuedAt) + CHALLENGE_TTL_SECONDS,
    };
  }

  /**
   * True when the solution is correct and the challenge has not been spent.
   *
   * @param challenge
   * @param solution
   * @param ip
   */
  async verify(challenge: string, solution: string, ip: string): Promise<boolean> {
    const [issuedAt, nonce, signature] = PowService.decode(challenge).split(".");
    if (!issuedAt || !nonce || !signature) {
      return false;
    }

    const expected = this.signature(ip, issuedAt, nonce);
    if (signature.length !== expected.length) {
      return false;
    }
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return false;
    }

    const age = Math.floor(Date.now() / 1000) - Number(issuedAt);
    if (!Number.isInteger(age) || age > CHALLENGE_TTL_SECONDS) {
      return false;
    }

    const spent = await redis.set(
      `${SPENT_KEY_PREFIX}${PowService.digest(challenge)}`,
      "1",
      "EX",
      CHALLENGE_TTL_SECONDS,
      "NX",
    );
    if (spent === null) {
      return false;
    }

    return PowService.digest(`${challenge}${solution}`).startsWith("0".repeat(PowService.DIFFICULTY));
  }

  private signature(ip: string, issuedAt: string, nonce: string): string {
    return createHmac("sha256", config.powSecret)
      .update(`${ip}|${issuedAt}|${nonce}`)
      .digest("hex")
      .slice(0, 32);
  }

  private static digest(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private static encode(value: string): string {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  private static decode(value: string): string {
    return Buffer.from(value, "base64url").toString("utf8");
  }
}
