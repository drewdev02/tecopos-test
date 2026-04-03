import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1712100000000 implements MigrationInterface {
  public name = 'CreateUsersTable1712100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL,
        "password" varchar(255) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_USERS_EMAIL_UNIQUE" ON "users" ("email")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_USERS_EMAIL_UNIQUE"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
  }
}
