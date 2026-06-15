import { cookies } from "next/headers";
import type { AdminAccount, AdminRole } from "@/content/admin";
import { getAdminAccountByEmail, getAdminAccountById } from "@/content/admin";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export interface AdminSession {
  sub: string;
  email: string;
  name: string;
  role: AdminRole;
  exp: number;
}

function getAdminSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("ADMIN_SECRET is required in production.");
  }
  return secret ?? "dev-admin-secret-change-in-production";
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64").toString("utf8");
}

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAdminSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return encodeBase64Url(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifySignature(payload: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAdminSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sigBytes = Uint8Array.from(decodeBase64Url(signature), (char) => char.charCodeAt(0));
  return crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
}

export async function createSessionToken(account: AdminAccount): Promise<string> {
  const session: AdminSession = {
    sub: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payload = encodeBase64Url(JSON.stringify(session));
  const signature = await signPayload(payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const valid = await verifySignature(payload, signature);
  if (!valid) return null;

  try {
    const session = JSON.parse(decodeBase64Url(payload)) as AdminSession;
    if (!session.exp || session.exp < Date.now()) return null;
    if (!getAdminAccountById(session.sub)) return null;
    return session;
  } catch {
    return null;
  }
}

export function verifyAdminPassword(account: AdminAccount, password: string): boolean {
  const envKey = `ADMIN_PASSWORD_${account.id.toUpperCase().replace(/-/g, "_")}`;
  const accountPassword = process.env[envKey];

  if (accountPassword) {
    return password === accountPassword;
  }

  if (account.role === "owner" && process.env.ADMIN_PASSWORD) {
    return password === process.env.ADMIN_PASSWORD;
  }

  if (account.role === "staff" && process.env.ADMIN_PASSWORD_STAFF) {
    return password === process.env.ADMIN_PASSWORD_STAFF;
  }

  if (process.env.NODE_ENV !== "production") {
    if (account.role === "dentist") {
      return password === "dentist2026";
    }
    return password === "smilecare2026";
  }

  return false;
}

export async function getSessionFromCookies(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export async function authenticateAdmin(
  email: string,
  password: string
): Promise<AdminAccount | null> {
  const account = getAdminAccountByEmail(email);
  if (!account) return null;
  if (!verifyAdminPassword(account, password)) return null;
  return account;
}
