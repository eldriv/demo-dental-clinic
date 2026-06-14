import { getBookingByToken, updateBooking, getAllBookings } from "@/lib/bookings-store";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/calendar";
import {
  sendBookingApprovedEmail,
  sendBookingDeclinedEmail,
  sendCancellationEmails,
} from "@/lib/email";
import type { Booking } from "@/lib/bookings";
import { buildManageUrl } from "@/lib/site-url";
import { validateSlotBooking, ANY_DENTIST_ID } from "@/lib/booking-availability";
import { getAllDentists, getDentistById, isValidDentistId } from "@/lib/dentists-store";
import { isAnyDentist } from "@/lib/dentist-availability";
import { getClinicSettings } from "@/lib/clinic-settings-store";
import { getAllScheduleBlocks } from "@/lib/schedule-blocks";
import { needsStaffApproval } from "@/lib/booking-status";
import { isActiveAppointment } from "@/lib/appointment-attendance";
import { sortBookingsByDateTime } from "@/lib/admin-booking-filters";

export {
  filterTodayBookings,
  getTodayDateString,
  isTodayVisit,
} from "@/lib/admin-booking-filters";

export async function approveBooking(
  token: string,
  siteUrl?: string,
  options?: { assignedDentistId?: string; requireDentist?: boolean }
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };
  if (booking.status === "cancelled") return { error: "Booking is cancelled." };
  if (booking.status === "completed") return { error: "Booking is already completed." };
  if (booking.status === "confirmed") return { booking };
  if (booking.status === "rescheduled" && !booking.rescheduledByPatient) {
    return { booking };
  }
  if (!needsStaffApproval(booking)) {
    return { booking };
  }

  const assignedDentistId =
    options?.assignedDentistId?.trim() ||
    booking.preferredDentistId ||
    undefined;

  if (options?.requireDentist && !assignedDentistId) {
    return { error: "Please select a dentist before approving." };
  }
  if (assignedDentistId && !(await isValidDentistId(assignedDentistId))) {
    return { error: "Invalid dentist selected." };
  }

  const assignedDentist = assignedDentistId
    ? await getDentistById(assignedDentistId)
    : undefined;

  const [settings, bookings, blocks, dentists] = await Promise.all([
    getClinicSettings(),
    getAllBookings(),
    getAllScheduleBlocks(),
    getAllDentists(),
  ]);

  const slotError = validateSlotBooking({
    date: booking.date,
    time: booking.time,
    settings,
    bookings,
    blocks,
    dentists,
    dentistId: assignedDentistId ?? ANY_DENTIST_ID,
    excludeToken: token,
  });

  if (slotError) {
    return { error: slotError };
  }

  const calendarResult = await createCalendarEvent({
    ...booking,
    assignedDentistId: assignedDentistId ?? booking.assignedDentistId,
  });
  const updates: Partial<Booking> = {
    status: "confirmed",
    rescheduledByPatient: false,
  };
  if (assignedDentistId) {
    updates.assignedDentistId = assignedDentistId;
    updates.assignedDentistName = assignedDentist?.name;
  }
  if (calendarResult.eventId) {
    updates.calendarEventId = calendarResult.eventId;
  }

  const updated = await updateBooking(token, updates);
  if (!updated) return { error: "Failed to update booking." };

  await sendBookingApprovedEmail(updated, siteUrl);
  return { booking: updated };
}

export async function declineBooking(
  token: string,
  siteUrl?: string,
  note?: string
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };
  if (booking.status === "cancelled" || booking.status === "completed") {
    return { error: "Booking cannot be declined." };
  }

  const updated = await updateBooking(token, { status: "declined" });
  if (!updated) return { error: "Failed to update booking." };

  await sendBookingDeclinedEmail(updated, siteUrl, note);
  return { booking: updated };
}

export async function completeBooking(
  token: string
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };
  if (booking.status === "cancelled") return { error: "Booking is cancelled." };
  if (booking.status === "pending" || booking.status === "declined") {
    return { error: "Approve the booking before marking it completed." };
  }

  const updated = await updateBooking(token, {
    status: "completed",
    completedAt: new Date().toISOString(),
  });
  if (!updated) return { error: "Failed to update booking." };
  return { booking: updated };
}

export async function cancelBookingAdmin(
  token: string,
  siteUrl?: string
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };
  if (booking.status === "cancelled") return { booking };

  const updated = await updateBooking(token, { status: "cancelled" });
  if (!updated) return { error: "Failed to cancel booking." };

  if (updated.calendarEventId) {
    await deleteCalendarEvent(updated.calendarEventId);
  }

  await sendCancellationEmails(updated, siteUrl);

  return { booking: updated };
}

export async function confirmPatientAttendance(
  token: string
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };
  if (!isActiveAppointment(booking)) {
    return { error: "Only confirmed appointments can be marked as still attending." };
  }

  const now = new Date().toISOString();
  const updated = await updateBooking(token, {
    attendanceConfirmed: true,
    attendanceConfirmedAt: now,
  });

  if (!updated) return { error: "Failed to update booking." };
  return { booking: updated };
}

export function getManageLink(token: string, siteUrl?: string): string {
  return buildManageUrl(token, siteUrl);
}

export async function listBookingsForAdmin(): Promise<Booking[]> {
  return sortBookingsByDateTime(await getAllBookings());
}
