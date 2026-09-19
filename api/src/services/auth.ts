import { Service } from "typedi";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppDataSource, User } from "@/database/index.js";
import { config } from "@/config/index.js";
import { HttpError } from "@/errors/index.js";
import { Logger } from "@/loggers/index.js";
import { Container } from "typedi";
import { SessionService } from "./session.js";
import type { AuthResult, LoginRequest, RegisterRequest } from "@/types/index.js";

const BCRYPT_ROUNDS = 10;

/** Equalizes login timing: unknown emails run bcrypt against this instead of skipping it. */
const DUMMY_HASH = bcrypt.hashSync("dummy-password", BCRYPT_ROUNDS);

/** Authentication: register and log in users, issue JWTs. */
@Service()
export class AuthService {
  private readonly users = AppDataSource.getRepository(User);
  private readonly sessions: SessionService;

  constructor() {
    this.sessions = Container.get(SessionService);
  }

  /** Register a new user and return a token. */
  async register(payload: RegisterRequest): Promise<AuthResult> {
    const existing = await this.users.findOneBy({ email: payload.email });
    if (existing) {
      throw new HttpError.Conflict("Email already registered");
    }

    const password = await bcrypt.hash(payload.password, BCRYPT_ROUNDS);

    const user = this.users.create({ email: payload.email, password, name: payload.name });
    await this.users.save(user);
    Logger.info("User registered", { userId: user.id });

    return this.session(user);
  }

  /** Verify credentials and return a token. */
  async login(payload: LoginRequest): Promise<AuthResult> {
    const user = await this.users.findOneBy({ email: payload.email });

    const validCredentials = await bcrypt.compare(payload.password, user?.password ?? DUMMY_HASH);
    if (!user || !validCredentials) {
      throw new HttpError.Unauthorized("Invalid credentials");
    }

    Logger.info("User logged in", { userId: user.id });

    return this.session(user);
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
