import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile?.(".env.local");
} catch {
  // .env.local is optional (CI / hosted environments inject variables directly)
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "" },
  strict: true,
});
