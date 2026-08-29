import type { Logger as TypeOrmLoggerInterface, LogLevel, QueryRunner } from "typeorm";
import { errorMeta, Logger } from "./logger.js";

/** TypeORM logger that routes through the application's winston Logger. */
export class TypeOrmLogger implements TypeOrmLoggerInterface {
  logQuery(query: string, _parameters?: unknown[], _queryRunner?: QueryRunner): void {
    Logger.debug("SQL", { query });
  }

  logQueryError(
    error: string | Error,
    query: string,
    _parameters?: unknown[],
    _queryRunner?: QueryRunner,
  ): void {
    Logger.error("SQL error", { query, ...errorMeta(error) });
  }

  logQuerySlow(time: number, query: string, _parameters?: unknown[], _queryRunner?: QueryRunner): void {
    Logger.warn("Slow query", { time, query });
  }

  logSchemaBuild(message: string, _queryRunner?: QueryRunner): void {
    Logger.debug("Schema build", { message });
  }

  logMigration(message: string, _queryRunner?: QueryRunner): void {
    Logger.info("Migration", { message });
  }

  log(level: LogLevel, message: unknown, _queryRunner?: QueryRunner): void {
    const text = typeof message === "string" ? message : JSON.stringify(message);
    switch (level) {
      case "error":
        Logger.error(text);
        break;
      case "warn":
        Logger.warn(text);
        break;
      case "info":
        Logger.info(text);
        break;
      default:
        Logger.debug(text);
    }
  }
}
