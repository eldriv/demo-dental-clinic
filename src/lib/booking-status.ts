import type { Booking } from "./bookings";

/** Patient changed their date/time and staff should review/approve. */
export function isRescheduledPatient(booking: Booking): boolean {
  return booking.status === "rescheduled" && Boolean(booking.rescheduledByPatient);
}

export function needsStaffApproval(booking: Booking): boolean {
  return (
    booking.status === "pending" ||
    booking.status === "declined" ||
    isRescheduledPatient(booking)
  );
}

export function getBookingStatusLabel(booking: Booking): string {
  if (isRescheduledPatient(booking)) {
    return "Rescheduled Patient";
  }

  switch (booking.status) {
    case "pending":
      return "Pending";
    case "declined":
      return "Reschedule needed";
    case "confirmed":
      return "Confirmed";
    case "rescheduled":
      return "Rescheduled";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    default:
      return booking.status;
  }
}

export function getBookingStatusStyle(booking: Booking): string {
  if (isRescheduledPatient(booking)) {
    return "bg-blue-100 text-blue-800";
  }

  const styles: Record<Booking["status"], string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-primary/10 text-primary",
    rescheduled: "bg-blue-100 text-blue-700",
    declined: "bg-orange-100 text-orange-800",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-gray-100 text-gray-700",
  };

  return styles[booking.status];
}
