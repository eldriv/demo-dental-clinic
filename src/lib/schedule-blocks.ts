import { getStore } from "@netlify/blobs";

import type { ScheduleBlock } from "@/lib/schedule-block-utils";
import { shouldUseNetlifyBlobs } from "@/lib/storage-env";
export type { ScheduleBlock } from "@/lib/schedule-block-utils";
export { isDateBlocked, isClinicWideDateBlocked, getDentistLeaveNotes } from "@/lib/schedule-block-utils";

const BLOB_STORE = "bookings";
const BLOB_KEY = "schedule-blocks";

async function readLocalBlocks(): Promise<ScheduleBlock[]> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const file = path.join(process.cwd(), ".data", "bookings", "schedule-blocks.json");

  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data) as ScheduleBlock[];
  } catch {
    return [];
  }
}

async function writeLocalBlocks(blocks: ScheduleBlock[]): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data", "bookings");
  const file = path.join(dir, "schedule-blocks.json");

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(blocks, null, 2), "utf-8");
}

async function readBlobBlocks(): Promise<ScheduleBlock[]> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  return (data as ScheduleBlock[] | null) ?? [];
}

async function writeBlobBlocks(blocks: ScheduleBlock[]): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, blocks);
}

export async function getAllScheduleBlocks(): Promise<ScheduleBlock[]> {
  if (shouldUseNetlifyBlobs()) {
    return readBlobBlocks();
  }
  return readLocalBlocks();
}

export async function saveScheduleBlock(block: ScheduleBlock): Promise<void> {
  const blocks = await getAllScheduleBlocks();
  blocks.push(block);
  if (shouldUseNetlifyBlobs()) {
    await writeBlobBlocks(blocks);
  } else {
    await writeLocalBlocks(blocks);
  }
}

export async function deleteScheduleBlock(id: string): Promise<boolean> {
  const blocks = await getAllScheduleBlocks();
  const next = blocks.filter((block) => block.id !== id);
  if (next.length === blocks.length) return false;

  if (shouldUseNetlifyBlobs()) {
    await writeBlobBlocks(next);
  } else {
    await writeLocalBlocks(next);
  }
  return true;
}
