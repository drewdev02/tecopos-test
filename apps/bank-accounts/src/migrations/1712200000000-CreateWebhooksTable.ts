import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhooksTable1712200000000 implements MigrationInterface {
  public name = 'CreateWebhooksTable1712200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "webhooks_event_enum" AS ENUM ('transaction.created', 'balance.updated');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhooks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" varchar(255) NOT NULL,
        "url" varchar(1024) NOT NULL,
        "event" "webhooks_event_enum" NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_WEBHOOKS_USER_ID" ON "webhooks" ("userId")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_WEBHOOKS_USER_ID"');
    await queryRunner.query('DROP TABLE IF EXISTS "webhooks"');
    await queryRunner.query('DROP TYPE IF EXISTS "webhooks_event_enum"');
  }
}
