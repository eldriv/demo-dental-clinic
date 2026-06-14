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
  /** Set by staff when approving */
  assignedDentistId?: string;
  assignedDentistName?: string;
  /** Set when the patient picks a new date/time from their manage link. */
  rescheduledByPatient?: boolean;
}

export interface CreateBookingInput {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
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
