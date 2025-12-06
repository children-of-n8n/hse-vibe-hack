import { db } from "./client";

const AUTO_MIGRATE = process.env.AUTO_MIGRATE ?? "true";
const backendRoot = process.cwd();
const migrationsFolder = `${backendRoot}/src/db/migrations`;

export const runMigrationsIfNeeded = async () => {
  if (AUTO_MIGRATE.toLowerCase() === "false") {
    return;
  }

  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  await migrate(db, { migrationsFolder });
};
