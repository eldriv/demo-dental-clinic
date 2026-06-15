import { getStore } from "@netlify/blobs";
import type { AdminRole } from "@/content/admin";
import { hashAdminPassword, verifyAdminPassword } from "@/lib/admin-password";
import { DEFAULT_DENTISTS } from "@/lib/dentists";
import { shouldUseNetlifyBlobs } from "@/lib/storage-env";

const BLOB_STORE = "bookings";
const BLOB_KEY = "admin-accounts";

export interface StoredAdminAccount {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  linkedDentistId?: string;
  passwordHash: string;
  createdAt: string;
  invitedBy?: string;
  status: "active" | "disabled";
}

async function readLocalAccounts(): Promise<StoredAdminAccount[]> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const file = path.join(process.cwd(), ".data", "bookings", "admin-accounts.json");

  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data) as StoredAdminAccount[];
  } catch {
    return [];
  }
}

async function writeLocalAccounts(accounts: StoredAdminAccount[]): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data", "bookings");
  const file = path.join(dir, "admin-accounts.json");

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(accounts, null, 2), "utf-8");
}

async function readBlobAccounts(): Promise<StoredAdminAccount[]> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  return (data as StoredAdminAccount[] | null) ?? [];
}

async function writeBlobAccounts(accounts: StoredAdminAccount[]): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, accounts);
}

async function readStoredAccounts(): Promise<StoredAdminAccount[]> {
  if (shouldUseNetlifyBlobs()) {
    return readBlobAccounts();
  }
  return readLocalAccounts();
}

async function writeStoredAccounts(accounts: StoredAdminAccount[]): Promise<void> {
  if (shouldUseNetlifyBlobs()) {
    await writeBlobAccounts(accounts);
  } else {
    await writeLocalAccounts(accounts);
  }
}

function envPasswordForAccountId(accountId: string): string | undefined {
  const envKey = `ADMIN_PASSWORD_${accountId.toUpperCase().replace(/-/g, "_")}`;
  return process.env[envKey];
}

function resolveOwnerEmail(isProduction: boolean): string | undefined {
  const fromEnv = process.env.ADMIN_OWNER_EMAIL?.trim().toLowerCase();
  if (fromEnv) return fromEnv;
  if (isProduction) {
    return process.env.CLINIC_EMAIL?.trim().toLowerCase();
  }
  return "owner";
}

function resolveStaffEmail(isProduction: boolean): string | undefined {
  const fromEnv = process.env.ADMIN_STAFF_EMAIL?.trim().toLowerCase();
  if (fromEnv) return fromEnv;
  if (!isProduction) return "staff";
  return undefined;
}

async function migrateLegacyAdminEmails(
  accounts: StoredAdminAccount[]
): Promise<StoredAdminAccount[]> {
  let changed = false;
  const isProduction = process.env.NODE_ENV === "production";
  const next = accounts.map((account) => {
    if (account.id === "owner" && account.email === "owner") {
      const newEmail = resolveOwnerEmail(isProduction);
      if (newEmail?.includes("@")) {
        changed = true;
        return { ...account, email: newEmail };
      }
    }
    if (account.id === "staff" && account.email === "staff") {
      const newEmail = resolveStaffEmail(isProduction);
      if (newEmail?.includes("@")) {
        changed = true;
        return { ...account, email: newEmail };
      }
    }
    return account;
  });

  if (changed) {
    await writeStoredAccounts(next);
    accountsPromise = Promise.resolve(next);
  }

  return next;
}

/** Keep owner/staff email + password aligned with Netlify env in production. */
async function syncEnvManagedAccounts(
  accounts: StoredAdminAccount[]
): Promise<StoredAdminAccount[]> {
  if (process.env.NODE_ENV !== "production") return accounts;

  const now = new Date().toISOString();
  let changed = false;
  const next = [...accounts];

  async function upsertManagedAccount(
    id: "owner" | "staff",
    role: AdminRole,
    name: string,
    email: string | undefined,
    password: string | undefined
  ): Promise<void> {
    if (!email?.includes("@") || !password) return;

    const index = next.findIndex((account) => account.id === id);
    if (index === -1) {
      next.push({
        id,
        email,
        name,
        role,
        passwordHash: await hashAdminPassword(password),
        createdAt: now,
        status: "active",
      });
      changed = true;
      return;
    }

    const current = next[index];
    const emailChanged = current.email.toLowerCase() !== email.toLowerCase();
    const passwordMatches = await verifyAdminPassword(password, current.passwordHash);

    if (!emailChanged && passwordMatches && current.status === "active") {
      return;
    }

    next[index] = {
      ...current,
      email,
      name,
      role,
      status: "active",
      passwordHash: passwordMatches ? current.passwordHash : await hashAdminPassword(password),
    };
    changed = true;
  }

  await upsertManagedAccount(
    "owner",
    "owner",
    "Clinic Owner",
    resolveOwnerEmail(true),
    process.env.ADMIN_PASSWORD
  );
  await upsertManagedAccount(
    "staff",
    "staff",
    "Front Desk",
    resolveStaffEmail(true),
    process.env.ADMIN_PASSWORD_STAFF
  );

  if (changed) {
    await writeStoredAccounts(next);
    accountsPromise = Promise.resolve(next);
  }

  return next;
}

