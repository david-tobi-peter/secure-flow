import type { Request, Response } from "express";
import { Container, Service } from "typedi";
import { actorId, ApiResponse } from "@/helpers/index.js";
import { Controller } from "@/decorators/index.js";
import { HttpError } from "@/errors/index.js";
import { OrganizationService } from "@/services/index.js";
import type { CreateOrganizationRequest } from "@/types/index.js";

/** HTTP layer for organization endpoints. */
@Service()
@Controller
export class OrganizationController {
  private readonly organizations: OrganizationService;

  constructor() {
    this.organizations = Container.get(OrganizationService);
  }

  /**
   * Create an organization.
   *
   * @param req
   * @param res
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const payload = req.body as CreateOrganizationRequest;

      const org = await this.organizations.create(actor, payload.name);
      ApiResponse.send(res, 201, "Organization created", org);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * List the caller's organizations.
   *
   * @param req
   * @param res
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);

      const result = await this.organizations.listForUser(actor, page, limit);
      ApiResponse.sendPaginated(res, 200, "Organizations list", result.data, page, limit, result.total);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * Get an organization.
   *
   * @param req
   * @param res
   */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const orgId = req.params.orgId as string;

      const org = await this.organizations.getForUser(actor, orgId);
      ApiResponse.send(res, 200, "Organization details", org);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }
}
