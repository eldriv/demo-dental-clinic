import { getStore } from "@netlify/blobs";
import { shouldUseNetlifyBlobs } from "@/lib/storage-env";

const BLOB_STORE = "bookings";
const BLOB_KEY = "admin-login-attempts";

/** Rolling window for counting failed attempts. */
const FAILURE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Escalating lockouts — soft at first, longer only after repeated failures. */
const LOCKOUT_TIERS = [
  { failures: 3, durationMs: 60 * 1000 }, // 1 minute
  { failures: 5, durationMs: 2 * 60 * 1000 }, // 2 minutes
  { failures: 7, durationMs: 5 * 60 * 1000 }, // 5 minutes
  { failures: 10, durationMs: 60 * 60 * 1000 }, // 1 hour
] as const;

export const LOGIN_GENERIC_ERROR = "Invalid email or password.";

export interface LoginRateLimitState {
  limited: boolean;
  message?: string;
  retryAfterSeconds?: number;
}

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
  return failures.filter((timestamp) => now - timestamp < FAILURE_WINDOW_MS);
}

function getLockoutDurationMs(failureCount: number): number | null {
  let durationMs: number | null = null;
  for (const tier of LOCKOUT_TIERS) {
    if (failureCount >= tier.failures) {
      durationMs = tier.durationMs;
    }
  }
  return durationMs;
}

export function formatLockoutWait(remainingMs: number): string {
  if (remainingMs <= 0) return "a moment";

  const totalSeconds = Math.ceil(remainingMs / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
  }

  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const totalHours = Math.ceil(totalMinutes / 60);
  return `${totalHours} hour${totalHours === 1 ? "" : "s"}`;
}

export function formatLockoutMessage(remainingMs: number): string {
  return `Too many sign-in attempts. Please wait ${formatLockoutWait(remainingMs)} and try again.`;
}

export function getLoginRateLimitState(
  entry: LoginAttemptEntry | undefined,
  now = Date.now()
): LoginRateLimitState {
  if (!entry?.lockedUntil) return { limited: false };

  const lockedUntilMs = new Date(entry.lockedUntil).getTime();
  const remainingMs = lockedUntilMs - now;
  if (remainingMs <= 0) return { limited: false };

  return {
    limited: true,
    message: formatLockoutMessage(remainingMs),
    retryAfterSeconds: Math.ceil(remainingMs / 1000),
  };
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

export async function checkLoginRateLimit(ip: string): Promise<LoginRateLimitState> {
  if (process.env.NODE_ENV !== "production") return { limited: false };
  const store = await readAttempts();
  return getLoginRateLimitState(store[ip]);
}

export async function recordFailedLoginAttempt(ip: string): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const store = await readAttempts();
  const now = Date.now();
  const current = store[ip] ?? { failures: [] };
  const failures = [...pruneFailures(current.failures, now), now];
  const lockoutMs = getLockoutDurationMs(failures.length);

  let lockedUntil = current.lockedUntil;
  if (lockoutMs) {
    const nextLockedUntilMs = now + lockoutMs;
    const currentLockedUntilMs = lockedUntil ? new Date(lockedUntil).getTime() : 0;
    if (nextLockedUntilMs > currentLockedUntilMs) {
      lockedUntil = new Date(nextLockedUntilMs).toISOString();
    }
  }

  store[ip] = {
    failures,
    ...(lockedUntil ? { lockedUntil } : {}),
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
