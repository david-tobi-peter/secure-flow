import type { Request, Response } from "express";
import { Container, Service } from "typedi";
import { actorId, ApiResponse } from "@/helpers/index.js";
import { Controller } from "@/decorators/index.js";
import { HttpError } from "@/errors/index.js";
import { MembershipService } from "@/services/index.js";
import type { ChangeMemberRoleRequest, InviteMemberRequest } from "@/types/index.js";

/** HTTP layer for membership endpoints. */
@Service()
@Controller
export class MembershipController {
  private readonly members: MembershipService;

  constructor() {
    this.members = Container.get(MembershipService);
  }

  /**
   * List members of an organization.
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

      const result = await this.members.list(actor, orgId, page, limit);
      ApiResponse.sendPaginated(res, 200, "Members list", result.data, page, limit, result.total);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * Invite a member.
   *
   * @param req
   * @param res
   */
  async invite(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const orgId = req.params.orgId as string;
      const payload = req.body as InviteMemberRequest;

      const member = await this.members.invite(actor, orgId, payload.email);
      ApiResponse.send(res, 201, "Member invited", member);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * Change a member's role.
   *
   * @param req
   * @param res
   */
  async changeRole(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const orgId = req.params.orgId as string;
      const userId = req.params.userId as string;
      const payload = req.body as ChangeMemberRoleRequest;

      const member = await this.members.changeRole(actor, orgId, userId, payload.role);
      ApiResponse.send(res, 200, "Role changed", member);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * Remove a member.
   *
   * @param req
   * @param res
   */
  async revoke(req: Request, res: Response): Promise<void> {
    try {
      const actor = actorId(res);
      const orgId = req.params.orgId as string;
      const userId = req.params.userId as string;

      await this.members.revoke(actor, orgId, userId);
      ApiResponse.send(res, 200, "Member removed");
    } catch (err) {
      HttpError.handle(req, err);
    }
  }
}
