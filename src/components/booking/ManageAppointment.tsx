"use client";

import { useState, type FormEvent } from "react";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { booking, site } from "@/content";
import type { Booking } from "@/lib/bookings";

interface ManageAppointmentProps {
  initialBooking: Booking;
}

export function ManageAppointment({ initialBooking }: ManageAppointmentProps) {
  const [bookingData, setBookingData] = useState(initialBooking);
  const [mode, setMode] = useState<"view" | "reschedule" | "cancel">("view");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  async function handleReschedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/bookings/${bookingData.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          date: formData.get("date"),
          time: formData.get("time"),
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
      setMessage("Your appointment has been rescheduled.");
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
              : bookingData.status === "rescheduled"
                ? "bg-amber-100 text-amber-700"
                : "bg-primary/10 text-primary"
          }`}
        >
          {bookingData.status}
        </span>
      </div>

      <dl className="space-y-4">
        {[
          ["Name", bookingData.name],
          ["Email", bookingData.email],
          ["Phone", bookingData.phone],
          ["Service", bookingData.service],
          ["Date", bookingData.date],
          ["Time", bookingData.time],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-gray-100 pb-3">
            <dt className="text-sm font-medium text-muted">{label}</dt>
            <dd className="text-sm font-semibold text-dark text-right">{value}</dd>
          </div>
        ))}
      </dl>

      {!isCancelled && mode === "view" && (
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setMode("reschedule");
              setStatus("idle");
              setMessage("");
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

      {mode === "reschedule" && !isCancelled && (
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
              defaultValue={bookingData.date}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="time" className="mb-1.5 block text-sm font-medium text-gray-700">
              New Time
            </label>
            <select
              id="time"
              name="time"
              required
              defaultValue={bookingData.time}
              className="input-field"
            >
              {booking.timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={status === "loading"} className="btn-cta flex-1">
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
