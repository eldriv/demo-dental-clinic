import { v4 as uuidv4 } from "uuid";
import { getBookingByToken, updateBooking, getAllBookings, saveBooking } from "@/lib/bookings-store";
import {
  sendBookingApprovedEmail,
  sendBookingDeclinedEmail,
  sendCancellationEmails,
  sendBookingRequestEmails,
} from "@/lib/email";
import type { Booking, StaffCreateBookingInput } from "@/lib/bookings";
import { BOOKING_VALIDATION } from "@/lib/bookings";
import { buildManageUrl } from "@/lib/site-url";
import { validateSlotBooking, ANY_DENTIST_ID } from "@/lib/booking-availability";
import {
  isGroupBooking,
  normalizeStaffGroupBookingInput,
  validateGroupSlotBooking,
} from "@/lib/booking-group";
import { isAnyDentist } from "@/lib/dentist-availability";
import { getAllDentists, getDentistById, isValidDentistId } from "@/lib/dentists-store";
import { getClinicSettings } from "@/lib/clinic-settings-store";
import { getAllScheduleBlocks } from "@/lib/schedule-blocks";
import { needsStaffApproval } from "@/lib/booking-status";
import { isActiveAppointment } from "@/lib/appointment-attendance";
import { sortBookingsByDateTime, getTodayDateString, filterTodayBookings, isTodayVisit } from "@/lib/admin-booking-filters";
import { appendAuditEntry } from "@/lib/booking-audit";

export {
  filterTodayBookings,
  getTodayDateString,
  isTodayVisit,
} from "@/lib/admin-booking-filters";

type ActorOptions = { actor?: string };

function withAudit(
  booking: Booking,
  updates: Partial<Booking>,
  actor: string,
  action: string,
  detail?: string
): Partial<Booking> {
  return {
    ...updates,
    auditLog: appendAuditEntry(booking, { actor, action, detail }),
  };
}

export async function approveBooking(
  token: string,
  siteUrl?: string,
  options?: { assignedDentistId?: string; requireDentist?: boolean; actor?: string }
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

  const slotError = isGroupBooking(booking)
    ? validateGroupSlotBooking({
        date: booking.date,
        startTime: booking.time,
        endTime: booking.endTime ?? booking.time,
        settings,
        bookings,
        blocks,
        dentists,
        dentistId: assignedDentistId ?? ANY_DENTIST_ID,
        excludeToken: token,
      })
    : validateSlotBooking({
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

  const actor = options?.actor ?? "staff";
  const updates = withAudit(
    booking,
    {
      status: "confirmed",
      rescheduledByPatient: false,
      ...(assignedDentistId
        ? {
            assignedDentistId,
            assignedDentistName: assignedDentist?.name,
          }
        : {}),
    },
    actor,
    "approved",
    assignedDentist?.name
  );

  const updated = await updateBooking(token, updates);
  if (!updated) return { error: "Failed to update booking." };

  await sendBookingApprovedEmail(updated, siteUrl);
  return { booking: updated };
}

export async function declineBooking(
  token: string,
  siteUrl?: string,
  note?: string,
  options?: ActorOptions
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };
  if (booking.status === "cancelled" || booking.status === "completed") {
    return { error: "Booking cannot be declined." };
  }

  const updated = await updateBooking(
    token,
    withAudit(booking, { status: "declined" }, options?.actor ?? "staff", "declined", note)
  );
  if (!updated) return { error: "Failed to update booking." };

  await sendBookingDeclinedEmail(updated, siteUrl, note);
  return { booking: updated };
}

export async function completeBooking(
  token: string,
  options?: ActorOptions & { visitNotes?: string }
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };
  if (booking.status === "cancelled") return { error: "Booking is cancelled." };
  if (booking.status === "pending" || booking.status === "declined") {
    return { error: "Approve the booking before marking it completed." };
  }

  const updated = await updateBooking(
    token,
    withAudit(
      booking,
      {
        status: "completed",
        completedAt: new Date().toISOString(),
        ...(options?.visitNotes !== undefined ? { visitNotes: options.visitNotes.trim() } : {}),
      },
      options?.actor ?? "staff",
      "completed"
    )
  );
  if (!updated) return { error: "Failed to update booking." };
  return { booking: updated };
}

