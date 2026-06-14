import { getStore } from "@netlify/blobs";
import type { Booking } from "./bookings";

const BLOB_STORE = "bookings";
const BLOB_KEY = "all-bookings";

function isNetlifyProduction(): boolean {
  return (
    process.env.NETLIFY === "true" ||
    Boolean(process.env.NETLIFY_BLOBS_CONTEXT) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
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
  if (isNetlifyProduction()) {
    return readBlobBookings();
  }
  return readLocalBookings();
}

export async function saveAllBookings(bookings: Booking[]): Promise<void> {
  if (isNetlifyProduction()) {
    await writeBlobBookings(bookings);
  } else {
    await writeLocalBookings(bookings);
  }
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
