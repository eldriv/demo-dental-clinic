import { getStore } from "@netlify/blobs";
import { shouldUseNetlifyBlobs } from "@/lib/storage-env";
import type { StoredAdminAccount } from "@/lib/admin-accounts-store";
import type { DentistInvite } from "@/lib/admin-invites-store";
import type { ClinicDentist } from "@/lib/dentists";
import {
  countLegacySeedRecords,
  filterLegacySeedAdminAccounts,
  filterLegacySeedDentists,
  filterLegacySeedInvites,
} from "@/lib/legacy-demo-purge";

const BLOB_STORE = "bookings";
const DENTISTS_KEY = "dentists";
const INVITES_KEY = "dentist-invites";
const ACCOUNTS_KEY = "admin-accounts";

let purgePromise: Promise<boolean> | null = null;

async function readJsonFile<T>(relativePath: string): Promise<T[]> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const file = path.join(process.cwd(), ".data", "bookings", relativePath);

  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data) as T[];
  } catch {
    return [];
  }
}

async function writeJsonFile<T>(relativePath: string, value: T[]): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data", "bookings");
  const file = path.join(dir, relativePath);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2), "utf-8");
}

async function readBlobJson<T>(key: string): Promise<T[]> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(key, { type: "json" });
  return (data as T[] | null) ?? [];
}

async function writeBlobJson<T>(key: string, value: T[]): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(key, value);
}

async function readAllRecords(): Promise<{
  dentists: ClinicDentist[];
  invites: DentistInvite[];
  accounts: StoredAdminAccount[];
}> {
  if (shouldUseNetlifyBlobs()) {
    const [dentists, invites, accounts] = await Promise.all([
      readBlobJson<ClinicDentist>(DENTISTS_KEY),
      readBlobJson<DentistInvite>(INVITES_KEY),
      readBlobJson<StoredAdminAccount>(ACCOUNTS_KEY),
    ]);
    return { dentists, invites, accounts };
  }

  const [dentists, invites, accounts] = await Promise.all([
    readJsonFile<ClinicDentist>("dentists.json"),
    readJsonFile<DentistInvite>("dentist-invites.json"),
    readJsonFile<StoredAdminAccount>("admin-accounts.json"),
  ]);
  return { dentists, invites, accounts };
}

async function writeAllRecords(input: {
  dentists: ClinicDentist[];
  invites: DentistInvite[];
  accounts: StoredAdminAccount[];
}): Promise<void> {
  if (shouldUseNetlifyBlobs()) {
    await Promise.all([
      writeBlobJson(DENTISTS_KEY, input.dentists),
      writeBlobJson(INVITES_KEY, input.invites),
      writeBlobJson(ACCOUNTS_KEY, input.accounts),
    ]);
    return;
  }

  await Promise.all([
    writeJsonFile("dentists.json", input.dentists),
    writeJsonFile("dentist-invites.json", input.invites),
    writeJsonFile("admin-accounts.json", input.accounts),
  ]);
}

async function runLegacyDemoPurge(): Promise<boolean> {
  const current = await readAllRecords();
  if (countLegacySeedRecords(current) === 0) return false;

  await writeAllRecords({
    dentists: filterLegacySeedDentists(current.dentists),
    invites: filterLegacySeedInvites(current.invites),
    accounts: filterLegacySeedAdminAccounts(current.accounts),
  });

  return true;
}

/** Remove auto-seeded Sarah/Raj demo data from storage (local + Netlify Blobs). */
export async function purgeLegacyDemoData(): Promise<boolean> {
  if (!purgePromise) {
    purgePromise = runLegacyDemoPurge().finally(() => {
      purgePromise = null;
    });
  }
  return purgePromise;
}
