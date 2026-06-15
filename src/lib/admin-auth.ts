import { cookies } from "next/headers";
import type { AdminAccount } from "@/content/admin";
import { findAdminAccountByEmail, findAdminAccountById } from "@/lib/admin-accounts-store";
import { verifyAdminPassword } from "@/lib/admin-password";
import { toAdminAccount } from "@/lib/admin-accounts";
import { getDentistById } from "@/lib/dentists-store";
import {
  isValidLoginEmail,
  LOGIN_GENERIC_ERROR,
  requiresEmailFormatLogin,
} from "@/lib/admin-login-rate-limit";
import {
  buildSessionPayload,
  createSessionToken,
  sessionCookieOptions,
  verifySessionTokenEdge,
  ADMIN_SESSION_COOKIE,
  type AdminSession,
} from "@/lib/admin-session";

export { ADMIN_SESSION_COOKIE, sessionCookieOptions, type AdminSession } from "@/lib/admin-session";
export { LOGIN_GENERIC_ERROR } from "@/lib/admin-login-rate-limit";

/** Pre-computed scrypt hash so missing accounts still run password verification. */
const DUMMY_PASSWORD_HASH =
  "42ce00185fb6a7dc7d13c9706f416c2b:2801192b064df1f911f332bd263661772f9cf21155b8bfb9e1573d1d0913ff9998edc5e35feb65def7b4cc70ca3576926210af3cf0492538383b9776b0987037";

export async function createSessionTokenForAccount(account: AdminAccount): Promise<string> {
  return createSessionToken(buildSessionPayload(account));
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  const session = await verifySessionTokenEdge(token);
  if (!session) return null;

  const account = await findAdminAccountById(session.sub);
  if (!account || account.status !== "active") return null;

  if (account.role === "dentist" && account.linkedDentistId) {
    const dentist = await getDentistById(account.linkedDentistId);
    if (!dentist) return null;
  }

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
  const normalized = email.trim().toLowerCase();

  if (requiresEmailFormatLogin() && !isValidLoginEmail(normalized)) {
    await verifyAdminPassword(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  const stored = await findAdminAccountByEmail(normalized);
  const hash = stored?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordValid = await verifyAdminPassword(password, hash);

  if (!stored || stored.status !== "active" || !passwordValid) {
    return null;
  }

  if (stored.role === "dentist" && stored.linkedDentistId) {
    const dentist = await getDentistById(stored.linkedDentistId);
    if (!dentist) return null;
  }

  return toAdminAccount(stored);
}
