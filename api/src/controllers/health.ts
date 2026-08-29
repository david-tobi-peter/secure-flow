import type { Request, Response } from "express";
import { Inject, Service } from "typedi";
import { ApiResponse } from "@/helpers/index.js";
import { Controller } from "@/decorators/index.js";
import { HttpError } from "@/errors/index.js";
import { HealthService } from "@/services/index.js";

/** HTTP layer for the health endpoint. */
@Service()
@Controller
export class HealthController {
  constructor(@Inject(() => HealthService) private readonly healthService: HealthService) {}

  /**
   * Respond with the current health status.
   *
   * @param req
   * @param res
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.healthService.check();
      const status = health.status === "ok" ? 200 : 503;

      ApiResponse.send(res, status, "Health check", health);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }
}
