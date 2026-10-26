import { execSync } from "node:child_process";
import { Pool } from "pg";
import { hashPassword } from "../../src/lib/auth/password";
import { E2E_ENV, USERS } from "./env";

/** Fresh database for every run: schema → migrations → demo seed → three staff accounts. */
export default async function globalSetup() {
  const url = E2E_ENV.DATABASE_URL;
  const admin = new Pool({ connectionString: url.replace(/\/[^/]+$/, "/postgres") });
  const dbName = url.split("/").pop()!;
  await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`, [dbName]);
  await admin.query(`drop database if exists ${dbName}`);
  await admin.query(`create database ${dbName}`);
  await admin.end();
  const env = { ...process.env, ...E2E_ENV };
  execSync("npx tsx scripts/migrate.ts", { env, stdio: "inherit" });
  execSync("npx tsx scripts/seed.ts", { env, stdio: "inherit" });
  const pool = new Pool({ connectionString: url });
  for (const [role, u] of Object.entries(USERS)) {
    await pool.query(
      `insert into admin_users (email, name, role, password_hash, must_change_password) values ($1, $2, $3, $4, false)`,
      [u.email, u.name, role, await hashPassword(u.password)],
    );
  }
  await pool.end();
  await fetch("http://127.0.0.1:4010/__reset", { method: "POST" }).catch(() => undefined);
}
