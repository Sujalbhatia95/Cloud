// Integration tests run against a dedicated database (never the dev or production one).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:pgdevpass@127.0.0.1:5432/ska_test";
process.env.DATABASE_SSL = "disable";
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "test-session-secret-0123456789abcdef0123456789";
