import { getStore } from "@netlify/blobs";
import { shouldUseNetlifyBlobs } from "@/lib/storage-env";

const BLOB_STORE = "bookings";
const BLOB_KEY = "admin-login-attempts";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000;

export const LOGIN_RATE_LIMIT_MESSAGE =
  "Too many sign-in attempts. Please wait a few minutes and try again.";

export const LOGIN_GENERIC_ERROR = "Invalid email or password.";

interface LoginAttemptEntry {
  failures: number[];
  lockedUntil?: string;
}

type LoginAttemptStore = Record<string, LoginAttemptEntry>;

async function readLocalAttempts(): Promise<LoginAttemptStore> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const file = path.join(process.cwd(), ".data", "bookings", "admin-login-attempts.json");

  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data) as LoginAttemptStore;
  } catch {
    return {};
  }
}

async function writeLocalAttempts(store: LoginAttemptStore): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data", "bookings");
  const file = path.join(dir, "admin-login-attempts.json");

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(store, null, 2), "utf-8");
}

async function readBlobAttempts(): Promise<LoginAttemptStore> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  return (data as LoginAttemptStore | null) ?? {};
}

async function writeBlobAttempts(store: LoginAttemptStore): Promise<void> {
  const blobStore = getStore(BLOB_STORE);
  await blobStore.setJSON(BLOB_KEY, store);
}

async function readAttempts(): Promise<LoginAttemptStore> {
  if (shouldUseNetlifyBlobs()) {
    return readBlobAttempts();
  }
  return readLocalAttempts();
}

async function writeAttempts(store: LoginAttemptStore): Promise<void> {
  if (shouldUseNetlifyBlobs()) {
    await writeBlobAttempts(store);
  } else {
    await writeLocalAttempts(store);
  }
}

function pruneFailures(failures: number[], now: number): number[] {
  return failures.filter((timestamp) => now - timestamp < WINDOW_MS);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-nf-client-connection-ip");
  if (realIp) return realIp.trim();

  const legacyRealIp = request.headers.get("x-real-ip");
  if (legacyRealIp) return legacyRealIp.trim();

  return "unknown";
}

export function isLoginRateLimited(entry: LoginAttemptEntry | undefined, now = Date.now()): boolean {
  if (!entry) return false;
  if (entry.lockedUntil && new Date(entry.lockedUntil).getTime() > now) {
    return true;
  }
  const recent = pruneFailures(entry.failures, now);
  return recent.length >= MAX_ATTEMPTS;
}

export async function checkLoginRateLimit(ip: string): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return false;
  const store = await readAttempts();
  return isLoginRateLimited(store[ip]);
}

export async function recordFailedLoginAttempt(ip: string): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;
  const store = await readAttempts();
  const now = Date.now();
  const current = store[ip] ?? { failures: [] };
  const failures = [...pruneFailures(current.failures, now), now];

  store[ip] = {
    failures,
    ...(failures.length >= MAX_ATTEMPTS
      ? { lockedUntil: new Date(now + LOCKOUT_MS).toISOString() }
      : {}),
  };

  await writeAttempts(store);
}

export async function clearLoginAttempts(ip: string): Promise<void> {
  const store = await readAttempts();
  if (!store[ip]) return;
  delete store[ip];
  await writeAttempts(store);
}

export function isValidLoginEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  if (!email.includes("@")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function requiresEmailFormatLogin(): boolean {
  return process.env.NODE_ENV === "production";
}
