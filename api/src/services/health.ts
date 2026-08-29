import { Service } from "typedi";
import { AppDataSource, redis } from "@/database/index.js";
import type { HealthResponse } from "@/types/index.js";

const PROBE_TIMEOUT_MS = 2000;

/** Reports the API's liveness and the state of its dependencies. */
@Service()
export class HealthService {
  /** Check the API and its dependencies. */
  async check(): Promise<HealthResponse> {
    const [postgres, redisStatus] = await Promise.all([
      this.probe(AppDataSource.query("SELECT 1")),
      this.probe(redis.ping()),
    ]);

    return {
      status: postgres === "ok" && redisStatus === "ok" ? "ok" : "degraded",
      checks: { postgres, redis: redisStatus },
      uptime: process.uptime(),
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
