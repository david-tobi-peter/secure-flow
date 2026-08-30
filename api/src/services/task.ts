import { Container, Service } from "typedi";
import { AppDataSource, Task } from "@/database/index.js";
import type { CreateTaskRequest, Task as TaskResponse, UpdateTaskRequest } from "@/types/index.js";
import { HttpError } from "@/errors/index.js";
import { MembershipService } from "./membership.js";
import { ProjectService } from "./project.js";

/** Tasks: tenant-scoped create, list, get, update, and delete. */
@Service()
export class TaskService {
  private readonly tasks = AppDataSource.getRepository(Task);
  private readonly projects: ProjectService;
  private readonly members: MembershipService;

  constructor() {
    this.projects = Container.get(ProjectService);
    this.members = Container.get(MembershipService);
  }

  /** Create a task in a project the actor has access to. */
  async create(
    actorId: string,
    orgId: string,
    projectId: string,
    title: string,
    status: CreateTaskRequest["status"],
  ): Promise<TaskResponse> {
    await this.projects.requireAccess(actorId, orgId, projectId);

    const task = this.tasks.create({
      project: { id: projectId },
      title,
      status: status ?? "todo",
    });

    await this.tasks.save(task);
    return this.toTaskResponse(task);
  }

  /** List tasks in a project. */
  async list(
    actorId: string,
    orgId: string,
    projectId: string,
    page: number,
    limit: number,
  ): Promise<{ data: TaskResponse[]; total: number }> {
    await this.projects.requireAccess(actorId, orgId, projectId);

    const [tasks, total] = await this.tasks.findAndCount({
      where: { project: { id: projectId } },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: tasks.map((t) => this.toTaskResponse(t)), total };
  }

  /**
   * Verify the actor is a member and the task exists in the project and org.
   */
  async requireAccess(
    actorId: string,
    orgId: string,
    projectId: string,
    taskId: string,
  ): Promise<void> {
    await this.members.requireMember(actorId, orgId);
    const exists = await this.tasks.exists({
      where: { id: taskId, project: { id: projectId, organization: { id: orgId } } },
    });
    if (!exists) {
      throw new HttpError.NotFound("Task not found");
    }
  }

  /** Get a task; non-members and foreign tasks see 404. */
  async get(actorId: string, orgId: string, projectId: string, taskId: string): Promise<TaskResponse> {
    await this.members.requireMember(actorId, orgId);

    const task = await this.tasks.findOne({
      where: { id: taskId, project: { id: projectId, organization: { id: orgId } } },
    });
    if (!task) {
      throw new HttpError.NotFound("Task not found");
    }

    return this.toTaskResponse(task);
  }

  /** Update a task's title and/or status. */
  async update(
    actorId: string,
    orgId: string,
    projectId: string,
    taskId: string,
    payload: UpdateTaskRequest,
  ): Promise<TaskResponse> {
    await this.members.requireMember(actorId, orgId);

    const task = await this.tasks.findOne({
      where: { id: taskId, project: { id: projectId, organization: { id: orgId } } },
    });
    if (!task) {
      throw new HttpError.NotFound("Task not found");
    }

    if (payload.title === undefined && payload.status === undefined) {
      throw new HttpError.BadRequest("Nothing to update");
    }
    if (payload.title !== undefined) {
      task.title = payload.title;
    }
    if (payload.status !== undefined) {
      task.status = payload.status;
    }

    await this.tasks.save(task);
    return this.toTaskResponse(task);
  }

  /** Delete a task; non-members and foreign tasks see 404. */
  async delete(actorId: string, orgId: string, projectId: string, taskId: string): Promise<void> {
    await this.members.requireMember(actorId, orgId);

    const task = await this.tasks.findOne({
      where: { id: taskId, project: { id: projectId, organization: { id: orgId } } },
    });
    if (!task) {
      throw new HttpError.NotFound("Task not found");
    }

    await this.tasks.remove(task);
  }

  private toTaskResponse(task: Task): TaskResponse {
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
    };
  }
}
