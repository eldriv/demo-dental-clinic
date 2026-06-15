import { getStore } from "@netlify/blobs";
import type { ClinicDentist } from "./dentists";
import {
  DEFAULT_DENTISTS,
  findDentistName,
  isDentistIdValid,
  slugifyDentistName,
} from "./dentists";
import { shouldUseNetlifyBlobs } from "./storage-env";

const BLOB_STORE = "bookings";
const BLOB_KEY = "dentists";

async function readLocalDentists(): Promise<ClinicDentist[]> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const file = path.join(process.cwd(), ".data", "bookings", "dentists.json");

  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data) as ClinicDentist[];
  } catch {
    return [];
  }
}

async function writeLocalDentists(dentists: ClinicDentist[]): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data", "bookings");
  const file = path.join(dir, "dentists.json");

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(dentists, null, 2), "utf-8");
}

async function readBlobDentists(): Promise<ClinicDentist[]> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  return (data as ClinicDentist[] | null) ?? [];
}

async function writeBlobDentists(dentists: ClinicDentist[]): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, dentists);
}

async function readStoredDentists(): Promise<ClinicDentist[]> {
  if (shouldUseNetlifyBlobs()) {
    return readBlobDentists();
  }
  return readLocalDentists();
}

async function writeStoredDentists(dentists: ClinicDentist[]): Promise<void> {
  if (shouldUseNetlifyBlobs()) {
    await writeBlobDentists(dentists);
  } else {
    await writeLocalDentists(dentists);
  }
}

async function seedDefaultsIfEmpty(): Promise<ClinicDentist[]> {
  const stored = await readStoredDentists();
  if (stored.length > 0) return stored;

  const seeded: ClinicDentist[] = DEFAULT_DENTISTS.map((dentist) => ({
    ...dentist,
    createdAt: new Date().toISOString(),
  }));
  await writeStoredDentists(seeded);
  return seeded;
}

export async function getAllDentists(): Promise<ClinicDentist[]> {
  return seedDefaultsIfEmpty();
}

export async function findDentistByIdWithRetry(
  id: string,
  attempts = 3
): Promise<ClinicDentist | undefined> {
  const dentistId = id.trim();
  if (!dentistId) return undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const dentists = await readStoredDentists();
    const list = dentists.length > 0 ? dentists : await seedDefaultsIfEmpty();
    const match = list.find((dentist) => dentist.id === dentistId);
    if (match) return match;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  return undefined;
}

function createUniqueId(name: string, dentists: ClinicDentist[]): string {
  const base = slugifyDentistName(name);
  if (!dentists.some((dentist) => dentist.id === base)) return base;

  let index = 2;
  while (dentists.some((dentist) => dentist.id === `${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

export async function addDentist(name: string): Promise<ClinicDentist> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new Error("Dentist name must be at least 2 characters.");
  }

  const stored = await readStoredDentists();
  const baseList = stored.length > 0 ? stored : await seedDefaultsIfEmpty();
  const duplicate = baseList.find(
    (dentist) => dentist.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    throw new Error("A dentist with this name already exists.");
  }

  const dentist: ClinicDentist = {
    id: createUniqueId(trimmed, baseList),
    name: trimmed,
    createdAt: new Date().toISOString(),
  };

  await writeStoredDentists([...baseList, dentist]);
  return dentist;
}

export async function deleteDentist(id: string): Promise<void> {
  const dentists = await getAllDentists();
  const dentist = dentists.find((entry) => entry.id === id);
  if (!dentist) {
    throw new Error("Dentist not found.");
  }

  const { getAllBookings } = await import("./bookings-store");
  const { getAllScheduleBlocks } = await import("./schedule-blocks");

  const [bookings, blocks] = await Promise.all([getAllBookings(), getAllScheduleBlocks()]);
  const hasBookings = bookings.some((booking) => booking.assignedDentistId === id);
  const hasBlocks = blocks.some((block) => block.providerId === id);

  if (hasBookings || hasBlocks) {
    throw new Error(
      "This dentist has appointments or leave dates on record. Remove leave blocks first, or keep the profile if past bookings exist."
    );
  }

  await writeStoredDentists(dentists.filter((entry) => entry.id !== id));
}

export async function getDentistById(id: string): Promise<ClinicDentist | undefined> {
  const dentists = await getAllDentists();
  return dentists.find((dentist) => dentist.id === id);
}

export async function getDentistName(id: string | undefined): Promise<string | undefined> {
  if (!id) return undefined;
  const dentists = await getAllDentists();
  return findDentistName(dentists, id);
}

export async function isValidDentistId(id: string): Promise<boolean> {
  const dentists = await getAllDentists();
  return isDentistIdValid(dentists, id);
}
