"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Flag,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Stethoscope,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import type { Booking } from "@/lib/bookings";
import { getBookingSource } from "@/lib/bookings";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminDentists } from "@/components/admin/useAdminDentists";
import { needsStaffApproval } from "@/lib/booking-status";
import {
  formatLateNoticeSummary,
  needsNoShowAlert,
} from "@/lib/appointment-attendance";
import {
  formatBookingCalendarLabel,
  formatBookingServiceLabel,
  formatBookingTimeRange,
  isGroupBooking,
} from "@/lib/booking-group";

type ActionName =
  | "approve"
  | "decline"
  | "complete"
  | "cancel"
  | "confirm-attendance"
  | "reassign-dentist"
  | "mark-no-show"
  | "update-internal-notes"
  | "set-follow-up";

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "outline",
  loading,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline" | "danger";
  loading?: boolean;
  className?: string;
}) {
  const base =
    variant === "primary"
      ? "btn-cta btn-cta-sm"
      : variant === "danger"
        ? "btn-outline btn-cta-sm btn-outline-danger"
        : "btn-outline btn-cta-sm";

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${className}`}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : children}
    </button>
  );
}

function AlertChip({ children, tone }: { children: React.ReactNode; tone: "amber" | "green" | "blue" }) {
  const tones = {
    amber: "bg-amber-100 text-amber-900",
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

interface AppointmentCardProps {
  booking: Booking;
  onUpdated: (booking: Booking) => void;
}

export function AppointmentCard({ booking, onUpdated }: AppointmentCardProps) {
  const { dentists, loading: dentistsLoading } = useAdminDentists();
  const showNoShowAlert = needsNoShowAlert(booking);
  const canApprove = needsStaffApproval(booking);
  const [expanded, setExpanded] = useState(canApprove || showNoShowAlert);
  const [loading, setLoading] = useState<ActionName | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [internalNotes, setInternalNotes] = useState(booking.internalNotes ?? "");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [assignedDentistId, setAssignedDentistId] = useState(
    booking.assignedDentistId ?? booking.preferredDentistId ?? dentists[0]?.id ?? ""
  );
  const [error, setError] = useState("");

  const dentistLabel =
    booking.assignedDentistName ?? booking.preferredDentistName ?? null;
  const source = getBookingSource(booking);
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
  const canMarkNoShow =
    showNoShowAlert && booking.status !== "cancelled" && booking.status !== "completed";

  useEffect(() => {
    setInternalNotes(booking.internalNotes ?? "");
  }, [booking.internalNotes]);

  useEffect(() => {
    const next =
      booking.assignedDentistId ?? booking.preferredDentistId ?? dentists[0]?.id ?? "";
    if (next && next !== assignedDentistId) setAssignedDentistId(next);
  }, [booking.assignedDentistId, booking.preferredDentistId, dentists, assignedDentistId]);

  async function runAction(
    action: ActionName,
    extra: Record<string, string | boolean | undefined> = {}
  ) {
    if (action === "cancel") {
      const confirmed = window.confirm(
        `Cancel ${booking.name}'s appointment on ${booking.date} at ${booking.time}?`
      );
      if (!confirmed) return;
    }

    setLoading(action);
    setError("");

    try {
      const payload: Record<string, string | boolean | undefined> = { action, ...extra };
      if (action === "decline") payload.note = declineNote.trim() || undefined;
      if (action === "approve" || action === "reassign-dentist") {
        payload.assignedDentistId = assignedDentistId;
      }
      if (action === "update-internal-notes") payload.internalNotes = internalNotes;

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
      if (action === "decline") {
        setDeclineNote("");
        setShowDeclineForm(false);
      }
    } catch {
      setError("Action failed.");
    } finally {
      setLoading(null);
    }
  }

  const chips = [
    booking.followUpNeeded && { key: "fu", tone: "amber" as const, label: "Follow-up", icon: Flag },
    booking.checkedInAt && { key: "in", tone: "green" as const, label: "Checked in", icon: UserCheck },
    showNoShowAlert && { key: "ns", tone: "amber" as const, label: "No-show risk", icon: AlertTriangle },
    booking.lateNoticeAt && { key: "late", tone: "blue" as const, label: "Late", icon: null },
    booking.rescheduledByPatient && { key: "rs", tone: "blue" as const, label: "Rescheduled", icon: null },
  ].filter(Boolean) as Array<{
    key: string;
    tone: "amber" | "green" | "blue";
    label: string;
    icon: typeof Flag | null;
  }>;

  return (
    <article className={`admin-appt-compact ${expanded ? "admin-appt-compact-open" : ""}`}>
      {/* Collapsed row — always visible */}
      <div className="admin-appt-compact-head">
        <button
          type="button"
          className="admin-appt-compact-toggle"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          <span className="admin-appt-time">{formatBookingTimeRange(booking)}</span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-semibold text-dark">
              {formatBookingCalendarLabel(booking)}
            </span>
            <span className="block truncate text-xs text-muted">
              {formatBookingServiceLabel(booking)}
              {isGroupBooking(booking) ? ` · Organizer: ${booking.name}` : ""}
              {dentistLabel ? ` · ${dentistLabel}` : ""}
              {source === "staff" ? " · Walk-in" : ""}
            </span>
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        <StatusBadge booking={booking} compact />

        <div className="admin-appt-compact-actions">
          {canComplete && !expanded && (
            <ActionButton
              variant="primary"
              loading={loading === "complete"}
              onClick={() => runAction("complete")}
              className="px-2.5! py-1! text-xs"
            >
              Done
            </ActionButton>
          )}
          {canApprove && !expanded && (
            <ActionButton
              variant="primary"
              loading={loading === "approve"}
              disabled={dentistsLoading || !assignedDentistId}
              onClick={() => setExpanded(true)}
              className="px-2.5! py-1! text-xs"
            >
              Review
            </ActionButton>
          )}
          <a
            href={`tel:${booking.phone.replace(/[^\d+]/g, "")}`}
            className="admin-appt-icon-btn"
            title="Call"
          >
            <Phone className="size-3.5" />
          </a>
          <button
            type="button"
            className="admin-appt-icon-btn"
            title={expanded ? "Less" : "More"}
            onClick={() => setExpanded((open) => !open)}
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="admin-appt-chips">
          {chips.map((chip) => (
            <AlertChip key={chip.key} tone={chip.tone}>
              {chip.icon && <chip.icon className="size-2.5" />}
              {chip.label}
            </AlertChip>
          ))}
        </div>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div className="admin-appt-expanded">
          <div className="admin-appt-meta text-xs text-muted">
            <span>{booking.date}</span>
            <span>·</span>
            <a href={`tel:${booking.phone.replace(/[^\d+]/g, "")}`} className="text-primary hover:underline">
              {booking.phone}
            </a>
            <span>·</span>
            <a href={`mailto:${booking.email}`} className="truncate text-primary hover:underline">
              {booking.email}
            </a>
            {dentistLabel && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Stethoscope className="size-3" />
                  {dentistLabel}
                </span>
              </>
            )}
          </div>

          {booking.internalNotes && (
            <p className="text-xs text-amber-900 bg-amber-50 rounded-lg px-2 py-1.5">
              Note: {booking.internalNotes}
            </p>
          )}

          {showNoShowAlert && (
            <p className="text-xs text-amber-900">30+ min past start — contact patient.</p>
          )}
          {booking.lateNoticeAt && (
            <p className="text-xs text-blue-900">{formatLateNoticeSummary(booking)}</p>
          )}

          {canApprove && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] flex-1">
                <label htmlFor={`dentist-${booking.token}`} className="admin-detail-label text-[10px]">
                  Dentist
                </label>
                <select
                  id={`dentist-${booking.token}`}
                  value={assignedDentistId}
                  onChange={(e) => setAssignedDentistId(e.target.value)}
                  className="input-field mt-0.5 py-1.5 text-xs"
                >
                  <option value="">Select</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <ActionButton variant="primary" loading={loading === "approve"} disabled={!assignedDentistId} onClick={() => runAction("approve")}>
                Approve
              </ActionButton>
              {canDecline && !showDeclineForm && (
                <ActionButton variant="outline" onClick={() => setShowDeclineForm(true)}>
                  Reschedule
                </ActionButton>
              )}
            </div>
          )}

          {showDeclineForm && (
            <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50/80 p-2">
              <textarea
                value={declineNote}
                onChange={(e) => setDeclineNote(e.target.value)}
                placeholder="Optional note for patient"
                rows={2}
                className="input-field text-xs"
              />
              <div className="flex flex-wrap gap-1.5">
                <ActionButton variant="danger" loading={loading === "decline"} onClick={() => runAction("decline")}>
                  Send
                </ActionButton>
                <ActionButton variant="outline" onClick={() => setShowDeclineForm(false)}>
                  Cancel
                </ActionButton>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {showNoShowAlert && (
              <>
                <ActionButton variant="primary" loading={loading === "confirm-attendance"} onClick={() => runAction("confirm-attendance")}>
                  Still coming
                </ActionButton>
                {canMarkNoShow && (
                  <ActionButton variant="danger" loading={loading === "mark-no-show"} onClick={() => runAction("mark-no-show")}>
                    No-show
                  </ActionButton>
                )}
              </>
            )}
            {canComplete && (
              <ActionButton variant="primary" loading={loading === "complete"} onClick={() => runAction("complete")}>
                <CheckCircle2 className="mr-1 inline size-3.5" />
                Complete
              </ActionButton>
            )}
            {!canApprove && canDecline && !showDeclineForm && (
              <ActionButton variant="outline" onClick={() => setShowDeclineForm(true)}>
                Reschedule
              </ActionButton>
            )}
            {canReassignDentist && (
              <>
                <select
                  value={assignedDentistId}
                  onChange={(e) => setAssignedDentistId(e.target.value)}
                  className="input-field max-w-[140px] py-1.5 text-xs"
                >
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <ActionButton
                  loading={loading === "reassign-dentist"}
                  disabled={assignedDentistId === booking.assignedDentistId}
                  onClick={() => runAction("reassign-dentist")}
                >
                  Change dentist
                </ActionButton>
              </>
            )}
            {!booking.followUpNeeded && canComplete && (
              <ActionButton loading={loading === "set-follow-up"} onClick={() => runAction("set-follow-up", { followUpNeeded: true })}>
                Follow-up
              </ActionButton>
            )}
            {booking.followUpNeeded && (
              <ActionButton loading={loading === "set-follow-up"} onClick={() => runAction("set-follow-up", { followUpNeeded: false })}>
                Clear follow-up
              </ActionButton>
            )}
            {canCancel && (
              <ActionButton variant="danger" loading={loading === "cancel"} onClick={() => runAction("cancel")}>
                Cancel
              </ActionButton>
            )}
            <a href={`/manage/${booking.token}`} target="_blank" rel="noreferrer" className="admin-appt-icon-btn" title="Patient view">
              <ExternalLink className="size-3.5" />
            </a>
            <a href={`mailto:${booking.email}`} className="admin-appt-icon-btn" title="Email">
              <Mail className="size-3.5" />
            </a>
          </div>

          <details className="text-xs text-muted">
            <summary className="cursor-pointer font-medium text-slate-500">Notes &amp; log</summary>
            <div className="mt-2 space-y-2">
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={2}
                className="input-field text-xs"
                placeholder="Staff-only note"
              />
              <ActionButton
                loading={loading === "update-internal-notes"}
                disabled={internalNotes === (booking.internalNotes ?? "")}
                onClick={() => runAction("update-internal-notes")}
              >
                Save note
              </ActionButton>
              {booking.auditLog && booking.auditLog.length > 0 && (
                <ul className="space-y-0.5 border-t border-gray-100 pt-2">
                  {[...booking.auditLog].reverse().slice(0, 5).map((entry, i) => (
                    <li key={`${entry.at}-${i}`}>
                      {new Date(entry.at).toLocaleString()} — {entry.actor}: {entry.action}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </article>
  );
}
