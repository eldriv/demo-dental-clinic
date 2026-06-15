import type { Booking } from "./bookings";
import { sortBookingsByDateTime } from "./admin-booking-filters";
import { getBookingStatusLabel } from "./booking-status";

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

export function groupBookingsByPatient(bookings: Booking[]): Map<string, Booking[]> {
  const groups = new Map<string, Booking[]>();

  for (const booking of bookings) {
    if (!isCountableBooking(booking)) continue;
    const email = normalizeEmail(booking.email);
    if (!email) continue;
    const existing = groups.get(email) ?? [];
    existing.push(booking);
    groups.set(email, existing);
  }

  for (const [email, patientBookings] of groups) {
    groups.set(email, sortBookingsByDateTime(patientBookings));
  }

  return groups;
}

function buildPatientSummary(email: string, patientBookings: Booking[]): PatientSummary {
  const latest = patientBookings[patientBookings.length - 1];
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
    ...new Set(completed.map((booking) => booking.service).filter(Boolean)),
  ];
  const clinicalNotes = extractClinicalNotes(patientBookings);

  return {
    email,
    name: latest.name,
    phone: latest.phone,
    visitCount: completed.length,
    clinicStatus: completed.length === 0 ? "new" : "returning",
    totalAppointments: patientBookings.length,
    firstSeenAt: patientBookings[0].createdAt,
    lastSeenAt: latest.updatedAt,
    lastVisit: completed[completed.length - 1],
    upcoming,
    history: patientBookings.slice(-5).reverse(),
    treatments,
    clinicalNotesCount: clinicalNotes.length,
    latestClinicalNote: clinicalNotes[0]?.note,
  };
}

function toTreatment(booking: Booking): PatientTreatment {
  return {
    date: booking.date,
    time: booking.time,
    service: booking.service,
    status: booking.status,
    statusLabel: getBookingStatusLabel(booking),
    dentist: booking.assignedDentistName ?? booking.preferredDentistName,
    visitNotes: booking.visitNotes?.trim() || undefined,
    internalNotes: booking.internalNotes?.trim() || undefined,
    token: booking.token,
  };
}

function extractClinicalNotes(patientBookings: Booking[]): PatientClinicalNote[] {
  return patientBookings
    .filter((booking) => booking.status === "completed" && booking.visitNotes?.trim())
    .map((booking) => ({
      date: booking.date,
      time: booking.time,
      service: booking.service,
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
  const clinicalNotes = extractClinicalNotes(patientBookings);

  return {
    ...summary,
    completedVisits,
    fullHistory: [...patientBookings].reverse(),
    treatmentHistory: [...patientBookings].reverse().map(toTreatment),
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
    const email = normalizeEmail(booking.email);
    if (!email.includes(normalized) && !booking.name.toLowerCase().includes(normalized)) {
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    const profile = getPatientRecord(bookings, email);
    if (profile) profiles.push(profile);
    if (profiles.length >= limit) break;
  }

  return profiles;
}
