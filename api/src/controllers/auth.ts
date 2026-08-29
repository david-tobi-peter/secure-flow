import type { Request, Response } from "express";
import { Inject, Service } from "typedi";
import { ApiResponse } from "@/utils/index.js";
import { Controller } from "@/decorators/index.js";
import { HttpError } from "@/errors/index.js";
import { AuthService, SessionService } from "@/services/index.js";
import type { LoginRequest, RegisterRequest } from "@/types/index.js";

/** HTTP layer for the auth endpoints. */
@Service()
@Controller
export class AuthController {
  constructor(
    @Inject(() => AuthService) private readonly authService: AuthService,
    @Inject(() => SessionService) private readonly sessions: SessionService,
  ) {}

  /**
   * Register a new user.
   *
   * @param req
   * @param res
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authService.register(req.body as RegisterRequest);
      ApiResponse.send(res, 201, "User registered", result);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * Log in.
   *
   * @param req
   * @param res
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authService.login(req.body as LoginRequest);
      ApiResponse.send(res, 200, "Logged in", result);
    } catch (err) {
      HttpError.handle(req, err);
    }
  }

  /**
   * Log out; revokes the current session.
   *
   * @param req
   * @param res
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      await this.sessions.revoke(res.locals.jti as string);
      ApiResponse.send(res, 200, "Logged out");
    } catch (err) {
      HttpError.handle(req, err);
    }
  }
}
