import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import config from "../../drizzle.config";
import { db } from "./client";

const AUTO_MIGRATE = process.env.AUTO_MIGRATE ?? "true";
const AUTO_GENERATE_MIGRATIONS =
  process.env.AUTO_GENERATE_MIGRATIONS ??
  (process.env.NODE_ENV === "development" ? "true" : "false");

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const backendRoot = resolve(__dirname, "..", "..");
const migrationsFolder = resolve(backendRoot, config.out as string);
const drizzleConfig = resolve(backendRoot, "drizzle.config.ts");

const generateMigrations = () => {
  const result = spawnSync(
    "bun",
    ["x", "drizzle-kit", "generate", "--config", drizzleConfig],
    { stdio: "inherit", cwd: backendRoot },
  );

  if (result.status !== 0) {
    console.warn("drizzle-kit generate failed; skipping auto migration");
  }
};

export const runMigrationsIfNeeded = async () => {
  if (AUTO_MIGRATE.toLowerCase() === "false") {
    return;
  }

  if (AUTO_GENERATE_MIGRATIONS.toLowerCase() === "true") {
    generateMigrations();
  }

  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  await migrate(db, { migrationsFolder });
};
