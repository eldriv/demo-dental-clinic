import { v4 as uuidv4 } from "uuid";
import { purgeLegacyDemoData } from "@/lib/legacy-demo-data-purge";
import { filterLegacySeedInvites } from "@/lib/legacy-demo-purge";
import { getStore } from "@netlify/blobs";
import { shouldUseNetlifyBlobs } from "@/lib/storage-env";

const BLOB_STORE = "bookings";
const BLOB_KEY = "dentist-invites";
const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export type DentistInviteStatus = "pending" | "accepted" | "revoked";

export interface DentistInvite {
  token: string;
  email: string;
  name: string;
  linkedDentistId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  status: DentistInviteStatus;
  acceptedAt?: string;
}

async function readLocalInvites(): Promise<DentistInvite[]> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const file = path.join(process.cwd(), ".data", "bookings", "dentist-invites.json");

  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data) as DentistInvite[];
  } catch {
    return [];
  }
}

async function writeLocalInvites(invites: DentistInvite[]): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data", "bookings");
  const file = path.join(dir, "dentist-invites.json");

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(invites, null, 2), "utf-8");
}

async function readBlobInvites(): Promise<DentistInvite[]> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  return (data as DentistInvite[] | null) ?? [];
}

async function writeBlobInvites(invites: DentistInvite[]): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, invites);
}

async function readStoredInvites(): Promise<DentistInvite[]> {
  await purgeLegacyDemoData();
  let invites: DentistInvite[];
  if (shouldUseNetlifyBlobs()) {
    invites = await readBlobInvites();
  } else {
    invites = await readLocalInvites();
  }
  return filterLegacySeedInvites(invites);
}

async function writeStoredInvites(invites: DentistInvite[]): Promise<void> {
  if (shouldUseNetlifyBlobs()) {
    await writeBlobInvites(invites);
  } else {
    await writeLocalInvites(invites);
  }
}

export function isInviteExpired(invite: DentistInvite, now = Date.now()): boolean {
  return new Date(invite.expiresAt).getTime() < now;
}

export async function getAllDentistInvites(): Promise<DentistInvite[]> {
  return readStoredInvites();
}

export async function getPendingDentistInvites(): Promise<DentistInvite[]> {
  const invites = await readStoredInvites();
  return invites.filter(
    (invite) => invite.status === "pending" && !isInviteExpired(invite)
  );
}

export async function getDentistInviteByToken(
  token: string
): Promise<DentistInvite | undefined> {
  const invites = await readStoredInvites();
  return invites.find((invite) => invite.token === token);
}

export async function getPendingInviteForDentist(
  linkedDentistId: string
): Promise<DentistInvite | undefined> {
  const invites = await getPendingDentistInvites();
  return invites.find((invite) => invite.linkedDentistId === linkedDentistId);
}

export async function createDentistInvite(input: {
  email: string;
  name: string;
  linkedDentistId: string;
  createdBy: string;
}): Promise<DentistInvite> {
  const email = input.email.trim().toLowerCase();
  const now = new Date();
  const invite: DentistInvite = {
    token: uuidv4(),
    email,
    name: input.name.trim(),
    linkedDentistId: input.linkedDentistId,
    createdBy: input.createdBy,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + INVITE_TTL_MS).toISOString(),
    status: "pending",
  };

  const invites = await readStoredInvites();
  const next = [
    ...invites.filter(
      (entry) =>
        !(
          entry.status === "pending" &&
          (entry.linkedDentistId === invite.linkedDentistId ||
            entry.email.toLowerCase() === email)
        )
    ),
    invite,
  ];

  await writeStoredInvites(next);
  return invite;
}

export async function markDentistInviteAccepted(token: string): Promise<DentistInvite | null> {
  const invites = await readStoredInvites();
  const index = invites.findIndex((invite) => invite.token === token);
  if (index === -1) return null;

  invites[index] = {
    ...invites[index],
    status: "accepted",
    acceptedAt: new Date().toISOString(),
  };

  await writeStoredInvites(invites);
  return invites[index];
}

export async function revokeDentistInvite(token: string): Promise<DentistInvite | null> {
  const invites = await readStoredInvites();
  const index = invites.findIndex((invite) => invite.token === token);
  if (index === -1) return null;

  invites[index] = {
    ...invites[index],
    status: "revoked",
  };

  await writeStoredInvites(invites);
  return invites[index];
}

export async function revokeAllInvitesForDentist(linkedDentistId: string): Promise<number> {
  const invites = await readStoredInvites();
  let revoked = 0;
  const next = invites.map((invite) => {
    if (invite.linkedDentistId === linkedDentistId && invite.status === "pending") {
      revoked += 1;
      return { ...invite, status: "revoked" as const };
    }
    return invite;
  });

  if (revoked > 0) {
    await writeStoredInvites(next);
  }

  return revoked;
}
