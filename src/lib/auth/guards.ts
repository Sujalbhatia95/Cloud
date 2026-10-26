import "server-only";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { hashIp } from "@/lib/security/crypto";
import { requestMeta } from "@/lib/security/request";
import { can, type Permission } from "./roles";
import { getSessionUser, type SessionUser } from "./session";

/**
 * For admin pages: redirects to the login page when signed out, and to the dashboard
 * when the role lacks the permission. Every page and action calls this (Data Access Layer).
 */
export async function requirePage(permission: Permission, opts: { allowPasswordChange?: boolean } = {}): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.mustChangePassword && !opts.allowPasswordChange) redirect("/admin/account?first=1");
  if (!can(user.role, permission)) redirect("/admin?denied=1");
  return user;
}

export class AuthError extends Error {}

/** For server actions and route handlers: throws instead of redirecting. */
export async function requireAction(permission: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Your session has expired. Please sign in again.");
  if (user.mustChangePassword) throw new AuthError("Change your temporary password first.");
  if (!can(user.role, permission)) throw new AuthError("You do not have permission to do this.");
  return user;
}

export async function audit(
  user: Pick<SessionUser, "id" | "email"> | null,
  action: string,
  entity?: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  const meta = await requestMeta().catch(() => ({ ip: null }));
  await getDb()
    .insert(schema.auditLog)
    .values({ userId: user?.id ?? null, userEmail: user?.email ?? null, action, entity, entityId, details, ipHash: hashIp(meta.ip) });
}
