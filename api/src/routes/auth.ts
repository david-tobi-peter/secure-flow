import { Router } from "express";
import { Container } from "typedi";
import { AuthController } from "@/controllers/index.js";
import { requireAuth } from "@/middleware/index.js";

const authController = Container.get(AuthController);

export const authRouter = Router();

authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.post("/logout", requireAuth, authController.logout);
