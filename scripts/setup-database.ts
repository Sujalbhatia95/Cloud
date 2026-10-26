/**
 * Prepares the database on every deployment (Vercel runs it through `pnpm vercel-build`), so a new
 * site can go live without running anything on your own computer. Safe to run repeatedly:
 *   1. applies any pending migrations;
 *   2. on the very first run only (no settings saved yet): adds default settings and the DEMO listings;
 *   3. while there are no staff accounts: creates the first admin from ADMIN_EMAIL and ADMIN_PASSWORD,
 *      who must choose a new password at first sign-in. Existing accounts are never changed.
 * Usage: pnpm db:setup
 */
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { databaseUrlFromEnv, poolConfigFromEnv } from "../src/db/config";
import { hashPassword, passwordProblems } from "../src/lib/auth/password";
import { seedDemoData } from "./seed";

async function main() {
  const url = databaseUrlFromEnv();
  if (!url) {
    throw new Error(
      "No database configured. Add DATABASE_URL (or connect a Postgres database in Vercel → Storage) and redeploy.",
    );
  }
  const pool = new Pool({ ...poolConfigFromEnv(url), max: 1 });
  const db = drizzle(pool, { schema });
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✓ Database migrations applied");

    const [settings] = await db.select({ n: count() }).from(schema.siteSettings);
    if (settings.n === 0) {
      const n = await seedDemoData(db);
      console.log(`✓ First run: added default settings and ${n} DEMO listings (turn demo mode off in the admin before launch)`);
    }

    const [staff] = await db.select({ n: count() }).from(schema.adminUsers);
    if (staff.n > 0) {
      if (process.env.ADMIN_PASSWORD) console.log("· Staff accounts already exist; ADMIN_EMAIL / ADMIN_PASSWORD are ignored and can be removed.");
      return;
    }
    const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD ?? "";
    if (!email || !password) {
      console.warn("! No staff account yet. Set ADMIN_EMAIL and ADMIN_PASSWORD, then redeploy, to create the first admin.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ADMIN_EMAIL is not a valid email address.");
    const problems = passwordProblems(password, email);
    if (problems.length) throw new Error(`ADMIN_PASSWORD rejected: ${problems.join(" ")}`);
    await db.insert(schema.adminUsers).values({
      email,
      name: (process.env.ADMIN_NAME ?? "Administrator").trim() || "Administrator",
      role: "admin",
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    });
    console.log(`✓ Created the first admin account (${email}). Sign in at /admin and choose a new password.`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
