"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, Loader2, Plus, Search, Trash2, User } from "lucide-react";
import { services } from "@/content";
import type { GroupAttendee } from "@/lib/bookings";
import type { PatientSummary } from "@/lib/patient-profile";
import type { TimeSlotOption } from "@/lib/booking-availability";
import { GROUP_BOOKING_MIN_PARTY } from "@/lib/booking-group";
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
  const [isGroup, setIsGroup] = useState(false);
  const [endTime, setEndTime] = useState("");
  const [attendees, setAttendees] = useState<GroupAttendee[]>([
    { name: "", service: "" },
    { name: "", service: "" },
  ]);

  useEffect(() => {
    if (dentists[0]?.id && !assignedDentistId) {
      setAssignedDentistId(dentists[0].id);
    }
  }, [dentists, assignedDentistId]);

  useEffect(() => {
    if (!selectedDate || !assignedDentistId) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSlotsLoading(true);
      const params = new URLSearchParams({ date: selectedDate, dentistId: assignedDentistId });
      fetch(`/api/availability?${params}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setDateClosed(Boolean(data.closed));
          const slots: TimeSlotOption[] = data.slots ?? [];
          setTimeSlots(slots);
          setSelectedTime((current) => {
            if (slots.some((slot) => slot.time === current && slot.available)) return current;
            return slots.find((slot) => slot.available)?.time ?? "";
          });
          setEndTime((current) => {
            if (!current) return current;
            const startIdx = slots.findIndex((slot) => slot.time === selectedTime);
            const endIdx = slots.findIndex((slot) => slot.time === current);
            if (startIdx >= 0 && endIdx > startIdx) return current;
            return "";
          });
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
        })
        .finally(() => {
          if (!controller.signal.aborted) setSlotsLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selectedDate, assignedDentistId]);

  useEffect(() => {
    if (!endTime || !selectedTime) return;
    const startIdx = timeSlots.findIndex((slot) => slot.time === selectedTime);
    const endIdx = timeSlots.findIndex((slot) => slot.time === endTime);
    if (startIdx < 0 || endIdx <= startIdx) setEndTime("");
  }, [selectedTime, timeSlots, endTime]);

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

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setService("");
    setInternalNotes("");
    setSelectedDate(todayString());
    setSelectedTime("");
    setEndTime("");
    setShowNotes(false);
    if (isGroup) {
      setAttendees([
        { name: "", service: "" },
        { name: "", service: "" },
      ]);
    }
  }

  function updateAttendee(index: number, field: keyof GroupAttendee, value: string) {
    setAttendees((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    );
  }

  function addAttendee() {
    setAttendees((rows) => [...rows, { name: "", service: "" }]);
  }

  function removeAttendee(index: number) {
    setAttendees((rows) =>
      rows.length <= GROUP_BOOKING_MIN_PARTY ? rows : rows.filter((_, rowIndex) => rowIndex !== index)
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isGroup
            ? {
                bookingKind: "group",
                name,
                email,
                phone,
                date: selectedDate,
                time: selectedTime,
                endTime,
                attendees,
                assignedDentistId,
                autoConfirm,
                internalNotes: internalNotes || undefined,
              }
            : {
                name,
                email,
                phone,
                service,
                date: selectedDate,
                time: selectedTime,
                assignedDentistId,
                autoConfirm,
                internalNotes: internalNotes || undefined,
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Failed to create booking.");
        return;
      }
      setStatus("success");
      setMessage(
        isGroup
          ? autoConfirm
            ? `Group (${attendees.length}) confirmed — ${name}, ${selectedTime}–${endTime} on ${selectedDate}.`
            : `Group (${attendees.length}) created for ${name} — pending approval.`
          : autoConfirm
            ? `Confirmed — ${name} at ${selectedTime} on ${selectedDate}.`
            : `Created for ${name} — pending approval.`
      );
      resetForm();
    } catch {
      setStatus("error");
      setMessage("Failed to create booking.");
    }
  }

  const availableSlots = timeSlots.filter((slot) => slot.available);
  const startSlotIndex = timeSlots.findIndex((slot) => slot.time === selectedTime);
  const endTimeOptions =
    startSlotIndex >= 0 ? timeSlots.slice(startSlotIndex + 1).map((slot) => slot.time) : [];
  const attendeesValid =
    attendees.length >= GROUP_BOOKING_MIN_PARTY &&
    attendees.every((row) => row.name.trim().length >= 2 && row.service.trim());
  const canSubmit = Boolean(
    assignedDentistId &&
      name &&
      email &&
      phone &&
      selectedTime &&
      (isGroup ? endTime && attendeesValid : service)
  );

  return (
    <form onSubmit={handleSubmit} className="admin-book-form">
      <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-surface/60 px-3 py-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={isGroup}
          onChange={(e) => {
            const next = e.target.checked;
            setIsGroup(next);
            setEndTime("");
            if (next) {
              setAttendees([
                { name: "", service: "" },
                { name: "", service: "" },
              ]);
            }
          }}
          className="rounded border-gray-300"
        />
        Group appointment (staff-only)
      </label>

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
          <p className="admin-book-section-title">{isGroup ? "Organizer contact" : "Patient"}</p>
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
                required={!isGroup}
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="input-field py-2 text-sm"
                disabled={isGroup}
              >
                <option value="">{isGroup ? "Set per patient below" : "Select service"}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isGroup && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="admin-book-label mb-0">Patients in group</p>
                <button
                  type="button"
                  onClick={addAttendee}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Plus className="size-3.5" />
                  Add patient
                </button>
              </div>
              {attendees.map((attendee, index) => (
                <div key={index} className="grid gap-2 rounded-lg border border-gray-100 bg-white p-2 sm:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <label className="admin-book-label">Name</label>
                    <input
                      required
                      value={attendee.name}
                      onChange={(e) => updateAttendee(index, "name", e.target.value)}
                      className="input-field py-2 text-sm"
                      placeholder={`Patient ${index + 1}`}
                    />
                  </div>
                  <div>
                    <label className="admin-book-label">Service</label>
                    <select
                      required
                      value={attendee.service}
                      onChange={(e) => updateAttendee(index, "service", e.target.value)}
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
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeAttendee(index)}
                      disabled={attendees.length <= GROUP_BOOKING_MIN_PARTY}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-muted hover:border-red-200 hover:text-red-600 disabled:opacity-40"
                      aria-label={`Remove patient ${index + 1}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2">
            <p className="admin-book-label mb-1.5">{isGroup ? "Start time" : "Time"}</p>
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
                      onClick={() => {
                        setSelectedTime(slot.time);
                        setEndTime("");
                      }}
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

          {isGroup && selectedTime && (
            <div className="mt-3">
              <p className="admin-book-label mb-1.5">End time</p>
              {endTimeOptions.length === 0 ? (
                <p className="admin-book-times-empty">Pick a later start time or another date.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="End times">
                  {endTimeOptions.map((slotTime) => {
                    const selected = endTime === slotTime;
                    return (
                      <button
                        key={slotTime}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => setEndTime(slotTime)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          selected
                            ? "border-primary bg-primary text-white"
                            : "border-gray-200 bg-white text-slate-700 hover:border-primary/40"
                        }`}
                      >
                        {slotTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
