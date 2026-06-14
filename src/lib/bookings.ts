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
  calendarEventId?: string;
  /** Patient's dentist preference from the booking form. */
  preferredDentistId?: string;
  preferredDentistName?: string;
  /** Set by staff when approving */
  assignedDentistId?: string;
  assignedDentistName?: string;
  /** Set when the patient picks a new date/time from their manage link. */
  rescheduledByPatient?: boolean;
  /** Patient reported they will be late (ISO timestamp). */
  lateNoticeAt?: string;
  /** Estimated minutes late, if provided by patient. */
  lateNoticeMinutes?: number;
  /** Optional note from patient about late arrival. */
  lateNoticeNote?: string;
  /** Reception confirmed patient is still coming after a no-show alert. */
  attendanceConfirmed?: boolean;
  /** When reception confirmed attendance. */
  attendanceConfirmedAt?: string;
  /** When staff marked the visit as completed. */
  completedAt?: string;
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

export interface RescheduleBookingInput {
  date: string;
  time: string;
}

export const BOOKING_VALIDATION = {
  name: { min: 2, max: 100 },
  phone: { min: 7, max: 20 },
  email: { max: 254 },
} as const;
