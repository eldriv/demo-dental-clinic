export type BookingSource = "web" | "staff";

export interface BookingAuditEntry {
  at: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface Booking {
  id: string;
  token: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled" | "rescheduled" | "declined" | "completed";
  createdAt: string;
  updatedAt: string;
  /** Where the booking was created. */
  source?: BookingSource;
  preferredDentistId?: string;
  preferredDentistName?: string;
  assignedDentistId?: string;
  assignedDentistName?: string;
  rescheduledByPatient?: boolean;
  lateNoticeAt?: string;
  lateNoticeMinutes?: number;
  lateNoticeNote?: string;
  attendanceConfirmed?: boolean;
  attendanceConfirmedAt?: string;
  /** Patient checked in on arrival (from manage link). */
  checkedInAt?: string;
  completedAt?: string;
  /** Staff-only notes visible in admin. */
  internalNotes?: string;
  /** Dentist/staff notes after visit. */
  visitNotes?: string;
  followUpNeeded?: boolean;
  noShow?: boolean;
  reminder24hSentAt?: string;
  reminder2hSentAt?: string;
  auditLog?: BookingAuditEntry[];
}

export interface CreateBookingInput {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  dentistId?: string;
}

export interface StaffCreateBookingInput extends CreateBookingInput {
  assignedDentistId: string;
  autoConfirm?: boolean;
  internalNotes?: string;
}

export interface RescheduleBookingInput {
  date: string;
  time: string;
}

export const BOOKING_VALIDATION = {
  name: { min: 2, max: 100 },
  phone: { min: 7, max: 20 },
  email: { max: 254 },
} as const;

export function getBookingSource(booking: Booking): BookingSource {
  return booking.source ?? "web";
}
