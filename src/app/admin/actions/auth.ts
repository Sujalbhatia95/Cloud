"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { audit, requirePage } from "@/lib/auth/guards";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/auth/password";
import { createSession, currentSessionToken, destroyAllSessionsFor, destroySession, getSessionUser } from "@/lib/auth/session";
import { clearRateLimit, rateLimit } from "@/lib/forms/rate-limit";
import { hashIp } from "@/lib/security/crypto";
import { requestMeta } from "@/lib/security/request";

export type AuthState = { error?: string; ok?: string };

const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;

export async function loginAction(_prev: AuthState, data: FormData): Promise<AuthState> {
  const email = String(data.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(data.get("password") ?? "").slice(0, 200);
  const next = String(data.get("next") ?? "");
  const meta = await requestMeta();
  const generic = "Incorrect email or password.";

  const ipLimit = await rateLimit(`login-ip:${hashIp(meta.ip) ?? "unknown"}`, 20, 15 * 60);
  if (!ipLimit.ok) return { error: `Too many sign-in attempts. Try again in ${Math.ceil(ipLimit.retryAfter / 60)} minutes.` };
  if (!email || !password) return { error: generic };

  const db = getDb();
  const [user] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email)).limit(1);
  const valid = await verifyPassword(password, user?.passwordHash ?? "invalid");

  if (!user || !user.isActive) {
    await audit(null, "auth.login_failed", "admin_user", undefined, { email });
    return { error: generic };
  }
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return { error: `This account is temporarily locked after repeated failed sign-ins. Try again after ${LOCK_MINUTES} minutes.` };
  }
  if (!valid) {
    const failures = user.failedLoginCount + 1;
    await db
      .update(schema.adminUsers)
      .set({
        failedLoginCount: failures >= LOCK_AFTER ? 0 : failures,
        lockedUntil: failures >= LOCK_AFTER ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      })
      .where(eq(schema.adminUsers.id, user.id));
    await audit({ id: user.id, email: user.email }, failures >= LOCK_AFTER ? "auth.account_locked" : "auth.login_failed", "admin_user", user.id);
    return { error: generic };
  }

  await db
    .update(schema.adminUsers)
    .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(schema.adminUsers.id, user.id));
  await createSession(user.id, meta);
  await clearRateLimit(`login-ip:${hashIp(meta.ip) ?? "unknown"}`);
  await audit({ id: user.id, email: user.email }, "auth.login", "admin_user", user.id);
  redirect(user.mustChangePassword ? "/admin/account?first=1" : next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction() {
  const user = await getSessionUser();
  await destroySession();
  if (user) await audit(user, "auth.logout", "admin_user", user.id);
  redirect("/admin/login");
}

export async function changePasswordAction(_prev: AuthState, data: FormData): Promise<AuthState> {
  const user = await requirePage("dashboard", { allowPasswordChange: true });
  const current = String(data.get("current") ?? "");
  const next = String(data.get("password") ?? "");
  const confirm = String(data.get("confirm") ?? "");
  const db = getDb();
  const [row] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, user.id)).limit(1);
  if (!row || !(await verifyPassword(current, row.passwordHash))) return { error: "Your current password is incorrect." };
  if (next !== confirm) return { error: "The new passwords do not match." };
  if (next === current) return { error: "Choose a password different from the current one." };
  const problems = passwordProblems(next, user.email);
  if (problems.length) return { error: problems.join(" ") };
  await db
    .update(schema.adminUsers)
    .set({ passwordHash: await hashPassword(next), mustChangePassword: false, updatedAt: new Date() })
    .where(eq(schema.adminUsers.id, user.id));
  // Sign out every other device that was using the old password.
  const token = await currentSessionToken();
  await destroyAllSessionsFor(user.id, token);
  await audit(user, "auth.password_changed", "admin_user", user.id);
  return { ok: "Password updated. Other devices have been signed out." };
}
