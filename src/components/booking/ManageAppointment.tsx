"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { site } from "@/content";
import type { Booking } from "@/lib/bookings";
import { isRescheduledPatient } from "@/lib/booking-status";

interface ManageAppointmentProps {
  initialBooking: Booking;
}

export function ManageAppointment({ initialBooking }: ManageAppointmentProps) {
  const [bookingData, setBookingData] = useState(initialBooking);
  const [mode, setMode] = useState<"view" | "reschedule" | "cancel">("view");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState(initialBooking.date);
  const [rescheduleTime, setRescheduleTime] = useState(initialBooking.time);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [dateClosed, setDateClosed] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  useEffect(() => {
    if (mode !== "reschedule" || !rescheduleDate) {
      return;
    }

    setSlotsLoading(true);
    const params = new URLSearchParams({
      date: rescheduleDate,
      excludeToken: bookingData.token,
    });

    fetch(`/api/availability?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setDateClosed(Boolean(data.closed));
        const slots: string[] = data.timeSlots ?? [];
        setTimeSlots(slots);
        setRescheduleTime((current) => (slots.includes(current) ? current : slots[0] ?? ""));
      })
      .catch(() => {
        setTimeSlots([]);
        setDateClosed(false);
      })
      .finally(() => setSlotsLoading(false));
  }, [mode, rescheduleDate, bookingData.token]);

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
  const cannotPickTime =
    mode === "reschedule" &&
    (dateClosed || slotsLoading || timeSlots.length === 0);

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
          ...(bookingData.assignedDentistName || bookingData.assignedDentistId
            ? [["Dentist", bookingData.assignedDentistName ?? bookingData.assignedDentistId]]
            : []),
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-gray-100 pb-3">
            <dt className="text-sm font-medium text-muted">{label}</dt>
            <dd className="text-sm font-semibold text-dark text-right">{value}</dd>
          </div>
        ))}
      </dl>

      {canManage && mode === "view" && (
        <div className="mt-8 flex flex-wrap gap-3">
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
          <div>
            <label htmlFor="date" className="mb-1.5 block text-sm font-medium text-gray-700">
              New Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              min={minDate}
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="input-field"
            />
            {dateClosed && (
              <p className="mt-1 text-xs text-red-600">
                The clinic is closed on this day. Please choose another date.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="time" className="mb-1.5 block text-sm font-medium text-gray-700">
              New Time
            </label>
            <select
              id="time"
              name="time"
              required
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              disabled={cannotPickTime}
              className="input-field disabled:opacity-60"
            >
              <option value="">
                {slotsLoading
                  ? "Loading times…"
                  : dateClosed
                    ? "Closed on this day"
                    : timeSlots.length === 0
                      ? "No times available"
                      : "Select a time"}
              </option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
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
