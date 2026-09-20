import { Service } from "typedi";
import { AppDataSource, redis } from "@/database/index.js";
import type { HealthResponse } from "@/types/index.js";

/** Reports the API's liveness and the state of its dependencies. */
@Service()
export class HealthService {
  private static readonly PROBE_TIMEOUT_MS = 2000;

  private static readonly MINUTE = 60;
  private static readonly HOUR = 60 * HealthService.MINUTE;
  private static readonly DAY = 24 * HealthService.HOUR;

  /** Check the API and its dependencies. */
  async check(): Promise<HealthResponse> {
    const [postgres, redisStatus] = await Promise.all([
      this.probe(AppDataSource.query("SELECT 1")),
      this.probe(redis.ping()),
    ]);
    const uptime = process.uptime();

    return {
      status: postgres === "ok" && redisStatus === "ok" ? "ok" : "degraded",
      checks: { postgres, redis: redisStatus },
      uptime: HealthService.formatUptime(uptime),
      timestamp: new Date().toISOString(),
    };
  }

  private static formatUptime(seconds: number): string {
    const total = Math.floor(seconds);
    const components: [number, string][] = [
      [Math.floor(total / HealthService.DAY), "d"],
      [Math.floor(total / HealthService.HOUR) % 24, "h"],
      [Math.floor(total / HealthService.MINUTE) % 60, "m"],
      [total % HealthService.MINUTE, "s"],
    ];

    const rendered = components
      .filter(([value]) => value > 0)
      .map(([value, label]) => `${value}${label}`);

    return rendered.length > 0 ? rendered.join(" ") : "0s";
  }

  private async probe(check: Promise<unknown>): Promise<"ok" | "down"> {
    const safe = check.then(
      () => "ok" as const,
      () => "down" as const,
    );
    const timeout = new Promise<"down">((resolve) =>
      setTimeout(() => resolve("down"), HealthService.PROBE_TIMEOUT_MS),
    );
    return Promise.race([safe, timeout]);
  }
}
