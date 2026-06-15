import { cookies } from "next/headers";
import type { AdminAccount } from "@/content/admin";
import { findAdminAccountByEmail, findAdminAccountById } from "@/lib/admin-accounts-store";
import { verifyAdminPassword } from "@/lib/admin-password";
import { toAdminAccount } from "@/lib/admin-accounts";
import {
  buildSessionPayload,
  createSessionToken,
  sessionCookieOptions,
  verifySessionTokenEdge,
  ADMIN_SESSION_COOKIE,
  type AdminSession,
} from "@/lib/admin-session";

export { ADMIN_SESSION_COOKIE, sessionCookieOptions, type AdminSession } from "@/lib/admin-session";

export async function createSessionTokenForAccount(account: AdminAccount): Promise<string> {
  return createSessionToken(buildSessionPayload(account));
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  const session = await verifySessionTokenEdge(token);
  if (!session) return null;

  const account = await findAdminAccountById(session.sub);
  if (!account || account.status !== "active") return null;
  return session;
}

export async function getSessionFromCookies(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function authenticateAdmin(
  email: string,
  password: string
): Promise<AdminAccount | null> {
  const stored = await findAdminAccountByEmail(email);
  if (!stored) return null;
  if (stored.status !== "active") return null;
  if (!(await verifyAdminPassword(password, stored.passwordHash))) return null;
  return toAdminAccount(stored);
}
