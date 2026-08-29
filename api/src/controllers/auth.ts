import type { Request, Response } from "express";
import { Container, Service } from "typedi";
import { ApiResponse } from "@/helpers/index.js";
import { Controller } from "@/decorators/index.js";
import { HttpError } from "@/errors/index.js";
import { AuthService, SessionService } from "@/services/index.js";
import type { LoginRequest, RegisterRequest } from "@/types/index.js";

/** HTTP layer for the auth endpoints. */
@Service()
@Controller
export class AuthController {
  private readonly authService: AuthService;
  private readonly sessions: SessionService;

  constructor() {
    this.authService = Container.get(AuthService);
    this.sessions = Container.get(SessionService);
  }

  /**
   * Register a new user.
   *
   * @param req
   * @param res
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as RegisterRequest;
      const result = await this.authService.register(payload);

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
      const payload = req.body as LoginRequest;
      const result = await this.authService.login(payload);

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
      const jti = res.locals.jti as string;
      await this.sessions.revoke(jti);

      ApiResponse.send(res, 200, "Logged out");
    } catch (err) {
      HttpError.handle(req, err);
    }
  }
}
