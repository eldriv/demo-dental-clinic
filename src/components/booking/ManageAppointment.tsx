"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { site } from "@/content";
import type { Booking } from "@/lib/bookings";
import { isRescheduledPatient } from "@/lib/booking-status";
import { ANY_DENTIST_ID } from "@/lib/booking-availability";
import type { TimeSlotOption } from "@/lib/booking-availability";
import { BookingSchedulePicker } from "@/components/booking/BookingSchedulePicker";
import { isAnyDentist } from "@/lib/dentist-availability";
import {
  canReportLateArrival,
  formatLateNoticeSummary,
  isActiveAppointment,
} from "@/lib/appointment-attendance";

interface ManageAppointmentProps {
  initialBooking: Booking;
}

export function ManageAppointment({ initialBooking }: ManageAppointmentProps) {
  const [bookingData, setBookingData] = useState(initialBooking);
  const [mode, setMode] = useState<"view" | "reschedule" | "cancel" | "late">("view");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [lateMinutes, setLateMinutes] = useState("15");
  const [lateNote, setLateNote] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState(initialBooking.date);
  const [rescheduleTime, setRescheduleTime] = useState(initialBooking.time);
  const [timeSlots, setTimeSlots] = useState<TimeSlotOption[]>([]);
  const [dateClosed, setDateClosed] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const dentistId =
    bookingData.preferredDentistId && !isAnyDentist(bookingData.preferredDentistId)
      ? bookingData.preferredDentistId
      : bookingData.assignedDentistId && !isAnyDentist(bookingData.assignedDentistId)
        ? bookingData.assignedDentistId
        : ANY_DENTIST_ID;

  useEffect(() => {
    if (mode !== "reschedule" || !rescheduleDate) {
      return;
    }

    setSlotsLoading(true);
    const params = new URLSearchParams({
      date: rescheduleDate,
      excludeToken: bookingData.token,
      dentistId,
    });

    fetch(`/api/availability?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setDateClosed(Boolean(data.closed));
        const slots: TimeSlotOption[] = data.slots ?? [];
        setTimeSlots(slots);
        setRescheduleTime((current) => {
          if (slots.some((slot) => slot.time === current && slot.available)) return current;
          return slots.find((slot) => slot.available)?.time ?? "";
        });
      })
      .catch(() => {
        setTimeSlots([]);
        setDateClosed(false);
      })
      .finally(() => setSlotsLoading(false));
  }, [mode, rescheduleDate, bookingData.token, dentistId]);

  async function handleReschedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`/api/bookings/${bookingData.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          date: rescheduleDate,
          time: rescheduleTime,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Failed to reschedule.");
        return;
      }

      setBookingData(data.booking);
      setStatus("success");
      setMessage(
        isRescheduledPatient(bookingData) || bookingData.status === "declined"
          ? "Your new time was submitted. We'll confirm once the clinic approves it."
          : "Your appointment has been rescheduled."
      );
      setMode("view");
    } catch {
      setStatus("error");
      setMessage(`Unable to reschedule. Please call ${site.contact.phones[0]}.`);
    }
  }

  async function handleLateNotice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`/api/bookings/${bookingData.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "late-notice",
          minutesLate: lateMinutes ? Number(lateMinutes) : undefined,
          note: lateNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Failed to send late notice.");
        return;
      }

      setBookingData(data.booking);
      setStatus("success");
      setMessage(data.message ?? "Late arrival notice sent to the clinic.");
      setMode("view");
    } catch {
      setStatus("error");
      setMessage(`Unable to send notice. Please call ${site.contact.phones[0]}.`);
    }
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`/api/bookings/${bookingData.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Failed to cancel.");
        return;
      }

      setBookingData(data.booking);
      setStatus("success");
      setMessage("Your appointment has been cancelled.");
      setMode("view");
    } catch {
      setStatus("error");
      setMessage(`Unable to cancel. Please call ${site.contact.phones[0]}.`);
    }
  }

  const isCancelled = bookingData.status === "cancelled";
  const isCompleted = bookingData.status === "completed";
  const canManage = !isCancelled && !isCompleted;
  const canLateNotice = canReportLateArrival(bookingData);
  const showLateBanner = Boolean(bookingData.lateNoticeAt) && isActiveAppointment(bookingData);
  const hasAvailableSlot = timeSlots.some((slot) => slot.available);
  const cannotPickTime =
    mode === "reschedule" &&
    (dateClosed || slotsLoading || !hasAvailableSlot);

  return (
    <div className="card max-w-lg mx-auto">
      {status === "success" && (
        <div className="mb-6 flex items-start gap-2 rounded-xl bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle className="mt-0.5 size-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {status === "error" && (
        <div className="mb-6 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="mb-6">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
            isCancelled
              ? "bg-red-100 text-red-700"
              : bookingData.status === "pending"
                ? "bg-amber-100 text-amber-800"
                : bookingData.status === "declined"
                  ? "bg-orange-100 text-orange-800"
                  : bookingData.status === "completed"
                    ? "bg-gray-100 text-gray-700"
                : bookingData.status === "rescheduled"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-primary/10 text-primary"
          }`}
        >
          {bookingData.status === "pending"
            ? "Pending approval"
            : isRescheduledPatient(bookingData)
              ? "Rescheduled — pending approval"
            : bookingData.status === "declined"
              ? "Reschedule needed"
              : bookingData.status}
        </span>
      </div>

      {(bookingData.status === "pending" || isRescheduledPatient(bookingData)) && (
        <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your request is awaiting clinic approval. You&apos;ll receive a confirmation email once approved.
        </p>
      )}

      {showLateBanner && (
        <p className="mb-6 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {formatLateNoticeSummary(bookingData)} — the clinic has been notified.
        </p>
      )}

      {bookingData.status === "declined" && (
        <p className="mb-6 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-900">
          Your requested time is not available. Please choose a new date and time below.
        </p>
      )}

      {bookingData.status === "completed" && (
        <p className="mb-6 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
          This appointment has been marked as completed. Thank you for visiting us.
        </p>
      )}

      <dl className="space-y-4">
        {[
          ["Name", bookingData.name],
          ["Email", bookingData.email],
          ["Phone", bookingData.phone],
          ["Service", bookingData.service],
          ["Date", bookingData.date],
          ["Time", bookingData.time],
          ...(bookingData.assignedDentistName ||
          bookingData.preferredDentistName ||
          bookingData.assignedDentistId ||
          bookingData.preferredDentistId
            ? [
                [
                  "Dentist",
                  bookingData.assignedDentistName ??
                    bookingData.preferredDentistName ??
                    (isAnyDentist(bookingData.preferredDentistId) ? "Any doctor" : "Assigned at approval"),
                ],
              ]
            : [["Dentist", "Any doctor"]]),
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-gray-100 pb-3">
            <dt className="text-sm font-medium text-muted">{label}</dt>
            <dd className="text-sm font-semibold text-dark text-right">{value}</dd>
          </div>
        ))}
      </dl>

      {canManage && mode === "view" && (
        <div className="mt-8 flex flex-wrap gap-3">
          {canLateNotice && !bookingData.lateNoticeAt && (
            <button
              type="button"
              onClick={() => {
                setMode("late");
                setStatus("idle");
                setMessage("");
              }}
              className="btn-outline flex-1"
            >
              Running late?
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMode("reschedule");
              setStatus("idle");
              setMessage("");
              setRescheduleDate(bookingData.date);
              setRescheduleTime(bookingData.time);
            }}
            className="btn-cta flex-1"
          >
            Reschedule
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={status === "loading"}
            className="btn-outline btn-outline-danger flex-1"
          >
            {status === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Cancel"
            )}
          </button>
        </div>
      )}

      {mode === "reschedule" && canManage && (
        <form onSubmit={handleReschedule} className="mt-8 space-y-4">
          <h3 className="font-semibold text-dark">Reschedule Appointment</h3>
          <BookingSchedulePicker
            dateId="date"
            timeId="time"
            selectedDate={rescheduleDate}
            selectedTime={rescheduleTime}
            onDateChange={setRescheduleDate}
            onTimeChange={setRescheduleTime}
            dentistId={dentistId}
            excludeToken={bookingData.token}
            timeSlots={timeSlots}
            slotsLoading={slotsLoading}
            dateClosed={dateClosed}
            cannotBookDate={
              rescheduleDate.length > 0 && (dateClosed || (!slotsLoading && !hasAvailableSlot))
            }
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={status === "loading" || cannotPickTime || !rescheduleTime}
              className="btn-cta flex-1"
            >
              {status === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Confirm"
              )}
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="btn-outline flex-1"
            >
              Back
            </button>
          </div>
        </form>
      )}

      {mode === "late" && canManage && (
        <form onSubmit={handleLateNotice} className="mt-8 space-y-4">
          <h3 className="font-semibold text-dark">Late Arrival Notice</h3>
          <p className="text-sm text-muted">
            Let the front desk know you&apos;re on your way. They&apos;ll see this on the dashboard
            right away.
          </p>
          <div>
            <label htmlFor="late-minutes" className="mb-1.5 block text-sm font-medium text-gray-700">
              About how many minutes late? (optional)
            </label>
            <select
              id="late-minutes"
              value={lateMinutes}
              onChange={(e) => setLateMinutes(e.target.value)}
              className="input-field"
            >
              <option value="">Not sure</option>
              <option value="10">~10 minutes</option>
              <option value="15">~15 minutes</option>
              <option value="20">~20 minutes</option>
              <option value="30">~30 minutes</option>
              <option value="45">~45 minutes</option>
            </select>
          </div>
          <div>
            <label htmlFor="late-note" className="mb-1.5 block text-sm font-medium text-gray-700">
              Note for the clinic (optional)
            </label>
            <textarea
              id="late-note"
              value={lateNote}
              onChange={(e) => setLateNote(e.target.value)}
              rows={2}
              className="input-field text-sm"
              placeholder="Stuck in traffic, etc."
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={status === "loading"} className="btn-cta flex-1">
              {status === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Notify clinic"
              )}
            </button>
            <button type="button" onClick={() => setMode("view")} className="btn-outline flex-1">
              Back
            </button>
          </div>
        </form>
      )}

      {isCancelled && (
        <p className="mt-6 text-center text-sm text-muted">
          Need to rebook? Call us at{" "}
          <a href={`tel:${site.contact.phones[0].replace(/[^\d+]/g, "")}`} className="text-primary hover:underline">
            {site.contact.phones[0]}
          </a>
        </p>
      )}
    </div>
  );
}
