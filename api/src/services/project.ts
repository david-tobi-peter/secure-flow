import { Container, Service } from "typedi";
import { AppDataSource, Project } from "@/database/index.js";
import type { Project as ProjectResponse } from "@/types/index.js";
import { HttpError } from "@/errors/index.js";
import { MembershipService } from "./membership.js";

/** Projects: tenant-scoped create, list, get, and delete. */
@Service()
export class ProjectService {
  private readonly projects = AppDataSource.getRepository(Project);
  private readonly members: MembershipService;

  constructor() {
    this.members = Container.get(MembershipService);
  }

  /** Create a project in an organization the actor belongs to. */
  async create(actorId: string, orgId: string, name: string): Promise<ProjectResponse> {
    await this.members.requireRole(actorId, orgId, ["owner", "admin"]);

    const project = this.projects.create({ organization: { id: orgId }, name });
    await this.projects.save(project);
    return this.toProjectResponse(project);
  }

  /** List projects in an organization. */
  async list(
    actorId: string,
    orgId: string,
    page: number,
    limit: number,
  ): Promise<{ data: ProjectResponse[]; total: number }> {
    await this.members.requireMember(actorId, orgId);

    const [projects, total] = await this.projects.findAndCount({
      where: { organization: { id: orgId } },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: projects.map((p) => this.toProjectResponse(p)), total };
  }

  /**
   * Verify the actor is a member and the project exists in the org.
   * Pure permission check; returns nothing.
   */
  async requireAccess(actorId: string, orgId: string, projectId: string): Promise<void> {
    await this.members.requireMember(actorId, orgId);
    const exists = await this.projects.exists({
      where: { id: projectId, organization: { id: orgId } },
    });

    if (!exists) {
      throw new HttpError.NotFound("Project not found");
    }
  }

  /** Get a project; non-members and foreign projects see 404. */
  async get(actorId: string, orgId: string, projectId: string): Promise<ProjectResponse> {
    await this.members.requireMember(actorId, orgId);

    const project = await this.projects.findOne({
      where: { id: projectId, organization: { id: orgId } },
    });
    if (!project) {
      throw new HttpError.NotFound("Project not found");
    }

    return this.toProjectResponse(project);
  }

  /** Delete a project; non-members and foreign projects see 404. */
  async delete(actorId: string, orgId: string, projectId: string): Promise<void> {
    await this.members.requireMember(actorId, orgId);

    const project = await this.projects.findOne({
      where: { id: projectId, organization: { id: orgId } },
    });
    if (!project) {
      throw new HttpError.NotFound("Project not found");
    }

    await this.projects.remove(project);
  }

  private toProjectResponse(project: Project): ProjectResponse {
    return {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt.toISOString(),
    };
  }
}
