import winston from "winston";
import { config } from "@/config/index.js";

const { combine, timestamp, errors, json, printf } = winston.format;

const devFormat = printf((info) => {
  const { level, message, timestamp, stack, ...meta } = info;
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  const stackStr = typeof stack === "string" ? `\n${stack}` : "";
  return `${timestamp} [${level}] ${message}${metaStr}${stackStr}`;
});

const instance = winston.createLogger({
  level: config.logLevel,
  format: combine(
    timestamp(),
    errors({ stack: true }),
    config.isProduction ? json() : devFormat,
  ),
  transports: config.isProduction ? [] : [new winston.transports.Console()],
});

/**
 * Normalize an unknown value into error meta.
 *
 * @param err
 * @returns The error's message and stack for logging.
 */
export function errorMeta(err: unknown): { message: string; stack?: string } {
  return err instanceof Error
    ? { message: err.message, stack: err.stack }
    : { message: String(err) };
}

function toMeta(meta: unknown): object | undefined {
  if (meta === undefined) {
    return undefined;
  }
  return meta instanceof Error ? errorMeta(meta) : (meta as object);
}

/** Application logger; errors passed as meta are normalized automatically. */
export const Logger = {
  error(message: string, meta?: unknown): void {
    instance.error(message, toMeta(meta));
  },
  warn(message: string, meta?: unknown): void {
    instance.warn(message, toMeta(meta));
  },
  info(message: string, meta?: unknown): void {
    instance.info(message, toMeta(meta));
  },
  debug(message: string, meta?: unknown): void {
    instance.debug(message, toMeta(meta));
  },
};
