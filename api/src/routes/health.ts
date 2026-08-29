import { Router } from "express";
import { Container } from "typedi";
import { HealthController } from "@/controllers/index.js";

const healthController = Container.get(HealthController);

export const healthRouter = Router();

healthRouter.get("/", healthController.getHealth);
