import { Service } from "typedi";
import type { HealthResponse } from "@/types/index.js";

/** Reports the API's liveness and uptime. */
@Service()
export class HealthService {
  /**
   * Build the current health status.
   */
  getHealth(): HealthResponse {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
