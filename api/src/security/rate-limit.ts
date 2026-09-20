import { Service } from "typedi";
import { redis } from "@/database/index.js";
import { Logger } from "@/loggers/index.js";

/** Rate limiting for the authentication endpoints. */
@Service()
export class RateLimitService {
  /** Per-address counting window — 1m. */
  private static readonly IP_WINDOW_SECONDS = 60;

  /** Failed attempts from one address before it must solve proof-of-work. */
  private static readonly IP_FAILURE_THRESHOLD = 10;

  /** Challenges issued to one address inside the window. */
  private static readonly CHALLENGE_THRESHOLD = 30;

  /** How long a flagged address must solve proof-of-work — 48h. */
  private static readonly FLAG_TTL_SECONDS = 48 * 60 * 60;

  /** Window for TOTP attempts on one account — 5m. */
  private static readonly TOTP_WINDOW_SECONDS = 5 * 60;

  /** TOTP attempts allowed on an account inside the window. */
  private static readonly TOTP_THRESHOLD = 3;

  private static failsKey(ip: string): string {
    return `auth:ip:${ip}:fails`;
  }

  private static flagKey(ip: string): string {
    return `auth:ip:${ip}:flagged`;
  }

  private static challengesKey(ip: string): string {
    return `auth:ip:${ip}:challenges`;
  }

  private static totpKey(email: string): string {
    return `auth:totp:${email.toLowerCase()}:fails`;
  }

  /**
   * Whether this address must solve proof-of-work.
   *
   * @param ip
   */
  async isFlagged(ip: string): Promise<boolean> {
    const flag = await redis.exists(RateLimitService.flagKey(ip));
    return flag === 1;
  }

  /**
   * Record a failed email/password check.
   *
   * @param ip
   */
  async recordPasswordFailure(ip: string): Promise<void> {
    const failsKey = RateLimitService.failsKey(ip);
    const failCount = await redis.incr(failsKey);
    if (failCount === 1) {
      await redis.expire(failsKey, RateLimitService.IP_WINDOW_SECONDS);
    }

    if (failCount <= RateLimitService.IP_FAILURE_THRESHOLD) {
      return;
    }

    const flagKey = RateLimitService.flagKey(ip);
    const set = await redis.set(flagKey, "1", "EX", RateLimitService.FLAG_TTL_SECONDS, "NX");
    if (set === "OK") {
      Logger.warn("IP flagged for PoW", { ip, failCount });
    }
  }

  /**
   * Count a challenge request; false once this address is past the cap.
   *
   * @param ip
   */
  async allowChallenge(ip: string): Promise<boolean> {
    const challengesKey = RateLimitService.challengesKey(ip);
    const issued = await redis.incr(challengesKey);
    if (issued === 1) {
      await redis.expire(challengesKey, RateLimitService.IP_WINDOW_SECONDS);
    }

    return issued <= RateLimitService.CHALLENGE_THRESHOLD;
  }

  /**
   * Whether this account has used its TOTP attempts inside the window.
   *
   * @param email
   */
  async isTotpLimited(email: string): Promise<boolean> {
    const used = await redis.get(RateLimitService.totpKey(email));
    return used !== null && Number(used) >= RateLimitService.TOTP_THRESHOLD;
  }

  /**
   * Record a failed TOTP check.
   *
   * @param email
   */
  async recordTotpFailure(email: string): Promise<void> {
    const totpKey = RateLimitService.totpKey(email);
    const used = await redis.incr(totpKey);
    if (used === 1) {
      await redis.expire(totpKey, RateLimitService.TOTP_WINDOW_SECONDS);
    }
  }

  /**
   * Clear the window after a successful check.
   *
   * @param email
   */
  async clearTotpFailures(email: string): Promise<void> {
    await redis.del(RateLimitService.totpKey(email));
  }
}