export async function reassignBookingDentist(
  token: string,
  assignedDentistId: string,
  options?: ActorOptions
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };
  if (booking.status === "cancelled" || booking.status === "declined") {
    return { error: "Cannot reassign dentist on a cancelled or declined booking." };
  }
  if (booking.status === "pending") {
    return { error: "Approve the booking first, or change the dentist during approval." };
  }

  const dentistId = assignedDentistId.trim();
  if (!dentistId) return { error: "Please select a dentist." };
  if (!(await isValidDentistId(dentistId))) {
    return { error: "Invalid dentist selected." };
  }
  if (booking.assignedDentistId === dentistId) {
    return { booking };
  }

  const assignedDentist = await getDentistById(dentistId);
  if (!assignedDentist) return { error: "Dentist not found." };

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
    dentistId,
    excludeToken: token,
  });

  if (slotError) {
    return { error: slotError };
  }

  const updated = await updateBooking(
    token,
    withAudit(
      booking,
      {
        assignedDentistId: dentistId,
        assignedDentistName: assignedDentist.name,
      },
      options?.actor ?? "staff",
      "reassigned-dentist",
      assignedDentist.name
    )
  );
  if (!updated) return { error: "Failed to update booking." };

  return { booking: updated };
}

export async function cancelBookingAdmin(
  token: string,
  siteUrl?: string,
  options?: ActorOptions
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };
  if (booking.status === "cancelled") return { booking };

  const updated = await updateBooking(
    token,
    withAudit(booking, { status: "cancelled" }, options?.actor ?? "staff", "cancelled")
  );
  if (!updated) return { error: "Failed to cancel booking." };

  await sendCancellationEmails(updated, siteUrl);
  return { booking: updated };
}

export async function confirmPatientAttendance(
  token: string,
  options?: ActorOptions
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };
  if (!isActiveAppointment(booking)) {
    return { error: "Only confirmed appointments can be marked as still attending." };
  }

  const now = new Date().toISOString();
  const updated = await updateBooking(
    token,
    withAudit(
      booking,
      {
        attendanceConfirmed: true,
        attendanceConfirmedAt: now,
      },
      options?.actor ?? "staff",
      "attendance-confirmed"
    )
  );

  if (!updated) return { error: "Failed to update booking." };
  return { booking: updated };
}

export async function markBookingNoShow(
  token: string,
  options?: ActorOptions
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };
  if (!isActiveAppointment(booking) && booking.status !== "completed") {
    return { error: "Only active appointments can be marked as no-show." };
  }

  const updated = await updateBooking(
    token,
    withAudit(
      booking,
      { noShow: true, status: "cancelled" },
      options?.actor ?? "staff",
      "no-show"
    )
  );
  if (!updated) return { error: "Failed to update booking." };

  return { booking: updated };
}

export async function updateBookingInternalNotes(
  token: string,
  internalNotes: string,
  options?: ActorOptions
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };

  const updated = await updateBooking(
    token,
    withAudit(
      booking,
      { internalNotes: internalNotes.trim().slice(0, 2000) },
      options?.actor ?? "staff",
      "internal-notes-updated"
    )
  );
  if (!updated) return { error: "Failed to update notes." };
  return { booking: updated };
}

export async function updateBookingVisitNotes(
  token: string,
  visitNotes: string,
  options?: ActorOptions
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };

  const updated = await updateBooking(
    token,
    withAudit(
      booking,
      { visitNotes: visitNotes.trim().slice(0, 2000) },
      options?.actor ?? "staff",
      "visit-notes-updated"
    )
  );
  if (!updated) return { error: "Failed to update visit notes." };
  return { booking: updated };
}

export async function setBookingFollowUp(
  token: string,
  followUpNeeded: boolean,
  options?: ActorOptions
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };

  const updated = await updateBooking(
    token,
    withAudit(
      booking,
      { followUpNeeded },
      options?.actor ?? "staff",
      followUpNeeded ? "follow-up-flagged" : "follow-up-cleared"
    )
  );
  if (!updated) return { error: "Failed to update follow-up flag." };
  return { booking: updated };
}

export async function patientCheckIn(
  token: string
): Promise<{ booking?: Booking; error?: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { error: "Booking not found." };
  if (!isActiveAppointment(booking)) {
    return { error: "Check-in is only available for confirmed appointments on the day of your visit." };
  }

  const today = getTodayDateString();
  if (booking.date !== today) {
    return { error: "Check-in opens on the day of your appointment." };
  }

  if (booking.checkedInAt) {
    return { booking };
  }

  const updated = await updateBooking(
    token,
    withAudit(booking, { checkedInAt: new Date().toISOString() }, "patient", "checked-in")
  );
  if (!updated) return { error: "Failed to check in." };
  return { booking: updated };
}

function validateStaffBookingFields(body: StaffCreateBookingInput): string | null {
  if (!body.name?.trim() || body.name.trim().length < BOOKING_VALIDATION.name.min) {
    return "Please provide a valid name.";
  }
  if (!body.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return "Please provide a valid email address.";
  }
  if (!body.phone?.trim() || body.phone.trim().length < BOOKING_VALIDATION.phone.min) {
    return "Please provide a valid phone number.";
  }
  if (!body.date?.trim() || !body.time?.trim()) return "Please select date and time.";
  if (!body.assignedDentistId?.trim()) return "Please assign a dentist.";

  if (body.bookingKind === "group") {
    if (!body.endTime?.trim()) return "Please select an end time for the group block.";
    return null;
  }

  if (!body.service?.trim()) return "Please select a service.";
  return null;
}

