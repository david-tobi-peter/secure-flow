import winston from "winston";
import { config } from "@/config/index.js";

const { combine, timestamp, errors, json, printf } = winston.format;

const devFormat = printf((info) => {
  const { level, message, timestamp, stack, ...meta } = info;
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  const stackStr = typeof stack === "string" ? `\n${stack}` : "";
  return `${timestamp} [${level}] ${message}${metaStr}${stackStr}`;
});

export const Logger = winston.createLogger({
  level: config.logLevel,
  format: combine(
    timestamp(),
    errors({ stack: true }),
    config.isProduction ? json() : devFormat,
  ),
  transports: config.isProduction ? [] : [new winston.transports.Console()],
});
