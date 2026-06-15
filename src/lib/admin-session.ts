import type { AdminRole } from "@/content/admin";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

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

export async function createSessionToken(session: AdminSession): Promise<string> {
  const payload = encodeBase64Url(JSON.stringify(session));
  const signature = await signPayload(payload);
  return `${payload}.${signature}`;
}

/** Edge-safe session verification for middleware (signature + expiry only). */
export async function verifySessionTokenEdge(token: string): Promise<AdminSession | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const valid = await verifySignature(payload, signature);
  if (!valid) return null;

  try {
    const session = JSON.parse(decodeBase64Url(payload)) as AdminSession;
    if (!session.exp || session.exp < Date.now()) return null;
    if (!session.sub || !session.role) return null;
    return session;
  } catch {
    return null;
  }
}

export function buildSessionPayload(account: {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}): AdminSession {
  return {
    sub: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    exp: Date.now() + SESSION_TTL_MS,
  };
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
