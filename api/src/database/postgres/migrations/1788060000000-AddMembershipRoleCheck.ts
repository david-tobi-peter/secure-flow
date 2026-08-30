import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMembershipRoleCheck1788060000000 implements MigrationInterface {
  name = "AddMembershipRoleCheck1788060000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "memberships"
        ADD CONSTRAINT "memberships_role_check"
        CHECK ("role" IN ('owner', 'admin', 'member'))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "memberships" DROP CONSTRAINT "memberships_role_check"`);
  }
}
