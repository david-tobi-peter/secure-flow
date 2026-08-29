import type { Request, Response } from "express";
import { Inject, Service } from "typedi";
import { ApiResponse } from "@/utils/index.js";
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
  getHealth(req: Request, res: Response): void {
    try {
      const health = this.healthService.getHealth();
      ApiResponse.send(res, 200, "Health check", health);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }
}
