import { Container, Service } from "typedi";
import {
  AppDataSource,
  Membership,
  Organization as OrganizationEntity,
} from "@/database/index.js";
import type { Organization as OrganizationResponse } from "@/types/index.js";
import { MembershipService } from "./membership.js";

/** Organizations: create, list, and view, scoped to the caller's membership. */
@Service()
export class OrganizationService {
  private readonly orgs = AppDataSource.getRepository(OrganizationEntity);
  private readonly memberships = AppDataSource.getRepository(Membership);
  private readonly members: MembershipService;

  constructor() {
    this.members = Container.get(MembershipService);
  }

  /** Create an organization with the actor as owner. */
  async create(actorId: string, name: string): Promise<OrganizationResponse> {
    const createdOrg = await AppDataSource.transaction(async (em) => {
      const org = em.create(OrganizationEntity, { name });
      await em.save(org);

      const membership = em.create(Membership, {
        user: { id: actorId },
        organization: org,
        role: "owner",
      });
      await em.save(membership);

      return org;
    });

    return this.toOrganizationResponse(createdOrg);
  }

  /** List the actor's organizations. */
  async listForUser(
    actorId: string,
    page: number,
    limit: number,
  ): Promise<{ data: OrganizationResponse[]; total: number }> {
    const [memberships, total] = await this.memberships.findAndCount({
      where: { user: { id: actorId } },
      relations: { organization: true },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = memberships.map((m) => this.toOrganizationResponse(m.organization));
    return { data, total };
  }

  /** Get an organization; non-members see 404. */
  async getForUser(actorId: string, orgId: string): Promise<OrganizationResponse> {
    const membership = await this.members.requireMember(actorId, orgId);

    return this.toOrganizationResponse(membership.organization);
  }

  private toOrganizationResponse(org: OrganizationEntity): OrganizationResponse {
    return {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt.toISOString(),
    };
  }
}
