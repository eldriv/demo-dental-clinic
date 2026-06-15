import { getStore } from "@netlify/blobs";
import type { Booking } from "./bookings";
import { shouldUseNetlifyBlobs } from "./storage-env";

const BLOB_STORE = "bookings";
const BLOB_KEY = "all-bookings";
const CACHE_TTL_MS = 15_000;

let bookingsCache: { data: Booking[]; at: number } | null = null;

function invalidateBookingsCache(): void {
  bookingsCache = null;
}

async function readLocalBookings(): Promise<Booking[]> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data", "bookings");
  const file = path.join(dir, "bookings.json");

  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data) as Booking[];
  } catch {
    return [];
  }
}

async function writeLocalBookings(bookings: Booking[]): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data", "bookings");
  const file = path.join(dir, "bookings.json");

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(bookings, null, 2), "utf-8");
}

async function readBlobBookings(): Promise<Booking[]> {
  const store = getStore(BLOB_STORE);
  const data = await store.get(BLOB_KEY, { type: "json" });
  return (data as Booking[] | null) ?? [];
}

async function writeBlobBookings(bookings: Booking[]): Promise<void> {
  const store = getStore(BLOB_STORE);
  await store.setJSON(BLOB_KEY, bookings);
}

export async function getAllBookings(): Promise<Booking[]> {
  const now = Date.now();
  if (bookingsCache && now - bookingsCache.at < CACHE_TTL_MS) {
    return bookingsCache.data;
  }

  const data = shouldUseNetlifyBlobs() ? await readBlobBookings() : await readLocalBookings();
  bookingsCache = { data, at: now };
  return data;
}

export async function saveAllBookings(bookings: Booking[]): Promise<void> {
  if (shouldUseNetlifyBlobs()) {
    await writeBlobBookings(bookings);
  } else {
    await writeLocalBookings(bookings);
  }
  invalidateBookingsCache();
}

export async function getBookingByToken(token: string): Promise<Booking | null> {
  const bookings = await getAllBookings();
  return bookings.find((b) => b.token === token) ?? null;
}

export async function saveBooking(booking: Booking): Promise<void> {
  const bookings = await getAllBookings();
  bookings.push(booking);
  await saveAllBookings(bookings);
}

export async function updateBooking(
  token: string,
  updates: Partial<Booking>
): Promise<Booking | null> {
  const bookings = await getAllBookings();
  const index = bookings.findIndex((b) => b.token === token);
  if (index === -1) return null;

  bookings[index] = {
    ...bookings[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await saveAllBookings(bookings);
  return bookings[index];
}
