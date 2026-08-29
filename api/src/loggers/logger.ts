import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { config } from "@/config/index.js";

const { combine, timestamp, errors, json, printf } = winston.format;

const devFormat = printf((info) => {
  const { level, message, timestamp, stack, ...meta } = info;
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  const stackStr = typeof stack === "string" ? `\n${stack}` : "";
  return `${timestamp} [${level}] ${message}${metaStr}${stackStr}`;
});

const base = combine(timestamp(), errors({ stack: true }));

const fileTransport = new DailyRotateFile({
  dirname: "logs",
  filename: "api-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "10m",
  maxFiles: "14d",
  zippedArchive: true,
  format: combine(base, json()),
});

const transports: winston.transport[] = [fileTransport];
if (!config.isProduction) {
  transports.push(
    new winston.transports.Console({
      format: combine(base, devFormat),
    }),
  );
}

const instance = winston.createLogger({
  level: config.logLevel,
  transports,
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
