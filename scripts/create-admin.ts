/**
 * Creates (or resets) a staff account from the command line.
 *   pnpm admin:create --email you@example.com --name "Your Name" [--role admin|editor|agent] [--password '...']
 * Without --password a strong temporary password is generated and printed once; the user must change it at first sign-in.
 */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { databaseUrlFromEnv, poolConfigFromEnv } from "../src/db/config";
import { hashPassword, passwordProblems } from "../src/lib/auth/password";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = (arg("email") ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = (arg("name") ?? process.env.ADMIN_NAME ?? "Administrator").trim();
  const role = arg("role") ?? "admin";
  const given = arg("password") ?? process.env.ADMIN_PASSWORD;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Pass --email you@example.com");
  if (!["admin", "editor", "agent"].includes(role)) throw new Error("--role must be admin, editor or agent");
  if (given) {
    const problems = passwordProblems(given, email);
    if (problems.length) throw new Error(`Password rejected: ${problems.join(" ")}`);
  }
  const password = given ?? `${randomBytes(12).toString("base64url")}-Sk9`;
  const url = databaseUrlFromEnv();
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ ...poolConfigFromEnv(url), max: 1 });
  const db = drizzle(pool, { schema });
  try {
    const hash = await hashPassword(password);
    const [existing] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email)).limit(1);
    if (existing) {
      await db
        .update(schema.adminUsers)
        .set({ passwordHash: hash, role, name, isActive: true, mustChangePassword: !given, failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
        .where(eq(schema.adminUsers.id, existing.id));
      await db.delete(schema.adminSessions).where(eq(schema.adminSessions.userId, existing.id));
      console.log(`✓ Reset account ${email} (${role}).`);
    } else {
      await db.insert(schema.adminUsers).values({ email, name, role, passwordHash: hash, mustChangePassword: !given });
      console.log(`✓ Created account ${email} (${role}).`);
    }
    if (!given) console.log(`  Temporary password (shown once): ${password}\n  You will be asked to choose a new password at first sign-in.`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
