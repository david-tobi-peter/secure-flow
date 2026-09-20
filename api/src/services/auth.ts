import { Service } from "typedi";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppDataSource, User } from "@/database/index.js";
import { config } from "@/config/index.js";
import { HttpError } from "@/errors/index.js";
import { Normalizer } from "@/helpers/index.js";
import { Logger } from "@/loggers/index.js";
import { Container } from "typedi";
import { AuthTokenService, RateLimitService, TotpService } from "@/security/index.js";
import { SessionService } from "./session.js";
import type {
  AuthResult,
  LoginRequest,
  PendingLogin,
  RegisterRequest,
  RegisterResult,
  SetupTwoFactorRequest,
  SetupTwoFactorResult,
} from "@/types/index.js";

const BCRYPT_ROUNDS = 10;

/** Equalizes login timing: unknown emails run bcrypt against this instead of skipping it. */
const DUMMY_HASH = bcrypt.hashSync("dummy-password", BCRYPT_ROUNDS);

/** Service for handling authentication, including registration, two-factor setup, and the two-step login. */
@Service()
export class AuthService {
  private readonly users = AppDataSource.getRepository(User);
  private readonly sessions: SessionService;
  private readonly totp: TotpService;
  private readonly rateLimit: RateLimitService;
  private readonly authToken: AuthTokenService;

  constructor() {
    this.sessions = Container.get(SessionService);
    this.totp = Container.get(TotpService);
    this.rateLimit = Container.get(RateLimitService);
    this.authToken = Container.get(AuthTokenService);
  }

  /**
   * Register a new user account.
   *
   * @param payload
   */
  async register(payload: RegisterRequest): Promise<RegisterResult> {
    const email = Normalizer.email(payload.email);

    const existing = await this.users.findOneBy({ email });
    if (existing) {
      throw new HttpError.Conflict("Email already registered");
    }

    const password = await bcrypt.hash(payload.password, BCRYPT_ROUNDS);

    const user = this.users.create({ email, password, name: payload.name });
    await this.users.save(user);
    Logger.info("User registered", { userId: user.id });

    const verificationToken = await this.authToken.create("verify", email);

    return { verificationToken };
  }

  /**
   * Set up two-factor authentication for the user.
   *
   * @param payload
   */
  async setupTwoFactor(payload: SetupTwoFactorRequest): Promise<SetupTwoFactorResult> {
    const email =
      "verificationToken" in payload
        ? await this.readVerificationToken(payload.verificationToken)
        : await this.checkCredentials(payload.email, payload.password);

    return { secret: this.totp.secretFor(email), otpauthUrl: this.totp.otpauthUrl(email) };
  }

  /**
   * Start the login process by issuing a pending token.
   *
   * @param payload
   */
  async startLogin(payload: LoginRequest): Promise<PendingLogin> {
    const email = await this.checkCredentials(payload.email, payload.password);

    const pendingToken = await this.authToken.create("pending", email);
    return { pendingToken };
  }

  /**
   * Complete the login process by verifying the pending token and code, and issuing a session.
   *
   * @param pendingToken
   * @param code
   */
  async finishLogin(pendingToken: string, code: string): Promise<AuthResult> {
    const email = await this.authToken.read("pending", pendingToken);
    if (email === null) {
      throw new HttpError.Unauthorized("Invalid or expired pending token");
    }

    if (await this.rateLimit.isTotpLimited(email)) {
      throw new HttpError.TooManyRequests("Too many attempts");
    }

    const user = await this.users.findOneBy({ email });
    if (!user) {
      throw new HttpError.Unauthorized("Invalid credentials");
    }

    if (!(await this.totp.verify(email, code))) {
      await this.rateLimit.recordTotpFailure(email);
      throw new HttpError.Unauthorized("Invalid code");
    }

    await this.rateLimit.clearTotpFailures(email);
    await this.authToken.revoke("pending", pendingToken);
    Logger.info("User logged in", { userId: user.id });

    return this.session(user);
  }

  /** The account behind a registration token; 401 when the token is unknown or expired. */
  private async readVerificationToken(token: string): Promise<string> {
    const email = await this.authToken.read("verify", token);
    if (email === null) {
      throw new HttpError.Unauthorized("Invalid or expired verification token");
    }

    return email;
  }

  /** Checks email/password credentials */
  private async checkCredentials(email: string, password: string): Promise<string> {
    const normalizedEmail = Normalizer.email(email);
    const user = await this.users.findOneBy({ email: normalizedEmail });

    const validCredentials = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
    if (!user || !validCredentials) {
      throw new HttpError.Unauthorized("Invalid credentials");
    }

    return normalizedEmail;
  }

  private async session(user: User): Promise<AuthResult> {
    const jti = await this.sessions.create(user.id);
    const token = jwt.sign({ sub: user.id, jti }, config.jwtSecret, {
      expiresIn: SessionService.TTL_SECONDS,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
