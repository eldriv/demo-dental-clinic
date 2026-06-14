import { getStore } from "@netlify/blobs";
import type { ClinicOperatingSettings } from "./clinic-settings";
import {
  DEFAULT_CLINIC_SETTINGS,
  buildHoursDisplay,
  mergeClinicSettings,
} from "./clinic-settings";
import { shouldUseNetlifyBlobs } from "./storage-env";

const BLOB_STORE = "bookings";
const BLOB_KEY = "clinic-settings";

async function readLocalSettings(): Promise<ClinicOperatingSettings | null> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const file = path.join(process.cwd(), ".data", "bookings", "clinic-settings.json");

  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data) as ClinicOperatingSettings;
  } catch {
    return null;
  }
}

async function writeLocalSettings(settings: ClinicOperatingSettings): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data", "bookings");
  const file = path.join(dir, "clinic-settings.json");

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(settings, null, 2), "utf-8");
}

async function readBlobSettings(): Promise<ClinicOperatingSettings | null> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  return (data as ClinicOperatingSettings | null) ?? null;
}

async function writeBlobSettings(settings: ClinicOperatingSettings): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, settings);
}

export async function getStoredClinicSettings(): Promise<ClinicOperatingSettings | null> {
  if (shouldUseNetlifyBlobs()) {
    return readBlobSettings();
  }
  return readLocalSettings();
}

export async function saveClinicSettings(
  settings: ClinicOperatingSettings
): Promise<ClinicOperatingSettings> {
  if (shouldUseNetlifyBlobs()) {
    await writeBlobSettings(settings);
  } else {
    await writeLocalSettings(settings);
  }
  return settings;
}

export async function getClinicSettings(): Promise<ClinicOperatingSettings> {
  const stored = await getStoredClinicSettings();
  return mergeClinicSettings(stored);
}

export async function getClinicHoursDisplay() {
  return buildHoursDisplay(await getClinicSettings());
}

export { DEFAULT_CLINIC_SETTINGS };
