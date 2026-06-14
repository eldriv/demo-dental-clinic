"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { ClinicOperatingSettings, ClinicHoursDisplay } from "@/lib/clinic-settings";
import { DAY_OPTIONS, TIME_OPTIONS, buildHoursDisplay } from "@/lib/clinic-settings";

interface AdminHoursClientProps {
  initialSettings: ClinicOperatingSettings;
  initialHours: ClinicHoursDisplay;
}

export function AdminHoursClient({
  initialSettings,
  initialHours,
}: AdminHoursClientProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [savedHours, setSavedHours] = useState(initialHours);
  const [hasLunchBreak, setHasLunchBreak] = useState(
    Boolean(initialSettings.lunchStart && initialSettings.lunchEnd)
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const preview = useMemo(() => {
    const draft: ClinicOperatingSettings = {
      ...settings,
      lunchStart: hasLunchBreak ? settings.lunchStart : null,
      lunchEnd: hasLunchBreak ? settings.lunchEnd : null,
    };
    return buildHoursDisplay(draft);
  }, [settings, hasLunchBreak]);

  function toggleDay(day: number) {
    setSettings((current) => {
      const operatingDays = current.operatingDays.includes(day)
        ? current.operatingDays.filter((value) => value !== day)
        : [...current.operatingDays, day];
      return { ...current, operatingDays: operatingDays.sort((a, b) => a - b) };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...settings,
        lunchStart: hasLunchBreak ? settings.lunchStart : null,
        lunchEnd: hasLunchBreak ? settings.lunchEnd : null,
      };

      const res = await fetch("/api/admin/clinic-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save hours.");
        return;
      }

      setSettings(data.settings);
      setSavedHours(data.hours);
      setMessage("Clinic hours updated. The website booking form now uses these times.");
    } catch {
      setError("Failed to save hours.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Clinic Hours & Availability"
        description="Set when the clinic is open and which times patients can book online. Changes apply immediately to the website."
      />

      <form onSubmit={handleSubmit} className="admin-card space-y-6">
        <section className="space-y-3">
          <h2 className="font-semibold text-dark">Open days</h2>
          <div className="flex flex-wrap gap-2">
            {DAY_OPTIONS.map(({ label, value }) => {
              const active = settings.operatingDays.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleDay(value)}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-white"
                      : "bg-surface text-dark ring-1 ring-gray-200"
                  }`}
                >
                  {label.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="openTime" className="mb-1.5 block text-sm font-medium text-gray-700">
              Opens at
            </label>
            <select
              id="openTime"
              value={settings.openTime}
              onChange={(e) => setSettings({ ...settings, openTime: e.target.value })}
              className="input-field"
            >
              {TIME_OPTIONS.map((time) => (
                <option key={`open-${time}`} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="closeTime" className="mb-1.5 block text-sm font-medium text-gray-700">
              Closes at
            </label>
            <select
              id="closeTime"
              value={settings.closeTime}
              onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })}
              className="input-field"
            >
              {TIME_OPTIONS.map((time) => (
                <option key={`close-${time}`} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="slotInterval" className="mb-1.5 block text-sm font-medium text-gray-700">
              Slot interval
            </label>
            <select
              id="slotInterval"
              value={settings.slotIntervalMinutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  slotIntervalMinutes: Number(e.target.value),
                })
              }
              className="input-field"
            >
              {[15, 30, 45, 60].map((minutes) => (
                <option key={minutes} value={minutes}>
                  Every {minutes} minutes
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={hasLunchBreak}
              onChange={(e) => setHasLunchBreak(e.target.checked)}
              className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            Lunch break (no appointments)
          </label>

          {hasLunchBreak && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="lunchStart" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Lunch starts
                </label>
                <select
                  id="lunchStart"
                  value={settings.lunchStart ?? "12:00 PM"}
                  onChange={(e) => setSettings({ ...settings, lunchStart: e.target.value })}
                  className="input-field"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={`lunch-start-${time}`} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lunchEnd" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Lunch ends
                </label>
                <select
                  id="lunchEnd"
                  value={settings.lunchEnd ?? "1:00 PM"}
                  onChange={(e) => setSettings({ ...settings, lunchEnd: e.target.value })}
                  className="input-field"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={`lunch-end-${time}`} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-primary">{message}</p>}

        <button type="submit" disabled={loading} className="btn-cta">
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Save operating hours"}
        </button>
      </form>

      <section className="admin-card space-y-4">
        <h2 className="font-semibold text-dark">Website preview</h2>
        <p className="text-sm text-muted">{preview.summary}</p>
        <ul className="space-y-1 text-sm text-muted">
          {preview.schedule.map((item) => (
            <li key={item.days}>
              <span className="font-medium text-dark">{item.days}:</span> {item.hours}
            </li>
          ))}
        </ul>
        <div>
          <p className="mb-2 text-sm font-medium text-dark">
            Booking time slots ({preview.timeSlots.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {preview.timeSlots.map((slot) => (
              <span
                key={slot}
                className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-800"
              >
                {slot}
              </span>
            ))}
          </div>
        </div>
        {savedHours.timeSlots.length !== preview.timeSlots.length && (
          <p className="text-xs text-muted">
            Live site currently shows {savedHours.timeSlots.length} slots until you save.
          </p>
        )}
      </section>
    </div>
  );
}
