import type { Request, Response } from "express";
import { Container, Service } from "typedi";
import { actorId, ApiResponse } from "@/helpers/index.js";
import { Controller } from "@/decorators/index.js";
import { HttpError } from "@/errors/index.js";
import { ProjectService } from "@/services/index.js";
import type { CreateProjectRequest } from "@/types/index.js";

/** HTTP layer for project endpoints. */
@Service()
@Controller
export class ProjectController {
  private readonly projects: ProjectService;

  constructor() {
    this.projects = Container.get(ProjectService);
  }

  /**
   * Create a project.
   *
   * @param req
   * @param res
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const orgId = req.params.orgId as string;
      const payload = req.body as CreateProjectRequest;

      const project = await this.projects.create(actor, orgId, payload.name);
      ApiResponse.send(res, 201, "Project created", project);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * List projects in an organization.
   *
   * @param req
   * @param res
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const orgId = req.params.orgId as string;
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);

      const result = await this.projects.list(actor, orgId, page, limit);
      ApiResponse.sendPaginated(res, 200, "Projects list", result.data, page, limit, result.total);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * Get a project.
   *
   * @param req
   * @param res
   */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const orgId = req.params.orgId as string;
      const projectId = req.params.projectId as string;

      const project = await this.projects.get(actor, orgId, projectId);
      ApiResponse.send(res, 200, "Project details", project);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * Delete a project.
   *
   * @param req
   * @param res
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const orgId = req.params.orgId as string;
      const projectId = req.params.projectId as string;

      await this.projects.delete(actor, orgId, projectId);
      ApiResponse.send(res, 200, "Project deleted");
    } catch (err) {
      HttpError.handle(req, err);
    }
  }
}
