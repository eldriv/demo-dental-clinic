import type { Booking } from "./bookings";
import { sortBookingsByDateTime } from "./admin-booking-filters";
import { getBookingStatusLabel } from "./booking-status";
import {
  buildGroupMemberRows,
  getPatientNameOnBooking,
  getPatientPhoneOnBooking,
  getPatientServiceOnBooking,
  getBookingEndTime,
  isGroupBooking,
  normalizeGroupAttendees,
} from "./booking-group";
import type { GroupMemberRow } from "./booking-group";

export type PatientClinicStatus = "new" | "returning";

export interface PatientTreatment {
  date: string;
  time: string;
  service: string;
  status: Booking["status"];
  statusLabel: string;
  dentist?: string;
  visitNotes?: string;
  internalNotes?: string;
  token: string;
  isGroup?: boolean;
  endTime?: string;
  groupMembers?: GroupMemberRow[];
}

export interface PatientClinicalNote {
  date: string;
  time: string;
  service: string;
  dentist?: string;
  note: string;
  token: string;
}

export interface PatientProfile {
  email: string;
  name: string;
  phone: string;
  visitCount: number;
  lastVisit?: Booking;
  upcoming?: Booking;
  history: Booking[];
}

export interface PatientSummary extends PatientProfile {
  clinicStatus: PatientClinicStatus;
  totalAppointments: number;
  firstSeenAt: string;
  lastSeenAt: string;
  treatments: string[];
  clinicalNotesCount: number;
  latestClinicalNote?: string;
}

export interface PatientRecord extends PatientSummary {
  completedVisits: Booking[];
  fullHistory: Booking[];
  treatmentHistory: PatientTreatment[];
  clinicalNotes: PatientClinicalNote[];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isCountableBooking(booking: Booking): boolean {
  return booking.status !== "cancelled" && booking.status !== "declined";
}

function addPatientBooking(groups: Map<string, Booking[]>, email: string, booking: Booking) {
  const existing = groups.get(email) ?? [];
  if (!existing.some((entry) => entry.token === booking.token)) {
    existing.push(booking);
    groups.set(email, existing);
  }
}

export function groupBookingsByPatient(bookings: Booking[]): Map<string, Booking[]> {
  const groups = new Map<string, Booking[]>();

  for (const booking of bookings) {
    if (!isCountableBooking(booking)) continue;

    const organizerEmail = normalizeEmail(booking.email);
    if (organizerEmail) {
      addPatientBooking(groups, organizerEmail, booking);
    }

    if (isGroupBooking(booking)) {
      for (const attendee of normalizeGroupAttendees(booking.attendees)) {
        const attendeeEmail = normalizeEmail(attendee.email ?? "");
        if (!attendeeEmail) continue;
        addPatientBooking(groups, attendeeEmail, booking);
      }
    }
  }

  for (const [email, patientBookings] of groups) {
    groups.set(email, sortBookingsByDateTime(patientBookings));
  }

  return groups;
}

function resolvePatientContact(
  email: string,
  patientBookings: Booking[]
): { name: string; phone: string } {
  for (let index = patientBookings.length - 1; index >= 0; index -= 1) {
    const booking = patientBookings[index];
    const name = getPatientNameOnBooking(booking, email);
    const phone = getPatientPhoneOnBooking(booking, email);
    if (name) return { name, phone };
  }

  return { name: email, phone: "" };
}

function buildPatientSummary(email: string, patientBookings: Booking[]): PatientSummary {
  const contact = resolvePatientContact(email, patientBookings);
  const completed = patientBookings.filter((booking) => booking.status === "completed");
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = patientBookings.find(
    (booking) =>
      (booking.status === "confirmed" ||
        booking.status === "rescheduled" ||
        booking.status === "pending") &&
      booking.date >= today
  );
  const treatments = [
    ...new Set(
      completed.map((booking) => getPatientServiceOnBooking(booking, email)).filter(Boolean)
    ),
  ];
  const clinicalNotes = extractClinicalNotes(patientBookings, email);

  return {
    email,
    name: contact.name,
    phone: contact.phone,
    visitCount: completed.length,
    clinicStatus: completed.length === 0 ? "new" : "returning",
    totalAppointments: patientBookings.length,
    firstSeenAt: patientBookings[0].createdAt,
    lastSeenAt: patientBookings[patientBookings.length - 1].updatedAt,
    lastVisit: completed[completed.length - 1],
    upcoming,
    history: patientBookings.slice(-5).reverse(),
    treatments,
    clinicalNotesCount: clinicalNotes.length,
    latestClinicalNote: clinicalNotes[0]?.note,
  };
}

function toTreatment(booking: Booking, patientEmail: string): PatientTreatment {
  const group = isGroupBooking(booking);
  return {
    date: booking.date,
    time: booking.time,
    service: getPatientServiceOnBooking(booking, patientEmail),
    status: booking.status,
    statusLabel: getBookingStatusLabel(booking),
    dentist: booking.assignedDentistName ?? booking.preferredDentistName,
    visitNotes: booking.visitNotes?.trim() || undefined,
    internalNotes: booking.internalNotes?.trim() || undefined,
    token: booking.token,
    isGroup: group,
    endTime: group ? getBookingEndTime(booking) : undefined,
    groupMembers: group ? buildGroupMemberRows(booking) : undefined,
  };
}

function extractClinicalNotes(
  patientBookings: Booking[],
  patientEmail: string
): PatientClinicalNote[] {
  return patientBookings
    .filter((booking) => booking.status === "completed" && booking.visitNotes?.trim())
    .map((booking) => ({
      date: booking.date,
      time: booking.time,
      service: getPatientServiceOnBooking(booking, patientEmail),
      dentist: booking.assignedDentistName ?? booking.preferredDentistName,
      note: booking.visitNotes!.trim(),
      token: booking.token,
    }))
    .reverse();
}

export function isNewToClinic(profile: Pick<PatientProfile, "visitCount">): boolean {
  return profile.visitCount === 0;
}

export function getPatientProfile(bookings: Booking[], email: string): PatientProfile | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const patientBookings = groupBookingsByPatient(bookings).get(normalized);
  if (!patientBookings || patientBookings.length === 0) return null;

