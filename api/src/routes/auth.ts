import { Router } from "express";
import { Container } from "typedi";
import { AuthController } from "@/controllers/index.js";
import { authGate, requireAuth } from "@/middleware/index.js";

const authController = Container.get(AuthController);

export const authRouter = Router();

authRouter.post("/pow", authController.pow);
authRouter.post("/register", authController.register);
authRouter.post("/setup-2fa", authGate, authController.setupTwoFactor);
authRouter.post("/login", authGate, authController.login);
authRouter.post("/verify-totp", authController.verifyTotp);
authRouter.post("/logout", requireAuth, authController.logout);
