"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Flag,
  Loader2,
  Phone,
  UserCheck,
} from "lucide-react";
import type { Booking } from "@/lib/bookings";
import type { PatientClinicStatus } from "@/lib/patient-profile";
import {
  getAppointmentEndForBooking,
  isActiveAppointment,
  isAppointmentInProgress,
} from "@/lib/appointment-attendance";
import {
  formatBookingCalendarLabel,
  formatBookingServiceLabel,
  formatBookingTimeRange,
} from "@/lib/booking-group";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { needsStaffApproval } from "@/lib/booking-status";

type DayFilter = "all" | "active" | "pending" | "done";
type DaySection = "pending" | "now" | "upcoming" | "overdue" | "done";

function isPendingBooking(booking: Booking): boolean {
  return needsStaffApproval(booking);
}

function getSection(booking: Booking, now = new Date()): DaySection {
  if (isPendingBooking(booking)) return "pending";
  if (booking.status === "completed") return "done";
  if (isAppointmentInProgress(booking, now)) return "now";
  if (isActiveAppointment(booking) && getAppointmentEndForBooking(booking) < now) {
    return "overdue";
  }
  return "upcoming";
}

const sectionMeta: Record<DaySection, { label: string; empty?: string }> = {
  pending: { label: "Pending approval" },
  now: { label: "In session" },
  upcoming: { label: "Up next" },
  overdue: { label: "Needs attention" },
  done: { label: "Completed" },
};

const sectionOrder: DaySection[] = ["pending", "now", "overdue", "upcoming", "done"];

interface AdminMyDayClientProps {
  initialBookings: Booking[];
  patientStatusByEmail?: Record<string, PatientClinicStatus>;
}