export async function createStaffBooking(
  body: StaffCreateBookingInput,
  siteUrl?: string,
  options?: ActorOptions
): Promise<{ booking?: Booking; error?: string }> {
  const fieldError = validateStaffBookingFields(body);
  if (fieldError) return { error: fieldError };

  const isGroup = body.bookingKind === "group";
  let normalizedBody = body;
  if (isGroup) {
    const normalized = normalizeStaffGroupBookingInput(body);
    if ("error" in normalized) return { error: normalized.error };
    normalizedBody = normalized;
  }

  const assignedDentistId = normalizedBody.assignedDentistId.trim();
  if (!(await isValidDentistId(assignedDentistId))) {
    return { error: "Invalid dentist selected." };
  }

  const assignedDentist = await getDentistById(assignedDentistId);
  if (!assignedDentist) return { error: "Dentist not found." };

  const [settings, bookings, blocks, dentists] = await Promise.all([
    getClinicSettings(),
    getAllBookings(),
    getAllScheduleBlocks(),
    getAllDentists(),
  ]);

  const slotError = isGroup
    ? validateGroupSlotBooking({
        date: normalizedBody.date,
        startTime: normalizedBody.time,
        endTime: normalizedBody.endTime ?? normalizedBody.time,
        settings,
        bookings,
        blocks,
        dentists,
        dentistId: assignedDentistId,
      })
    : validateSlotBooking({
        date: normalizedBody.date,
        time: normalizedBody.time,
        settings,
        bookings,
        blocks,
        dentists,
        dentistId: assignedDentistId,
      });

  if (slotError) return { error: slotError };

  const now = new Date().toISOString();
  const token = uuidv4();
  const autoConfirm = normalizedBody.autoConfirm !== false;
  const actor = options?.actor ?? "staff";

  const booking: Booking = {
    id: uuidv4(),
    token,
    name: normalizedBody.name.trim(),
    email: normalizedBody.email.trim().toLowerCase(),
    phone: normalizedBody.phone.trim(),
    service: (isGroup ? normalizedBody.service : normalizedBody.service.trim()) ?? "",
    date: normalizedBody.date,
    time: normalizedBody.time,
    ...(isGroup
      ? {
          bookingKind: "group" as const,
          partySize: normalizedBody.partySize,
          attendees: normalizedBody.attendees,
          endTime: normalizedBody.endTime,
        }
      : {}),
    status: autoConfirm ? "confirmed" : "pending",
    source: "staff",
    createdAt: now,
    updatedAt: now,
    preferredDentistId: assignedDentistId,
    preferredDentistName: assignedDentist.name,
    assignedDentistId,
    assignedDentistName: assignedDentist.name,
    internalNotes: normalizedBody.internalNotes?.trim() || undefined,
    auditLog: [
      {
        at: now,
        actor,
        action: autoConfirm
          ? isGroup
            ? "staff-group-booking-confirmed"
            : "staff-booking-confirmed"
          : isGroup
            ? "staff-group-booking-created"
            : "staff-booking-created",
        detail: isGroup
          ? `${assignedDentist.name} · Group (${normalizedBody.partySize})`
          : assignedDentist.name,
      },
    ],
  };

  await saveBooking(booking);

  if (autoConfirm) {
    await sendBookingApprovedEmail(booking, siteUrl);
  } else {
    await sendBookingRequestEmails(booking, siteUrl);
  }

  return { booking };
}

export function getManageLink(token: string, siteUrl?: string): string {
  return buildManageUrl(token, siteUrl);
}

export async function listBookingsForAdmin(): Promise<Booking[]> {
  return sortBookingsByDateTime(await getAllBookings());
}

export function filterBookingsForDentist(bookings: Booking[], dentistId: string): Booking[] {
  return sortBookingsByDateTime(
    bookings.filter((booking) => {
      if (booking.status === "cancelled" || booking.status === "declined") return false;
      if (booking.assignedDentistId === dentistId) return true;
      if (booking.preferredDentistId === dentistId) return true;
      if (
        isAnyDentist(booking.preferredDentistId) &&
        isAnyDentist(booking.assignedDentistId)
      ) {
        return true;
      }
      return false;
    })
  );
}

export function filterTodayForDentist(bookings: Booking[], dentistId: string): Booking[] {
  const today = getTodayDateString();
  return filterBookingsForDentist(bookings, dentistId).filter((booking) =>
    isTodayVisit(booking, today)
  );
}
