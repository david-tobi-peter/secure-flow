import { Router } from "express";
import { Container } from "typedi";
import { MembershipController, OrganizationController } from "@/controllers/index.js";
import { requireAuth } from "@/middleware/index.js";

const organizationController = Container.get(OrganizationController);
const membershipController = Container.get(MembershipController);

export const organizationRouter = Router();

organizationRouter.use(requireAuth);

organizationRouter.post("/", organizationController.create);
organizationRouter.get("/", organizationController.list);
organizationRouter.get("/:orgId", organizationController.get);
organizationRouter.get("/:orgId/members", membershipController.list);
organizationRouter.post("/:orgId/members", membershipController.invite);
organizationRouter.patch("/:orgId/members/:userId", membershipController.changeRole);
organizationRouter.delete("/:orgId/members/:userId", membershipController.revoke);
