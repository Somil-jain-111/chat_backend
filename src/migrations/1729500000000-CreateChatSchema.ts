import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChatSchema1729500000000 implements MigrationInterface {
  name = "CreateChatSchema1729500000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "email" varchar(320) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "chats" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_a_id" uuid NOT NULL,
        "user_b_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_chats_canonical_participants" CHECK ("user_a_id" < "user_b_id"),
        CONSTRAINT "UQ_chats_participants" UNIQUE ("user_a_id", "user_b_id"),
        CONSTRAINT "FK_chats_user_a" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_chats_user_b" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_chats_user_a" ON "chats" ("user_a_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_chats_user_b" ON "chats" ("user_b_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "chats"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