async function buildBootstrapAccounts(): Promise<StoredAdminAccount[]> {
  const now = new Date().toISOString();
  const accounts: StoredAdminAccount[] = [];
  const isProduction = process.env.NODE_ENV === "production";

  const ownerPassword = process.env.ADMIN_PASSWORD;
  const ownerEmail = resolveOwnerEmail(isProduction);

  if (ownerPassword && ownerEmail) {
    if (isProduction && !ownerEmail.includes("@")) {
      throw new Error("ADMIN_OWNER_EMAIL must be a valid email in production.");
    }

    accounts.push({
      id: "owner",
      email: ownerEmail,
      name: "Clinic Owner",
      role: "owner",
      passwordHash: await hashAdminPassword(ownerPassword),
      createdAt: now,
      status: "active",
    });
  } else if (!isProduction) {
    accounts.push({
      id: "owner",
      email: "owner",
      name: "Clinic Owner",
      role: "owner",
      passwordHash: await hashAdminPassword(ownerPassword ?? "smilecare2026"),
      createdAt: now,
      status: "active",
    });
  }

  const staffPassword = process.env.ADMIN_PASSWORD_STAFF;
  const staffEmail = resolveStaffEmail(isProduction);

  if (staffPassword && staffEmail) {
    if (isProduction && !staffEmail.includes("@")) {
      throw new Error("ADMIN_STAFF_EMAIL must be a valid email in production.");
    }

    accounts.push({
      id: "staff",
      email: staffEmail,
      name: "Front Desk",
      role: "staff",
      passwordHash: await hashAdminPassword(staffPassword),
      createdAt: now,
      status: "active",
    });
  } else if (!isProduction) {
    accounts.push({
      id: "staff",
      email: "staff",
      name: "Front Desk",
      role: "staff",
      passwordHash: await hashAdminPassword(staffPassword ?? "smilecare2026"),
      createdAt: now,
      status: "active",
    });
  }

  if (process.env.NODE_ENV !== "production") {
    for (const dentist of DEFAULT_DENTISTS) {
      const accountId = `dentist-${dentist.id}`;
      const password =
        envPasswordForAccountId(accountId) ??
        envPasswordForAccountId(dentist.id) ??
        "dentist2026";
      const email = dentist.id;

      accounts.push({
        id: accountId,
        email,
        name: dentist.name,
        role: "dentist",
        linkedDentistId: dentist.id,
        passwordHash: await hashAdminPassword(password),
        createdAt: now,
        status: "active",
      });
    }
  }

  return accounts;
}

let accountsPromise: Promise<StoredAdminAccount[]> | null = null;

function invalidateAdminAccountsCache(): void {
  accountsPromise = null;
}

/** Always read storage for auth — avoids stale serverless module cache after invite signup. */
export async function loadFreshAdminAccounts(): Promise<StoredAdminAccount[]> {
  const stored = await readStoredAccounts();
  if (stored.length > 0) {
    const migrated = await migrateLegacyAdminEmails(stored);
    return await syncEnvManagedAccounts(migrated);
  }
  return getAllAdminAccounts();
}

async function ensureDevDentistSeeds(
  accounts: StoredAdminAccount[]
): Promise<StoredAdminAccount[]> {
  if (process.env.NODE_ENV === "production") return accounts;
  if (accounts.some((account) => account.role === "dentist")) return accounts;

  const now = new Date().toISOString();
  const additions: StoredAdminAccount[] = [];

  for (const dentist of DEFAULT_DENTISTS) {
    const accountId = `dentist-${dentist.id}`;
    const password =
      envPasswordForAccountId(accountId) ??
      envPasswordForAccountId(dentist.id) ??
      "dentist2026";

    additions.push({
      id: accountId,
      email: dentist.id,
      name: dentist.name,
      role: "dentist",
      linkedDentistId: dentist.id,
      passwordHash: await hashAdminPassword(password),
      createdAt: now,
      status: "active",
    });
  }

  const next = [...accounts, ...additions];
  await writeStoredAccounts(next);
  accountsPromise = Promise.resolve(next);
  return next;
}

export async function getAllAdminAccounts(): Promise<StoredAdminAccount[]> {
  if (!accountsPromise) {
    accountsPromise = (async () => {
      const stored = await readStoredAccounts();
      if (stored.length > 0) {
        const migrated = await migrateLegacyAdminEmails(stored);
        const synced = await syncEnvManagedAccounts(migrated);
        return ensureDevDentistSeeds(synced);
      }

      const seeded = await buildBootstrapAccounts();
      if (seeded.length === 0) return [];

      await writeStoredAccounts(seeded);
      return seeded;
    })();
  }

  return accountsPromise;
}

export async function saveAdminAccount(account: StoredAdminAccount): Promise<void> {
  const accounts = await readStoredAccounts();
  const index = accounts.findIndex((entry) => entry.id === account.id);
  const next =
    index === -1
      ? [...accounts, account]
      : accounts.map((entry) => (entry.id === account.id ? account : entry));

  await writeStoredAccounts(next);
  invalidateAdminAccountsCache();
  accountsPromise = Promise.resolve(next);
}

export async function findAdminAccountByEmail(
  email: string
): Promise<StoredAdminAccount | undefined> {
  const normalized = email.trim().toLowerCase();
  const accounts = await loadFreshAdminAccounts();
  return accounts.find((account) => account.email.toLowerCase() === normalized);
}

export async function findAdminAccountById(
  id: string
): Promise<StoredAdminAccount | undefined> {
  const accounts = await loadFreshAdminAccounts();
  return accounts.find((account) => account.id === id);
}

export async function findAdminAccountByLinkedDentistId(
  linkedDentistId: string
): Promise<StoredAdminAccount | undefined> {
  const accounts = await loadFreshAdminAccounts();
  return accounts.find(
    (account) =>
      account.role === "dentist" &&
      account.linkedDentistId === linkedDentistId &&
      account.status === "active"
  );
}

export function createAdminAccountId(role: AdminRole, seed: string): string {
  const slug = seed
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return role === "dentist" ? `dentist-${slug || "user"}` : slug || "user";
}
