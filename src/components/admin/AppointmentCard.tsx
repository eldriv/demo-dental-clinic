"use client";

import { useEffect, useState } from "react";
import { Calendar, Loader2, Mail, Phone, Stethoscope, AlertTriangle } from "lucide-react";
import type { Booking } from "@/lib/bookings";
import { StatusBadge, formatBookingWhen } from "@/components/admin/StatusBadge";
import { useAdminDentists } from "@/components/admin/useAdminDentists";
import { needsStaffApproval } from "@/lib/booking-status";
import {
  formatLateNoticeSummary,
  needsNoShowAlert,
} from "@/lib/appointment-attendance";

interface AppointmentActionsProps {
  booking: Booking;
  onUpdated: (booking: Booking) => void;
}

export function AppointmentActions({ booking, onUpdated }: AppointmentActionsProps) {
  const { dentists, loading: dentistsLoading } = useAdminDentists();
  const [loading, setLoading] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [assignedDentistId, setAssignedDentistId] = useState(
    booking.assignedDentistId ?? booking.preferredDentistId ?? dentists[0]?.id ?? ""
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const next =
      booking.assignedDentistId ?? booking.preferredDentistId ?? dentists[0]?.id ?? "";
    if (next && next !== assignedDentistId) {
      setAssignedDentistId(next);
    }
  }, [booking.assignedDentistId, booking.preferredDentistId, dentists, assignedDentistId]);

  async function runAction(
    action: "approve" | "decline" | "complete" | "cancel" | "confirm-attendance" | "reassign-dentist"
  ) {
    if (action === "cancel") {
      const confirmed = window.confirm(
        `Cancel the appointment for ${booking.name} on ${booking.date} at ${booking.time}? The time slot will be freed on the website immediately.`
      );
      if (!confirmed) return;
    }

    setLoading(action);
    setError("");

    try {
      const payload: Record<string, string | undefined> = { action, note: note.trim() || undefined };
      if (action === "approve" || action === "reassign-dentist") {
        payload.assignedDentistId = assignedDentistId;
      }

      const res = await fetch(`/api/admin/bookings/${booking.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed.");
        return;
      }
      onUpdated(data.booking);
      setNote("");
    } catch {
      setError("Action failed.");
    } finally {
      setLoading(null);
    }
  }

  const canApprove = needsStaffApproval(booking);
  const canReassignDentist =
    !canApprove &&
    booking.status !== "cancelled" &&
    booking.status !== "declined" &&
    booking.status !== "pending";
  const canDecline =
    booking.status === "pending" ||
    booking.status === "confirmed" ||
    booking.status === "rescheduled";
  const canComplete =
    booking.status === "confirmed" || booking.status === "rescheduled";
  const canCancel =
    booking.status !== "cancelled" && booking.status !== "completed";
  const showNoShowAlert = needsNoShowAlert(booking);
  const canConfirmAttendance = showNoShowAlert;

  return (
    <div className="space-y-4 border-t border-gray-100 pt-4">
      {canApprove && (
        <div>
          <label htmlFor={`dentist-${booking.token}`} className="admin-detail-label">
            Assign dentist
          </label>
          {dentistsLoading ? (
            <p className="mt-1 text-sm text-muted">Loading dentists…</p>
          ) : dentists.length > 0 ? (
            <select
              id={`dentist-${booking.token}`}
              value={assignedDentistId}
              onChange={(e) => setAssignedDentistId(e.target.value)}
              className="input-field mt-1.5 text-sm"
              required
            >
              <option value="">Select dentist</option>
              {dentists.map((dentist) => (
                <option key={dentist.id} value={dentist.id}>
                  {dentist.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 text-sm text-red-600">
              No dentists yet.{" "}
              <a href="/admin/dentists" className="text-primary underline">
                Add dentists
              </a>{" "}
              first.
            </p>
          )}
        </div>
      )}

      {canReassignDentist && (
        <div>
          <label htmlFor={`reassign-dentist-${booking.token}`} className="admin-detail-label">
            Assigned dentist
          </label>
          {dentistsLoading ? (
            <p className="mt-1 text-sm text-muted">Loading dentists…</p>
          ) : dentists.length > 0 ? (
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                id={`reassign-dentist-${booking.token}`}
                value={assignedDentistId}
                onChange={(e) => setAssignedDentistId(e.target.value)}
                className="input-field flex-1 text-sm"
              >
                {dentists.map((dentist) => (
                  <option key={dentist.id} value={dentist.id}>
                    {dentist.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={
                  !!loading ||
                  dentistsLoading ||
                  !assignedDentistId ||
                  assignedDentistId === booking.assignedDentistId
                }
                onClick={() => runAction("reassign-dentist")}
                className="btn-outline btn-cta-sm shrink-0"
              >
                {loading === "reassign-dentist" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Update dentist"
                )}
              </button>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">No dentists available.</p>
          )}
        </div>
      )}

      {canDecline && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note for patient (why reschedule is needed)"
          rows={2}
          className="input-field text-sm"
        />
      )}

      <div className="admin-actions-bar">
        {canConfirmAttendance && (
          <button
            type="button"
            disabled={!!loading}
            onClick={() => runAction("confirm-attendance")}
            className="btn-cta btn-cta-sm"
          >
            {loading === "confirm-attendance" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Patient still coming"
            )}
          </button>
        )}
        {canApprove && (
          <button
            type="button"
            disabled={!!loading || dentistsLoading || !assignedDentistId}
            onClick={() => runAction("approve")}
            className="btn-cta btn-cta-sm"
          >
            {loading === "approve" ? <Loader2 className="size-4 animate-spin" /> : "Approve"}
          </button>
        )}
        {canDecline && (
          <button
            type="button"
            disabled={!!loading}
            onClick={() => runAction("decline")}
            className="btn-outline btn-cta-sm btn-outline-danger"
          >
            {loading === "decline" ? <Loader2 className="size-4 animate-spin" /> : "Not Available"}
          </button>
        )}
        {canComplete && (
          <button
            type="button"
            disabled={!!loading}
            onClick={() => runAction("complete")}
            className="btn-outline btn-cta-sm"
          >
            {loading === "complete" ? <Loader2 className="size-4 animate-spin" /> : "Mark Completed"}
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            disabled={!!loading}
            onClick={() => runAction("cancel")}
            className="btn-outline btn-cta-sm btn-outline-danger"
          >
            {loading === "cancel" ? <Loader2 className="size-4 animate-spin" /> : "Cancel & free slot"}
          </button>
        )}
        <a
          href={`/manage/${booking.token}`}
          target="_blank"
          rel="noreferrer"
          className="btn-outline btn-cta-sm"
        >
          Patient View
        </a>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface AppointmentCardProps {
  booking: Booking;
  onUpdated: (booking: Booking) => void;
}

export function AppointmentCard({ booking, onUpdated }: AppointmentCardProps) {
  const dentistLabel =
    booking.assignedDentistName ??
    booking.preferredDentistName ??
    (booking.preferredDentistId || booking.assignedDentistId
      ? booking.preferredDentistId ?? booking.assignedDentistId
      : null);
  const showNoShowAlert = needsNoShowAlert(booking);

  return (
    <article className="admin-card transition-shadow hover:shadow-[0_12px_40px_rgba(26,60,52,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-dark">{booking.name}</h3>
          <p className="mt-0.5 text-sm text-muted">{booking.service}</p>
        </div>
        <StatusBadge booking={booking} />
      </div>

      {showNoShowAlert && (
        <div className="admin-info-banner admin-info-banner-amber mt-4">
          <AlertTriangle className="size-4 shrink-0" />
          <p>Past 30-minute threshold — contact the patient to confirm if they&apos;re still coming.</p>
        </div>
      )}

      {booking.lateNoticeAt && (
        <div className="admin-info-banner admin-info-banner-blue mt-4">
          <p>{formatLateNoticeSummary(booking)}</p>
        </div>
      )}

      {booking.attendanceConfirmed && (
        <div className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">
          Reception confirmed patient is still attending.
        </div>
      )}

      {booking.rescheduledByPatient && (
        <div className="admin-info-banner admin-info-banner-blue mt-4">
          <p>This patient picked a new date/time. Review and approve the updated appointment.</p>
        </div>
      )}

      <div className="admin-detail-grid mt-4">
        <div className="admin-detail-item">
          <dt className="admin-detail-label flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            When
          </dt>
          <dd className="admin-detail-value">{formatBookingWhen(booking)}</dd>
        </div>
        <div className="admin-detail-item">
          <dt className="admin-detail-label flex items-center gap-1.5">
            <Phone className="size-3.5" />
            Phone
          </dt>
          <dd className="admin-detail-value">{booking.phone}</dd>
        </div>
        {dentistLabel && (
          <div className="admin-detail-item">
            <dt className="admin-detail-label flex items-center gap-1.5">
              <Stethoscope className="size-3.5" />
              Dentist
            </dt>
            <dd className="admin-detail-value">
              {dentistLabel}
              {!booking.assignedDentistId && booking.preferredDentistName && (
                <span className="ml-1 text-xs font-normal text-muted">(preferred)</span>
              )}
              {!booking.assignedDentistId && !booking.preferredDentistName && !booking.preferredDentistId && (
                <span className="ml-1 text-xs font-normal text-muted">(any doctor)</span>
              )}
            </dd>
          </div>
        )}
        <div className="admin-detail-item sm:col-span-2">
          <dt className="admin-detail-label flex items-center gap-1.5">
            <Mail className="size-3.5" />
            Email
          </dt>
          <dd className="admin-detail-value break-all">{booking.email}</dd>
        </div>
      </div>

      <AppointmentActions booking={booking} onUpdated={onUpdated} />
    </article>
  );
}
