"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, Loader2, Search, User } from "lucide-react";
import { services } from "@/content";
import type { PatientSummary } from "@/lib/patient-profile";
import type { TimeSlotOption } from "@/lib/booking-availability";
import { useAdminDentists } from "@/components/admin/useAdminDentists";
import { getTodayDateString } from "@/lib/admin-booking-filters";

function todayString(): string {
  return getTodayDateString();
}

export function AdminStaffBookingForm() {
  const { dentists, loading: dentistsLoading } = useAdminDentists();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [assignedDentistId, setAssignedDentistId] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [selectedTime, setSelectedTime] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlotOption[]>([]);
  const [dateClosed, setDateClosed] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientMatches, setPatientMatches] = useState<PatientSummary[]>([]);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (dentists[0]?.id && !assignedDentistId) {
      setAssignedDentistId(dentists[0].id);
    }
  }, [dentists, assignedDentistId]);

  useEffect(() => {
    if (!selectedDate || !assignedDentistId) return;
    setSlotsLoading(true);
    const params = new URLSearchParams({ date: selectedDate, dentistId: assignedDentistId });
    fetch(`/api/availability?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setDateClosed(Boolean(data.closed));
        const slots: TimeSlotOption[] = data.slots ?? [];
        setTimeSlots(slots);
        setSelectedTime((current) => {
          if (slots.some((slot) => slot.time === current && slot.available)) return current;
          return slots.find((slot) => slot.available)?.time ?? "";
        });
      })
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, assignedDentistId]);

  useEffect(() => {
    if (patientQuery.trim().length < 2) {
      setPatientMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      fetch(`/api/admin/patients?q=${encodeURIComponent(patientQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => setPatientMatches(data.patients ?? []))
        .catch(() => setPatientMatches([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [patientQuery]);

  function applyPatient(profile: PatientSummary) {
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);
    setPatientQuery("");
    setPatientMatches([]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          service,
          date: selectedDate,
          time: selectedTime,
          assignedDentistId,
          autoConfirm,
          internalNotes: internalNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Failed to create booking.");
        return;
      }
      setStatus("success");
      setMessage(
        autoConfirm
          ? `Confirmed — ${name} at ${selectedTime} on ${selectedDate}.`
          : `Created for ${name} — pending approval.`
      );
      setName("");
      setEmail("");
      setPhone("");
      setService("");
      setInternalNotes("");
      setSelectedDate(todayString());
      setSelectedTime("");
      setShowNotes(false);
    } catch {
      setStatus("error");
      setMessage("Failed to create booking.");
    }
  }

  const availableSlots = timeSlots.filter((slot) => slot.available);
  const canSubmit = Boolean(selectedTime && service && assignedDentistId && name && email && phone);

  return (
    <form onSubmit={handleSubmit} className="admin-book-form">
      {/* Returning patient — single compact row */}
      <div className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
          <input
            id="patient-search"
            type="search"
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            placeholder="Find patient by name or email (optional)"
            className="input-field py-2 pr-4 pl-9! text-sm"
          />
        </div>
        {patientMatches.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
            {patientMatches.map((profile) => (
              <li key={profile.email}>
                <button
                  type="button"
                  onClick={() => applyPatient(profile)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"
                >
                  <User className="size-3.5 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-slate-800">{profile.name}</span>
                      {profile.clinicStatus === "new" && (
                        <span className="admin-patient-badge admin-patient-badge-new">New</span>
                      )}
                    </span>
                    <span className="block text-muted">
                      {profile.email}
                      {profile.visitCount > 0
                        ? ` · ${profile.visitCount} visit${profile.visitCount === 1 ? "" : "s"}`
                        : " · No completed visits"}
                      {profile.treatments.length > 0 && ` · ${profile.treatments.slice(0, 2).join(", ")}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-book-grid">
        {/* Patient column */}
        <div className="admin-book-section">
          <p className="admin-book-section-title">Patient</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="staff-name" className="admin-book-label">Name</label>
              <input
                id="staff-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field py-2 text-sm"
                placeholder="Full name"
              />
            </div>
            <div>
              <label htmlFor="staff-phone" className="admin-book-label">Phone</label>
              <input
                id="staff-phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field py-2 text-sm"
                placeholder="09xx xxx xxxx"
              />
            </div>
            <div>
              <label htmlFor="staff-email" className="admin-book-label">Email</label>
              <input
                id="staff-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field py-2 text-sm"
                placeholder="email@example.com"
              />
            </div>
          </div>
        </div>

        {/* Schedule column */}
        <div className="admin-book-section">
          <p className="admin-book-section-title">Appointment</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="staff-date" className="admin-book-label">Date</label>
              <input
                id="staff-date"
                type="date"
                required
                min={todayString()}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime("");
                }}
                className="input-field py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="staff-dentist" className="admin-book-label">Dentist</label>
              <select
                id="staff-dentist"
                required
                value={assignedDentistId}
                onChange={(e) => setAssignedDentistId(e.target.value)}
                className="input-field py-2 text-sm"
                disabled={dentistsLoading}
              >
                {dentists.map((dentist) => (
                  <option key={dentist.id} value={dentist.id}>
                    {dentist.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="staff-service" className="admin-book-label">Service</label>
              <select
                id="staff-service"
                required
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="input-field py-2 text-sm"
              >
                <option value="">Select service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-2">
            <p className="admin-book-label mb-1.5">Time</p>
            {slotsLoading ? (
              <p className="admin-book-times-empty">
                <Loader2 className="inline size-3.5 animate-spin" /> Loading…
              </p>
            ) : dateClosed ? (
              <p className="admin-book-times-empty text-red-600">Clinic closed this day.</p>
            ) : availableSlots.length === 0 ? (
              <p className="admin-book-times-empty">No open slots — try another date or dentist.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Available times">
                {availableSlots.map((slot) => {
                  const selected = selectedTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-gray-200 bg-white text-slate-700 hover:border-primary/40"
                      }`}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer row */}
      <div className="admin-book-footer">
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={autoConfirm}
            onChange={(e) => setAutoConfirm(e.target.checked)}
            className="rounded border-gray-300"
          />
          Confirm immediately
        </label>

        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-primary"
          onClick={() => setShowNotes((open) => !open)}
        >
          Staff note
          <ChevronDown className={`size-3.5 transition-transform ${showNotes ? "rotate-180" : ""}`} />
        </button>

        <button
          type="submit"
          disabled={status === "loading" || !canSubmit || dentistsLoading}
          className="btn-cta btn-cta-sm ml-auto"
        >
          {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : "Book"}
        </button>
      </div>

      {showNotes && (
        <textarea
          id="staff-notes"
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={2}
          className="input-field text-xs"
          placeholder="Internal note — not visible to patient"
        />
      )}

      {message && (
        <p className={`text-xs ${status === "error" ? "text-red-600" : "text-green-700"}`}>{message}</p>
      )}
    </form>
  );
}
