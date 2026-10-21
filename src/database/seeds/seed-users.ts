import { AppDataSource } from "../../default/databases/mysql/migration.config";
import { UserEntity } from "../../modules/user/user.entity";

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  const users = AppDataSource.getRepository(UserEntity);
  await users.upsert(
    [
      { name: "Alice Example", email: "alice@example.com" },
      { name: "Bob Example", email: "bob@example.com" },
      { name: "Charlie Example", email: "charlie@example.com" },
    ],
    ["email"],
  );
  const created = await users.find({
    where: [
      { email: "alice@example.com" },
      { email: "bob@example.com" },
      { email: "charlie@example.com" },
    ],
  });
  console.log(created.map(({ id, name, email }) => ({ id, name, email })));
  await AppDataSource.destroy();
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Seed failed");
  process.exit(1);
});
