import { Service } from "typedi";
import {
  AppDataSource,
  Membership,
  User,
  type MembershipRole,
} from "@/database/index.js";
import type { Member } from "@/types/index.js";
import { HttpError } from "@/errors/index.js";

/** Memberships: membership checks, invites, and role changes. */
@Service()
export class MembershipService {
  private readonly memberships = AppDataSource.getRepository(Membership);
  private readonly users = AppDataSource.getRepository(User);

  /** The actor's membership (with org loaded), or 404 (org hidden from non-members). */
  async requireMember(userId: string, orgId: string): Promise<Membership> {
    const membership = await this.memberships.findOne({
      where: { user: { id: userId }, organization: { id: orgId } },
      relations: { organization: true },
    });

    if (!membership) {
      throw new HttpError.NotFound("Organization not found");
    }
    return membership;
  }

  /** The actor's membership, or 403 when their role isn't allowed. */
  async requireRole(
    userId: string,
    orgId: string,
    roles: MembershipRole[],
  ): Promise<Membership> {
    const membership = await this.requireMember(userId, orgId);
    if (!roles.includes(membership.role)) {
      throw new HttpError.Forbidden("Insufficient permissions");
    }

    return membership;
  }

  /** List members of an organization. */
  async list(
    actorId: string,
    orgId: string,
    page: number,
    limit: number,
  ): Promise<{ data: Member[]; total: number }> {
    await this.requireMember(actorId, orgId);

    const [memberships, total] = await this.memberships.findAndCount({
      where: { organization: { id: orgId } },
      relations: { user: true },
      order: { createdAt: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = memberships.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
    }));
    return { data, total };
  }

  /** Invite a user by email as a member; owner or admin only. */
  async invite(actorId: string, orgId: string, email: string): Promise<Member> {
    await this.requireRole(actorId, orgId, ["owner", "admin"]);

    const user = await this.users.findOneBy({ email });
    if (!user) {
      throw new HttpError.NotFound("User not found");
    }

    const existing = await this.memberships.findOneBy({
      user: { id: user.id },
      organization: { id: orgId },
    });
    if (existing) {
      throw new HttpError.Conflict("User is already a member");
    }

    const membership = this.memberships.create({
      user,
      organization: { id: orgId },
      role: "member",
    });
    await this.memberships.save(membership);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: "member",
      joinedAt: membership.createdAt.toISOString(),
    };
  }

  /** Change a member's role; owner only, and the owner's role is protected. */
  async changeRole(
    actorId: string,
    orgId: string,
    userId: string,
    role: Exclude<MembershipRole, "owner">,
  ): Promise<Member> {
    await this.requireRole(actorId, orgId, ["owner"]);

    const membership = await this.memberships.findOne({
      where: { user: { id: userId }, organization: { id: orgId } },
      relations: { user: true },
    });

    if (!membership) {
      throw new HttpError.NotFound("Member not found");
    }
    if (membership.role === "owner") {
      throw new HttpError.BadRequest("Cannot change the owner's role");
    }

    membership.role = role;
    await this.memberships.save(membership);

    return {
      id: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      role: membership.role,
      joinedAt: membership.createdAt.toISOString(),
    };
  }

  /** Remove a member; owner or admin only, and the owner cannot be removed. */
  async revoke(actorId: string, orgId: string, userId: string): Promise<void> {
    await this.requireRole(actorId, orgId, ["owner", "admin"]);

    const membership = await this.memberships.findOneBy({
      user: { id: userId },
      organization: { id: orgId },
    });
    if (!membership) {
      throw new HttpError.NotFound("Member not found");
    }
    if (membership.role === "owner") {
      throw new HttpError.BadRequest("Cannot remove the owner");
    }

    await this.memberships.remove(membership);
  }
}
