import { Service } from "typedi";
import { AppDataSource, redis } from "@/database/index.js";
import type { HealthResponse } from "@/types/index.js";

const PROBE_TIMEOUT_MS = 2000;

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatUptime(seconds: number): string {
  const total = Math.floor(seconds);
  const components: [number, string][] = [
    [Math.floor(total / DAY), "d"],
    [Math.floor(total / HOUR) % 24, "h"],
    [Math.floor(total / MINUTE) % 60, "m"],
    [total % MINUTE, "s"],
  ];

  const rendered = components
    .filter(([value]) => value > 0)
    .map(([value, label]) => `${value}${label}`);

  return rendered.length > 0 ? rendered.join(" ") : "0s";
}

/** Reports the API's liveness and the state of its dependencies. */
@Service()
export class HealthService {
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
      uptime: formatUptime(uptime),
      timestamp: new Date().toISOString(),
    };
  }

  private async probe(check: Promise<unknown>): Promise<"ok" | "down"> {
    const safe = check.then(
      () => "ok" as const,
      () => "down" as const,
    );
    const timeout = new Promise<"down">((resolve) =>
      setTimeout(() => resolve("down"), PROBE_TIMEOUT_MS),
    );
    return Promise.race([safe, timeout]);
  }
}
