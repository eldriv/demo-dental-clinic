import { getStore } from "@netlify/blobs";
import type { AdminRole } from "@/content/admin";
import { hashAdminPassword } from "@/lib/admin-password";
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

async function buildBootstrapAccounts(): Promise<StoredAdminAccount[]> {
  const now = new Date().toISOString();
  const accounts: StoredAdminAccount[] = [];

  const ownerPassword = process.env.ADMIN_PASSWORD;
  if (ownerPassword || process.env.NODE_ENV !== "production") {
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
  if (staffPassword || process.env.NODE_ENV !== "production") {
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
        return ensureDevDentistSeeds(stored);
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
  accountsPromise = Promise.resolve(next);
}

export async function findAdminAccountByEmail(
  email: string
): Promise<StoredAdminAccount | undefined> {
  const normalized = email.trim().toLowerCase();
  const accounts = await getAllAdminAccounts();
  return accounts.find((account) => account.email.toLowerCase() === normalized);
}

export async function findAdminAccountById(
  id: string
): Promise<StoredAdminAccount | undefined> {
  const accounts = await getAllAdminAccounts();
  return accounts.find((account) => account.id === id);
}

export async function findAdminAccountByLinkedDentistId(
  linkedDentistId: string
): Promise<StoredAdminAccount | undefined> {
  const accounts = await getAllAdminAccounts();
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
