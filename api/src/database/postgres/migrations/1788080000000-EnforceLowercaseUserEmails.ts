import type { MigrationInterface, QueryRunner } from "typeorm";

export class EnforceLowercaseUserEmails1788080000000 implements MigrationInterface {
  name = "EnforceLowercaseUserEmails1788080000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD CONSTRAINT "users_email_lowercase"
        CHECK ("email" = lower("email"))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "users_email_lowercase"`);
  }
}
