import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "@/config/index.js";
import { entities } from "./entities/index.js";
import { migrations } from "./migrations/index.js";
import { TypeOrmLogger } from "@/loggers/index.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: config.databaseUrl,
  entities,
  migrations,
  synchronize: false,
  logging: config.isProduction ? ["error", "warn"] : ["query", "error", "warn", "migration"],
  logger: new TypeOrmLogger(),
});
