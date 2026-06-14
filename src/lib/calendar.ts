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

function parseTimeToDate(date: string, time: string): { start: Date; end: Date } {
  const [timePart, period] = time.split(" ");
  const [hours, minutes] = timePart.split(":").map(Number);
  let hour = hours;
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  const start = new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
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
    const { start, end } = parseTimeToDate(booking.date, booking.time);

    const dentistName = booking.assignedDentistName;
    const descriptionLines = [
      `Patient: ${booking.name}`,
      `Email: ${booking.email}`,
      `Phone: ${booking.phone}`,
      `Service: ${booking.service}`,
    ];
    if (dentistName) {
      descriptionLines.push(`Dentist: ${dentistName}`);
    }

    const event = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      requestBody: {
        summary: `${booking.service} — ${booking.name}`,
        description: descriptionLines.join("\n"),
        start: { dateTime: start.toISOString(), timeZone: "America/Toronto" },
        end: { dateTime: end.toISOString(), timeZone: "America/Toronto" },
        location: site.location.full,
      },
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
    const { start, end } = parseTimeToDate(booking.date, booking.time);

    await calendar.events.patch({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      eventId: booking.calendarEventId,
      requestBody: {
        start: { dateTime: start.toISOString(), timeZone: "America/Toronto" },
        end: { dateTime: end.toISOString(), timeZone: "America/Toronto" },
      },
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
