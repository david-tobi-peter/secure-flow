import type { Request, Response } from "express";
import { Container, Service } from "typedi";
import { actorId, ApiResponse } from "@/helpers/index.js";
import { Controller } from "@/decorators/index.js";
import { HttpError } from "@/errors/index.js";
import { TaskService } from "@/services/index.js";
import type { CreateTaskRequest, UpdateTaskRequest } from "@/types/index.js";

/** HTTP layer for task endpoints. */
@Service()
@Controller
export class TaskController {
  private readonly tasks: TaskService;

  constructor() {
    this.tasks = Container.get(TaskService);
  }

  /**
   * Create a task.
   *
   * @param req
   * @param res
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const orgId = req.params.orgId as string;
      const projectId = req.params.projectId as string;
      const payload = req.body as CreateTaskRequest;

      const task = await this.tasks.create(actor, orgId, projectId, payload.title, payload.status);
      ApiResponse.send(res, 201, "Task created", task);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * List tasks in a project.
   *
   * @param req
   * @param res
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const orgId = req.params.orgId as string;
      const projectId = req.params.projectId as string;
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);

      const result = await this.tasks.list(actor, orgId, projectId, page, limit);
      ApiResponse.sendPaginated(res, 200, "Tasks list", result.data, page, limit, result.total);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * Get a task.
   *
   * @param req
   * @param res
   */
  async get(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const orgId = req.params.orgId as string;
      const projectId = req.params.projectId as string;
      const taskId = req.params.taskId as string;

      const task = await this.tasks.get(actor, orgId, projectId, taskId);
      ApiResponse.send(res, 200, "Task details", task);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * Update a task.
   *
   * @param req
   * @param res
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const orgId = req.params.orgId as string;
      const projectId = req.params.projectId as string;
      const taskId = req.params.taskId as string;
      const payload = req.body as UpdateTaskRequest;

      const task = await this.tasks.update(actor, orgId, projectId, taskId, payload);
      ApiResponse.send(res, 200, "Task updated", task);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * Delete a task.
   *
   * @param req
   * @param res
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const orgId = req.params.orgId as string;
      const projectId = req.params.projectId as string;
      const taskId = req.params.taskId as string;

      await this.tasks.delete(actor, orgId, projectId, taskId);
      ApiResponse.send(res, 200, "Task deleted");
    } catch (err) {
      HttpError.handle(req, err);
    }
  }
}
