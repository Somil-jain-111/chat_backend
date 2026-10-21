import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddGroupChats1729600000000 implements MigrationInterface {
  name = "AddGroupChats1729600000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chats" ADD "type" varchar(16) NOT NULL DEFAULT 'direct'`);
    await queryRunner.query(`ALTER TABLE "chats" ADD "title" varchar(120)`);
    await queryRunner.query(`ALTER TABLE "chats" ADD "owner_id" uuid`);
    await queryRunner.query(`ALTER TABLE "chats" ALTER COLUMN "user_a_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "chats" ALTER COLUMN "user_b_id" DROP NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "chats"
      ADD CONSTRAINT "FK_chats_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT,
      ADD CONSTRAINT "CHK_chats_type" CHECK (
        ("type" = 'direct' AND "user_a_id" IS NOT NULL AND "user_b_id" IS NOT NULL AND "owner_id" IS NULL)
        OR
        ("type" = 'group' AND "user_a_id" IS NULL AND "user_b_id" IS NULL AND "owner_id" IS NOT NULL AND length(trim("title")) > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "chat_members" (
        "chat_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" varchar(16) NOT NULL DEFAULT 'member',
        "joined_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_members" PRIMARY KEY ("chat_id", "user_id"),
        CONSTRAINT "CHK_chat_members_role" CHECK ("role" IN ('owner', 'member')),
        CONSTRAINT "FK_chat_members_chat" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_chat_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_chat_members_user" ON "chat_members" ("user_id")`);
    await queryRunner.query(`
      INSERT INTO "chat_members" ("chat_id", "user_id")
      SELECT "id", "user_a_id" FROM "chats"
      UNION ALL
      SELECT "id", "user_b_id" FROM "chats"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "chat_members"`);
    await queryRunner.query(`DELETE FROM "chats" WHERE "type" = 'group'`);
    await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT "CHK_chats_type"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT "FK_chats_owner"`);
    await queryRunner.query(`ALTER TABLE "chats" ALTER COLUMN "user_a_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "chats" ALTER COLUMN "user_b_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "owner_id"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "title"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN "type"`);
  }
}
