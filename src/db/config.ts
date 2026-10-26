import type { PoolConfig } from "pg";

/**
 * TLS options for hosted Postgres (Supabase, Neon, RDS...).
 * DATABASE_SSL: "disable" | "require" (verify certificate, default for non-local hosts) | "no-verify".
 * DATABASE_CA_CERT: optional PEM of the provider's CA certificate (recommended with "require").
 */
export function poolConfigFromEnv(connectionString: string): PoolConfig {
  const mode = (process.env.DATABASE_SSL ?? "").toLowerCase();
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);
  let ssl: PoolConfig["ssl"] = undefined;
  if (mode === "no-verify") ssl = { rejectUnauthorized: false };
  else if (mode === "require" || (!isLocal && mode !== "disable")) {
    ssl = process.env.DATABASE_CA_CERT
      ? { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, "\n") }
      : { rejectUnauthorized: true };
  }
  // Strip sslmode from the URL so the explicit `ssl` object above is authoritative.
  const cleaned = connectionString.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
  return {
    connectionString: cleaned,
    ssl,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  };
}
