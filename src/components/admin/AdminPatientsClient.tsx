"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  Mail,
  Phone,
  Search,
  Stethoscope,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { Booking } from "@/lib/bookings";
import type {
  PatientClinicStatus,
  PatientRecord,
  PatientSummary,
  PatientTreatment,
} from "@/lib/patient-profile";
import {
  buildGroupMemberRows,
  getPatientServiceOnBooking,
  isGroupBooking,
} from "@/lib/booking-group";
import { GroupMembersPanel } from "@/components/admin/GroupMembersPanel";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatBookingWhen } from "@/components/admin/StatusBadge";

interface AdminPatientsClientProps {
  initialPatients: PatientSummary[];
}

type StatusFilter = "all" | PatientClinicStatus;

function patientInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function visitStatusClass(status: Booking["status"]): string {
  if (status === "completed") return "admin-patient-status-done";
  if (status === "confirmed" || status === "rescheduled") return "admin-patient-status-active";
  return "admin-patient-status-pending";
}

function PatientStatusBadge({ status }: { status: PatientClinicStatus }) {
  if (status !== "new") return null;
  return <span className="admin-patient-badge admin-patient-badge-new">New</span>;
}

function PatientAvatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span
      className={`admin-patient-avatar ${large ? "admin-patient-avatar-lg" : ""}`}
      aria-hidden
    >
      {patientInitials(name) || "?"}
    </span>
  );
}

function telHref(phone?: string): string {
  const digits = phone?.replace(/[^\d+]/g, "") ?? "";
  return digits ? `tel:${digits}` : "#";
}

function PatientTimelineVisit({ visit }: { visit: PatientTreatment }) {
  const [expanded, setExpanded] = useState(false);
  const timeLabel =
    visit.isGroup && visit.endTime ? `${visit.time} – ${visit.endTime}` : visit.time;

  return (
    <div className={`admin-patient-timeline-card ${visit.isGroup ? "admin-patient-timeline-card-group" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {visit.isGroup ? (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              className="group flex w-full items-start gap-1.5 text-left"
              aria-expanded={expanded}
            >
              <ChevronDown
                className={`mt-0.5 size-4 shrink-0 text-muted transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-800 group-hover:text-primary">
                  {visit.service}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {visit.date} · {timeLabel}
                  {visit.dentist ? ` · ${visit.dentist}` : ""}
                </span>
              </span>
            </button>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-800">{visit.service}</p>
              <p className="mt-0.5 text-xs text-muted">
                {visit.date} · {timeLabel}
                {visit.dentist ? ` · ${visit.dentist}` : ""}
              </p>
            </>
          )}
        </div>
        <span className={`admin-patient-status ${visitStatusClass(visit.status)}`}>
          {visit.statusLabel}
        </span>
      </div>

      {visit.isGroup && expanded && visit.groupMembers && visit.groupMembers.length > 0 && (
        <GroupMembersPanel members={visit.groupMembers} className="mt-2" />
      )}

      {visit.visitNotes ? (
        <div className="admin-patient-note-block">
          <p className="admin-patient-note-label">
            <FileText className="size-3" />
            Dentist note
          </p>
          <p className="text-xs leading-relaxed text-slate-700">{visit.visitNotes}</p>
        </div>
      ) : visit.status === "completed" ? (
        <p className="admin-patient-note-missing">No note recorded</p>
      ) : null}

      {visit.internalNotes && (
        <div className="admin-patient-staff-block">
          <p className="admin-patient-note-label">Staff note</p>
          <p className="text-xs text-amber-950">{visit.internalNotes}</p>
        </div>
      )}
    </div>
  );
}

