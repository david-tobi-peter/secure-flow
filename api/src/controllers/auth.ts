import type { Request, Response } from "express";
import { Container, Service } from "typedi";
import { ApiResponse } from "@/helpers/index.js";
import { Controller } from "@/decorators/index.js";
import { HttpError } from "@/errors/index.js";
import { PowService, RateLimitService } from "@/security/index.js";
import { AuthService, SessionService } from "@/services/index.js";
import type {
  LoginRequest,
  RegisterRequest,
  SetupTwoFactorRequest,
  VerifyTotpRequest,
} from "@/types/index.js";

/** HTTP layer for the auth endpoints. */
@Service()
@Controller
export class AuthController {
  private readonly authService: AuthService;
  private readonly sessions: SessionService;
  private readonly rateLimit: RateLimitService;
  private readonly powService: PowService;

  constructor() {
    this.authService = Container.get(AuthService);
    this.sessions = Container.get(SessionService);
    this.rateLimit = Container.get(RateLimitService);
    this.powService = Container.get(PowService);
  }

  /**
   * Issue a proof-of-work challenge to a flagged address.
   *
   * @param req
   * @param res
   */
  async pow(req: Request, res: Response): Promise<void> {
    try {
      const ip = req.ip ?? "unknown";
      if (!(await this.rateLimit.allowChallenge(ip))) {
        throw new HttpError.TooManyRequests("Too many challenge requests");
      }

      ApiResponse.send(res, 200, "Proof-of-work challenge", this.powService.issue(ip));
    } catch (err) {
      HttpError.handle(req, err);
    }
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
   * Setup two-factor authentication for a user.
   *
   * @param req
   * @param res
   */
  async setupTwoFactor(req: Request, res: Response): Promise<void> {
    const payload = req.body as SetupTwoFactorRequest;
    const ip = req.ip ?? "unknown";
    const checkedPassword = !("verificationToken" in payload);

    try {
      const result = await this.authService.setupTwoFactor(payload);

      ApiResponse.send(res, 200, "Two-factor secret issued", result);
    } catch (err) {
      if (checkedPassword && err instanceof HttpError && err.statusCode === 401) {
        await this.rateLimit.recordPasswordFailure(ip);
      }
      HttpError.handle(req, err);
    }
  }

  /**
   * Authenticate a user and issue a pending token.
   *
   * @param req
   * @param res
   */
  async login(req: Request, res: Response): Promise<void> {
    const payload = req.body as LoginRequest;
    const ip = req.ip ?? "unknown";

    try {
      const result = await this.authService.startLogin(payload);

      ApiResponse.send(res, 200, "Credentials accepted", result);
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 401) {
        await this.rateLimit.recordPasswordFailure(ip);
      }
      HttpError.handle(req, err);
    }
  }

  /**
   * Verify a TOTP code and log in the user.
   *
   * @param req
   * @param res
   */
  async verifyTotp(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as VerifyTotpRequest;
      const result = await this.authService.finishLogin(payload.pendingToken, payload.code);

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