  const summary = buildPatientSummary(normalized, patientBookings);
  return {
    email: summary.email,
    name: summary.name,
    phone: summary.phone,
    visitCount: summary.visitCount,
    lastVisit: summary.lastVisit,
    upcoming: summary.upcoming,
    history: summary.history,
  };
}

export function getPatientRecord(bookings: Booking[], email: string): PatientRecord | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const patientBookings = groupBookingsByPatient(bookings).get(normalized);
  if (!patientBookings || patientBookings.length === 0) return null;

  const summary = buildPatientSummary(normalized, patientBookings);
  const completedVisits = patientBookings.filter((booking) => booking.status === "completed");
  const clinicalNotes = extractClinicalNotes(patientBookings, normalized);

  return {
    ...summary,
    completedVisits,
    fullHistory: [...patientBookings].reverse(),
    treatmentHistory: [...patientBookings].reverse().map((booking) => toTreatment(booking, normalized)),
    clinicalNotes,
  };
}

export function listPatientSummaries(
  bookings: Booking[],
  options: { query?: string; status?: PatientClinicStatus | "all" } = {}
): PatientSummary[] {
  const { query = "", status = "all" } = options;
  const normalizedQuery = query.trim().toLowerCase();

  let summaries = [...groupBookingsByPatient(bookings).entries()].map(([email, patientBookings]) =>
    buildPatientSummary(email, patientBookings)
  );

  if (normalizedQuery.length >= 1) {
    summaries = summaries.filter(
      (patient) =>
        patient.name.toLowerCase().includes(normalizedQuery) ||
        patient.email.includes(normalizedQuery) ||
        patient.phone.includes(normalizedQuery)
    );
  }

  if (status === "new") {
    summaries = summaries.filter((patient) => patient.clinicStatus === "new");
  } else if (status === "returning") {
    summaries = summaries.filter((patient) => patient.clinicStatus === "returning");
  }

  return summaries.sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name);
    if (nameCompare !== 0) return nameCompare;
    return a.email.localeCompare(b.email);
  });
}

export function findPatientByEmailPrefix(
  bookings: Booking[],
  query: string,
  limit = 8
): PatientSummary[] {
  const normalized = normalizeEmail(query);
  if (normalized.length < 2) return [];

  const seen = new Set<string>();
  const profiles: PatientSummary[] = [];

  for (const booking of bookings) {
    const candidates: Array<{ email: string; name: string }> = [
      { email: normalizeEmail(booking.email), name: booking.name },
    ];

    if (isGroupBooking(booking)) {
      for (const attendee of normalizeGroupAttendees(booking.attendees)) {
        const email = normalizeEmail(attendee.email ?? "");
        if (email) candidates.push({ email, name: attendee.name });
      }
    }

    for (const candidate of candidates) {
      if (!candidate.email) continue;
      if (
        !candidate.email.includes(normalized) &&
        !candidate.name.toLowerCase().includes(normalized)
      ) {
        continue;
      }
      if (seen.has(candidate.email)) continue;
      seen.add(candidate.email);
      const profile = getPatientRecord(bookings, candidate.email);
      if (profile) profiles.push(profile);
      if (profiles.length >= limit) return profiles;
    }
  }

  return profiles;
}