function PatientUpcomingBanner({
  booking,
  patientEmail,
}: {
  booking: Booking;
  patientEmail: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isGroup = isGroupBooking(booking);
  const groupMembers = isGroup ? buildGroupMemberRows(booking) : [];

  return (
    <div className="admin-patient-banner admin-patient-banner-upcoming">
      <Calendar className="size-3.5 shrink-0 text-green-700" />
      <div className="min-w-0 flex-1">
        {isGroup ? (
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="group w-full text-left"
            aria-expanded={expanded}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-green-800">Upcoming</p>
            <p className="flex items-center gap-1 text-xs text-green-900">
              <ChevronDown
                className={`size-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
              {getPatientServiceOnBooking(booking, patientEmail)} · {formatBookingWhen(booking)}
            </p>
          </button>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-green-800">Upcoming</p>
            <p className="text-xs text-green-900">
              {getPatientServiceOnBooking(booking, patientEmail)} · {formatBookingWhen(booking)}
            </p>
          </>
        )}
        {isGroup && expanded && groupMembers.length > 0 && (
          <GroupMembersPanel members={groupMembers} className="mt-2" />
        )}
      </div>
    </div>
  );
}

function PatientDetailPanel({
  patient,
  onClose,
}: {
  patient: PatientRecord;
  onClose: () => void;
}) {
  return (
    <aside className="admin-patient-detail">
      <div className="admin-patient-detail-hero">
        <PatientAvatar name={patient.name} large />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-dark">{patient.name}</h2>
            <PatientStatusBadge status={patient.clinicStatus} />
          </div>
          <p className="truncate text-xs text-muted">{patient.email}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={telHref(patient.phone)}
            className="admin-appt-icon-btn"
            title="Call"
          >
            <Phone className="size-3.5" />
          </a>
          <a href={`mailto:${patient.email}`} className="admin-appt-icon-btn" title="Email">
            <Mail className="size-3.5" />
          </a>
          <button type="button" onClick={onClose} className="admin-appt-icon-btn" title="Close">
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="admin-patient-stat-pills">
        <span className="admin-patient-stat-pill">
          <strong>{patient.visitCount}</strong> visit{patient.visitCount === 1 ? "" : "s"}
        </span>
        <span className="admin-patient-stat-pill">
          <strong>{patient.totalAppointments}</strong> booking{patient.totalAppointments === 1 ? "" : "s"}
        </span>
        {patient.treatments.length > 0 && (
          <span className="admin-patient-stat-pill admin-patient-stat-pill-muted">
            {patient.treatments.join(" · ")}
          </span>
        )}
      </div>

      {patient.clinicStatus === "new" && (
        <p className="admin-patient-banner admin-patient-banner-new">
          <UserPlus className="size-3.5 shrink-0" />
          First visit — no completed appointments yet.
        </p>
      )}

      {patient.upcoming && (
        <PatientUpcomingBanner booking={patient.upcoming} patientEmail={patient.email} />
      )}

      <div className="admin-patient-section">
        <p className="admin-patient-section-title">
          <Stethoscope className="size-3.5" />
          Visit timeline
        </p>

        {patient.treatmentHistory.length === 0 ? (
          <p className="admin-patient-empty-inline">No appointments on file.</p>
        ) : (
          <ul className="admin-patient-timeline">
            {patient.treatmentHistory.map((visit, index) => (
              <li key={visit.token} className="admin-patient-timeline-item">
                <span className="admin-patient-timeline-dot" aria-hidden />
                {index < patient.treatmentHistory.length - 1 && (
                  <span className="admin-patient-timeline-line" aria-hidden />
                )}
                <PatientTimelineVisit visit={visit} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function PatientListPlaceholder() {
  return (
    <div className="admin-patient-placeholder hidden lg:flex">
      <Users className="mb-3 size-10 text-muted/40" />
      <p className="text-sm font-medium text-slate-700">Select a patient</p>
      <p className="mt-1 max-w-xs text-center text-xs text-muted">
        Choose someone from the list to view their visit history and clinical notes.
      </p>
    </div>
  );
}

export function AdminPatientsClient({ initialPatients }: AdminPatientsClientProps) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [detail, setDetail] = useState<PatientRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const dismissedDetailRef = useRef(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return initialPatients.filter((patient) => {
      if (filter !== "all" && patient.clinicStatus !== filter) return false;
      if (!normalized) return true;
      return (
        patient.name.toLowerCase().includes(normalized) ||
        patient.email.includes(normalized) ||
        patient.phone.includes(normalized)
      );
    });
  }, [initialPatients, query, filter]);

  const counts = useMemo(() => {
    const newCount = initialPatients.filter((patient) => patient.clinicStatus === "new").length;
    return {
      all: initialPatients.length,
      new: newCount,
      returning: initialPatients.length - newCount,
    };
  }, [initialPatients]);

  async function openPatient(email: string) {
    dismissedDetailRef.current = false;
    setSelectedEmail(email);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/patients?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setDetail(data.profile ?? null);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    dismissedDetailRef.current = true;
    setSelectedEmail(null);
    setDetail(null);
  }

  useEffect(() => {
    const emailFromUrl = searchParams.get("email")?.trim().toLowerCase();
    if (!emailFromUrl) return;
    dismissedDetailRef.current = false;
    void openPatient(emailFromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedEmail(null);
      setDetail(null);
      return;
    }

    const selectedStillVisible =
      selectedEmail !== null && filtered.some((patient) => patient.email === selectedEmail);

    if (selectedStillVisible) return;

    if (dismissedDetailRef.current) return;

    if (window.matchMedia("(min-width: 1024px)").matches) {
      void openPatient(filtered[0].email);
    }
  }, [filtered, selectedEmail]);

  const filters: { id: StatusFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "new", label: "New", count: counts.new },
    { id: "returning", label: "Seen before", count: counts.returning },
  ];

  const showDetail = Boolean(detail || detailLoading || selectedEmail);

  return (
    <div className="admin-patient-page">
      <AdminPageHeader
        title="Patient records"
        description="Look up patients and review their treatment history."
        action={
          <Link href="/admin/book" className="btn-outline btn-cta-sm hidden sm:inline-flex">
            Book appointment
          </Link>
        }
      />

      <div className={`admin-patient-layout ${showDetail ? "admin-patient-layout-open" : ""}`}>
        <div className="admin-patient-list-panel">
          <div className="admin-patient-toolbar">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, or phone"
                className="input-field w-full py-2.5 pr-4 pl-10! text-sm"
              />
            </div>
            <div className="admin-patient-filters" role="tablist" aria-label="Filter patients">
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className={`admin-patient-filter ${filter === item.id ? "admin-patient-filter-active" : ""}`}
                >
                  {item.label}
                  <span className="admin-patient-filter-count">{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="admin-patient-empty">
              <Users className="size-8 shrink-0 text-muted/40" />
              <p className="text-sm text-muted">No patients match your search.</p>
            </div>
          ) : (
            <ul className="admin-patient-list">
              {filtered.map((patient) => {
                const selected = selectedEmail === patient.email;
                return (
                  <li key={patient.email}>
                    <button
                      type="button"
                      onClick={() => openPatient(patient.email)}
                      className={`admin-patient-row ${selected ? "admin-patient-row-active" : ""}`}
                    >
                      <PatientAvatar name={patient.name} />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-dark">{patient.name}</span>
                          <PatientStatusBadge status={patient.clinicStatus} />
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted">{patient.email}</span>
                        {patient.treatments.length > 0 && (
                          <span className="mt-1 block truncate text-[11px] text-slate-600">
                            {patient.treatments.slice(0, 2).join(" · ")}
                            {patient.treatments.length > 2 ? "…" : ""}
                          </span>
                        )}
                      </span>
                      <span className="admin-patient-row-meta">
                        <span className="admin-patient-visit-pill">
                          {patient.visitCount} visit{patient.visitCount === 1 ? "" : "s"}
                        </span>
                        <ChevronRight className="size-4 text-muted/60 lg:hidden" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={`admin-patient-detail-wrap ${showDetail ? "admin-patient-detail-wrap-open" : ""}`}>
          {showDetail && (
            <button
              type="button"
              className="admin-patient-backdrop lg:hidden"
              aria-label="Close patient details"
              onClick={closeDetail}
            />
          )}
          {detailLoading ? (
            <div className="admin-patient-detail admin-patient-detail-loading">
              <p className="text-sm text-muted">Loading…</p>
            </div>
          ) : detail ? (
            <PatientDetailPanel patient={detail} onClose={closeDetail} />
          ) : showDetail ? (
            <div className="admin-patient-detail">
              <p className="text-sm text-muted">Could not load this record.</p>
              <button type="button" onClick={closeDetail} className="btn-outline btn-cta-sm mt-3">
                Close
              </button>
            </div>
          ) : (
            <PatientListPlaceholder />
          )}
        </div>
      </div>
    </div>
  );
}
