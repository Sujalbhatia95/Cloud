import "server-only";
import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { cache } from "react";
import { getDb, schema } from "@/db";
import { env } from "@/lib/env";
import { hashIp, randomToken, sha256 } from "@/lib/security/crypto";
import type { RequestMeta } from "@/lib/security/request";
import { atRequestTime } from "@/lib/request-time";
import type { Role } from "./roles";

const SESSION_HOURS = 12;

export function sessionCookieName(): string {
  return env.siteUrl.startsWith("https://") ? "__Host-ska_admin" : "ska_admin";
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
};

export async function createSession(userId: string, meta: RequestMeta): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  const db = getDb();
  await db.insert(schema.adminSessions).values({
    tokenHash: sha256(token),
    userId,
    expiresAt,
    ipHash: hashIp(meta.ip),
    userAgent: meta.userAgent,
  });
  // Opportunistic clean-up of expired sessions
  await db.delete(schema.adminSessions).where(lt(schema.adminSessions.expiresAt, new Date()));
  (await cookies()).set(sessionCookieName(), token, {
    httpOnly: true,
    secure: env.siteUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Returns the signed-in admin user, or null. Deduplicated per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  await atRequestTime();
  const token = (await cookies()).get(sessionCookieName())?.value;
  if (!token || token.length > 100) return null;
  const db = getDb();
  const [row] = await db
    .select({
      tokenHash: schema.adminSessions.tokenHash,
      lastSeenAt: schema.adminSessions.lastSeenAt,
      id: schema.adminUsers.id,
      email: schema.adminUsers.email,
      name: schema.adminUsers.name,
      role: schema.adminUsers.role,
      isActive: schema.adminUsers.isActive,
      mustChangePassword: schema.adminUsers.mustChangePassword,
    })
    .from(schema.adminSessions)
    .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.adminSessions.userId))
    .where(and(eq(schema.adminSessions.tokenHash, sha256(token)), gt(schema.adminSessions.expiresAt, new Date())))
    .limit(1);
  if (!row || !row.isActive) return null;
  if (Date.now() - row.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await db.update(schema.adminSessions).set({ lastSeenAt: new Date() }).where(eq(schema.adminSessions.tokenHash, row.tokenHash));
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role as Role, mustChangePassword: row.mustChangePassword };
});

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (token) await getDb().delete(schema.adminSessions).where(eq(schema.adminSessions.tokenHash, sha256(token)));
  jar.delete(sessionCookieName());
}

export async function destroyAllSessionsFor(userId: string, exceptToken?: string): Promise<void> {
  const db = getDb();
  const sessions = await db.select({ t: schema.adminSessions.tokenHash }).from(schema.adminSessions).where(eq(schema.adminSessions.userId, userId));
  for (const s of sessions) {
    if (exceptToken && s.t === sha256(exceptToken)) continue;
    await db.delete(schema.adminSessions).where(eq(schema.adminSessions.tokenHash, s.t));
  }
}

export async function currentSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(sessionCookieName())?.value;
}
