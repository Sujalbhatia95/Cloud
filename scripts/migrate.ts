/**
 * Applies pending SQL migrations from ./drizzle to DATABASE_URL.
 * Usage: pnpm db:migrate
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { databaseUrlFromEnv, poolConfigFromEnv } from "../src/db/config";

async function main() {
  const url = databaseUrlFromEnv();
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ ...poolConfigFromEnv(url), max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.log("✓ Database migrations applied");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
