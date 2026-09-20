import { createHmac } from "node:crypto";
import { generateURI, ScureBase32Plugin, verify } from "otplib";
import { Service } from "typedi";
import { config } from "@/config/index.js";

const PERIOD_SECONDS = 30;
const DIGITS = 6 as const;

/** One step either side, authenticator client with a slightly out-of-sync clock still gets in. */
const TOLERANCE_SECONDS = 30;

/**
 * Service for generating and verifying TOTP codes.
 */
@Service()
export class TotpService {
  private readonly base32 = new ScureBase32Plugin();

  /**
   * Derive a TOTP secret for an email address.
   * @param email
   */
  secretFor(email: string): string {
    const bytes = createHmac("sha256", config.totpSecret).update(email).digest();
    return this.base32.encode(new Uint8Array(bytes));
  }

  /**
   * The otpauth URI an authenticator app scans.
   *
   * @param email
   */
  otpauthUrl(email: string): string {
    return generateURI({
      issuer: config.totpIssuer,
      label: email,
      secret: this.secretFor(email),
      digits: DIGITS,
      period: PERIOD_SECONDS,
    });
  }

  /**
   * Verify a TOTP code for an email address.
   *
   * @param email
   * @param token
   */
  async verify(email: string, token: string): Promise<boolean> {
    const result = await verify({
      secret: this.secretFor(email),
      token,
      digits: DIGITS,
      period: PERIOD_SECONDS,
      epochTolerance: TOLERANCE_SECONDS,
    });

    return result.valid;
  }
}
