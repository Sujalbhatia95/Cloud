import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { poolConfigFromEnv } from "./config";
import * as schema from "./schema";
import { env } from "@/lib/env";

export type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __skaPool?: Pool; __skaDb?: Database };

function create(): Database {
  let pool = globalForDb.__skaPool;
  if (!pool) {
    pool = new Pool(poolConfigFromEnv(env.databaseUrl));
    // Hosted databases may close idle connections; log instead of crashing the process.
    pool.on("error", (err) => console.error("[db] idle connection error:", err.message));
  }
  globalForDb.__skaPool = pool;
  return drizzle(pool, { schema });
}

/** Lazily-initialised Drizzle client (avoids connecting at build time). */
export function getDb(): Database {
  if (!globalForDb.__skaDb) globalForDb.__skaDb = create();
  return globalForDb.__skaDb;
}

export { schema };