function MyDayRow({
  booking,
  defaultOpen,
  loading,
  visitNotes,
  clinicStatus,
  notesSaved,
  onVisitNotesChange,
  onAction,
}: {
  booking: Booking;
  defaultOpen: boolean;
  loading: string | null;
  visitNotes: string;
  clinicStatus?: PatientClinicStatus;
  notesSaved?: boolean;
  onVisitNotesChange: (value: string) => void;
  onAction: (token: string, action: string, payload?: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const inProgress = isAppointmentInProgress(booking);
  const isPending = isPendingBooking(booking);
  const canComplete =
    booking.status === "confirmed" || booking.status === "rescheduled";
  const isDone = booking.status === "completed";
  const actionKey = (action: string) => booking.token + action;
  const isLoading = (action: string) => loading === actionKey(action);
  const notesDirty = visitNotes !== (booking.visitNotes ?? "");

  return (
    <article
      className={`admin-appt-compact ${expanded ? "admin-appt-compact-open" : ""} ${
        inProgress ? "admin-myday-now" : isPending ? "admin-myday-pending" : isDone ? "admin-myday-done" : ""
      }`}
    >
      <div className="admin-appt-compact-head">
        <button
          type="button"
          className="admin-appt-compact-toggle"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          <span className="admin-appt-time">{formatBookingTimeRange(booking)}</span>
          <span className="min-w-0 flex-1 text-left">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="block truncate text-sm font-semibold text-dark">
                {formatBookingCalendarLabel(booking)}
              </span>
              {clinicStatus === "new" && (
                <span className="admin-patient-badge admin-patient-badge-new">New</span>
              )}
            </span>
            <span className="block truncate text-xs text-muted">{formatBookingServiceLabel(booking)}</span>
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        <StatusBadge booking={booking} compact />

        <div className="admin-appt-compact-actions">
          {canComplete && !expanded && (
            <button
              type="button"
              disabled={!!loading}
              onClick={() =>
                onAction(booking.token, "complete", {
                  visitNotes: visitNotes || booking.visitNotes,
                })
              }
              className="btn-cta btn-cta-sm px-2.5! py-1! text-xs"
            >
              {isLoading("complete") ? <Loader2 className="size-3.5 animate-spin" /> : "Done"}
            </button>
          )}
          <a
            href={`tel:${booking.phone.replace(/[^\d+]/g, "")}`}
            className="admin-appt-icon-btn"
            title="Call patient"
          >
            <Phone className="size-3.5" />
          </a>
        </div>
      </div>

      {(booking.checkedInAt || booking.followUpNeeded || booking.internalNotes) && (
        <div className="admin-appt-chips">
          {booking.checkedInAt && (
            <span className="admin-myday-chip admin-myday-chip-green">
              <UserCheck className="size-2.5" />
              Checked in
            </span>
          )}
          {booking.followUpNeeded && (
            <span className="admin-myday-chip admin-myday-chip-amber">
              <Flag className="size-2.5" />
              Follow-up
            </span>
          )}
          {booking.internalNotes && !expanded && (
            <span className="admin-myday-chip admin-myday-chip-amber">Staff note</span>
          )}
        </div>
      )}

      {expanded && (
        <div className="admin-appt-expanded">
          <div className="admin-appt-meta text-xs text-muted">
            <a href={`tel:${booking.phone.replace(/[^\d+]/g, "")}`} className="text-primary hover:underline">
              {booking.phone}
            </a>
            <span>·</span>
            <a href={`mailto:${booking.email}`} className="truncate text-primary hover:underline">
              {booking.email}
            </a>
          </div>

          {booking.internalNotes && (
            <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
              Staff: {booking.internalNotes}
            </p>
          )}

          <div>
            <label htmlFor={`visit-${booking.token}`} className="admin-book-label">
              Visit notes
            </label>
            <textarea
              id={`visit-${booking.token}`}
              value={visitNotes}
              onChange={(e) => onVisitNotesChange(e.target.value)}
              rows={2}
              className="input-field mt-1 text-xs"
              placeholder="Brief treatment summary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={!!loading || !notesDirty}
              onClick={() =>
                onAction(booking.token, "update-visit-notes", { visitNotes })
              }
              className="btn-outline btn-cta-sm text-xs"
            >
              {isLoading("update-visit-notes") ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                "Save notes"
              )}
            </button>
            {notesSaved && !notesDirty && (
              <span className="text-xs font-medium text-green-700">Saved</span>
            )}
            {!booking.followUpNeeded ? (
              <button
                type="button"
                disabled={!!loading}
                onClick={() =>
                  onAction(booking.token, "set-follow-up", { followUpNeeded: true })
                }
                className="btn-outline btn-cta-sm text-xs"
              >
                Flag follow-up
              </button>
            ) : (
              <button
                type="button"
                disabled={!!loading}
                onClick={() =>
                  onAction(booking.token, "set-follow-up", { followUpNeeded: false })
                }
                className="btn-outline btn-cta-sm text-xs"
              >
                Clear follow-up
              </button>
            )}
            {canComplete && (
              <button
                type="button"
                disabled={!!loading}
                onClick={() =>
                  onAction(booking.token, "complete", {
                    visitNotes: visitNotes || booking.visitNotes,
                  })
                }
                className="btn-cta btn-cta-sm text-xs"
              >
                {isLoading("complete") ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="mr-1 inline size-3.5" />
                    Complete
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export function AdminMyDayClient({
  initialBookings,
  patientStatusByEmail = {},
}: AdminMyDayClientProps) {
  const [bookings, setBookings] = useState(initialBookings);
  const [loading, setLoading] = useState<string | null>(null);
  const [visitNotes, setVisitNotes] = useState<Record<string, string>>({});
  const [notesSavedToken, setNotesSavedToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<DayFilter>("all");

  const stats = useMemo(() => {
    const now = new Date();
    let active = 0;
    let pending = 0;
    let inSession = 0;
    let done = 0;
    for (const booking of bookings) {
      if (booking.status === "completed") {
        done += 1;
      } else if (isPendingBooking(booking)) {
        pending += 1;
      } else {
        active += 1;
        if (isAppointmentInProgress(booking, now)) inSession += 1;
      }
    }
    return { total: bookings.length, active, pending, inSession, done };
  }, [bookings]);

  const grouped = useMemo(() => {
    const now = new Date();
    const filtered = bookings.filter((booking) => {
      if (filter === "active") {
        return booking.status !== "completed" && !isPendingBooking(booking);
      }
      if (filter === "pending") return isPendingBooking(booking);
      if (filter === "done") return booking.status === "completed";
      return true;
    });

    const buckets: Record<DaySection, Booking[]> = {
      pending: [],
      now: [],
      upcoming: [],
      overdue: [],
      done: [],
    };

    for (const booking of filtered) {
      buckets[getSection(booking, now)].push(booking);
    }

    return buckets;
  }, [bookings, filter]);

  async function runAction(
    token: string,
    action: string,
    payload: Record<string, unknown> = {}
  ) {
    setLoading(token + action);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed.");
        return;
      }
      setBookings((current) => current.map((b) => (b.token === token ? data.booking : b)));
      if (action === "update-visit-notes" && data.booking) {
        setVisitNotes((current) => ({
          ...current,
          [token]: data.booking.visitNotes ?? "",
        }));
        setNotesSavedToken(token);
        window.setTimeout(() => {
          setNotesSavedToken((current) => (current === token ? null : current));
        }, 2500);
      }
    } catch {
      setError("Action failed.");
    } finally {
      setLoading(null);
    }
  }

  const filters: { id: DayFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: stats.total },
    { id: "active", label: "Active", count: stats.active },
    { id: "pending", label: "Pending", count: stats.pending },
    { id: "done", label: "Done", count: stats.done },
  ];

  if (bookings.length === 0) {
    return (
      <div className="admin-myday-empty">
        <p className="text-sm font-medium text-slate-700">No appointments today</p>
        <p className="mt-1 text-xs text-muted">Your schedule is clear. Check the calendar for other days.</p>
      </div>
    );
  }

  const visibleSections = sectionOrder.filter((section) => grouped[section].length > 0);

  return (
    <div className="space-y-3">
      <div className="admin-myday-toolbar">
        <div className="admin-myday-stats">
          <span>{stats.total} today</span>
          {stats.inSession > 0 && (
            <>
              <span className="text-muted">·</span>
              <span className="text-primary font-medium">{stats.inSession} in session</span>
            </>
          )}
          {stats.pending > 0 && (
            <>
              <span className="text-muted">·</span>
              <span className="font-medium text-amber-700">{stats.pending} pending</span>
            </>
          )}
          {stats.done > 0 && (
            <>
              <span className="text-muted">·</span>
              <span>{stats.done} done</span>
            </>
          )}
        </div>
        <div className="admin-myday-filters" role="tablist" aria-label="Filter appointments">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`admin-myday-filter ${filter === item.id ? "admin-myday-filter-active" : ""}`}
            >
              {item.label}
              <span className="admin-myday-filter-count">{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {visibleSections.length === 0 ? (
        <div className="admin-myday-empty py-8">
          <p className="text-sm text-muted">No appointments in this view.</p>
        </div>
      ) : (
        visibleSections.map((section) => (
          <section key={section} className="admin-myday-section">
            {filter === "all" && (
              <h2 className="admin-myday-section-title">{sectionMeta[section].label}</h2>
            )}
            {filter === "pending" && section === "pending" && (
              <p className="text-xs text-muted">Waiting for front desk approval before the visit is confirmed.</p>
            )}
            <div className="space-y-2">
              {grouped[section].map((booking) => (
                <MyDayRow
                  key={booking.token}
                  booking={booking}
                  clinicStatus={patientStatusByEmail[booking.email.trim().toLowerCase()]}
                  defaultOpen={
                    section === "pending" ||
                    section === "now" ||
                    section === "overdue" ||
                    (section === "upcoming" &&
                      grouped.pending.length === 0 &&
                      grouped.now.length === 0 &&
                      grouped.overdue.length === 0 &&
                      grouped.upcoming[0]?.token === booking.token)
                  }
                  loading={loading}
                  visitNotes={visitNotes[booking.token] ?? booking.visitNotes ?? ""}
                  notesSaved={notesSavedToken === booking.token}
                  onVisitNotesChange={(value) =>
                    setVisitNotes((current) => ({ ...current, [booking.token]: value }))
                  }
                  onAction={runAction}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
