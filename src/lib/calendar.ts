import { google } from "googleapis";
import type { Booking } from "./bookings";
import { site } from "@/content";

function isCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.GOOGLE_CALENDAR_ID
  );
}

function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/auth/google/callback`
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

function getClinicTimeZone(): string {
  return process.env.CLINIC_TIMEZONE?.trim() || "Asia/Manila";
}

/** Wall-clock start/end for Google Calendar (no UTC conversion). */
function parseBookingDateTime(
  date: string,
  time: string
): { start: string; end: string } {
  const [timePart, period] = time.split(" ");
  const [hours, minutes] = timePart.split(":").map(Number);
  let hour = hours;
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  const startMinutes = hour * 60 + minutes;
  const endMinutes = startMinutes + 60;
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;

  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    start: `${date}T${pad(hour)}:${pad(minutes)}:00`,
    end: `${date}T${pad(endHour)}:${pad(endMin)}:00`,
  };
}

function getCalendarDentistName(booking: Booking): string | undefined {
  return booking.assignedDentistName ?? booking.preferredDentistName ?? undefined;
}

export function buildCalendarEventSummary(booking: Booking): string {
  const dentistName = getCalendarDentistName(booking);
  const visit = `${booking.service} — ${booking.name}`;
  return dentistName ? `${dentistName} · ${visit}` : visit;
}

export function buildCalendarEventDescription(booking: Booking): string {
  const dentistName = getCalendarDentistName(booking);
  const descriptionLines = [
    `Patient: ${booking.name}`,
    `Email: ${booking.email}`,
    `Phone: ${booking.phone}`,
    `Service: ${booking.service}`,
  ];
  if (dentistName) {
    descriptionLines.push(`Dentist: ${dentistName}`);
  }
  return descriptionLines.join("\n");
}

function buildCalendarEventBody(booking: Booking) {
  const { start, end } = parseBookingDateTime(booking.date, booking.time);
  const timeZone = getClinicTimeZone();

  return {
    summary: buildCalendarEventSummary(booking),
    description: buildCalendarEventDescription(booking),
    start: { dateTime: start, timeZone },
    end: { dateTime: end, timeZone },
    location: site.location.full,
  };
}

export async function createCalendarEvent(
  booking: Booking
): Promise<{ eventId?: string; error?: string }> {
  if (!isCalendarConfigured()) {
    return { error: "Google Calendar not configured" };
  }

  try {
    const auth = getOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth });

    const event = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      requestBody: buildCalendarEventBody(booking),
    });

    return { eventId: event.data.id ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calendar event creation failed";
    return { error: message };
  }
}

export async function updateCalendarEvent(
  booking: Booking
): Promise<{ success: boolean; error?: string }> {
  if (!isCalendarConfigured() || !booking.calendarEventId) {
    return { success: false, error: "Calendar not configured or no event ID" };
  }

  try {
    const auth = getOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.patch({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      eventId: booking.calendarEventId,
      requestBody: buildCalendarEventBody(booking),
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calendar update failed";
    return { success: false, error: message };
  }
}

export async function deleteCalendarEvent(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isCalendarConfigured()) {
    return { success: false, error: "Calendar not configured" };
  }

  try {
    const auth = getOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      eventId,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calendar delete failed";
    return { success: false, error: message };
  }
}

export function getGoogleAuthUrl(): string | null {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    prompt: "consent",
  });
}

export async function exchangeCodeForTokens(
  code: string
): Promise<{ refreshToken?: string; error?: string }> {
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return { refreshToken: tokens.refresh_token ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token exchange failed";
    return { error: message };
  }
}

export function isCalendarIntegrationConfigured(): boolean {
  return isCalendarConfigured();
}
