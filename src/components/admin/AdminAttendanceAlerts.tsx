"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock, Loader2, Phone, UserCheck, XCircle } from "lucide-react";
import Link from "next/link";

interface AttendanceAlertItem {
  token: string;
  name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  minutesPastStart: number;
  hasLateNotice: boolean;
  lateNoticeMinutes?: number;
  lateNoticeNote?: string;
  dentistName?: string;
}

interface LateNoticeItem {
  token: string;
  name: string;
  time: string;
  lateNoticeMinutes?: number;
  lateNoticeNote?: string;
  dentistName?: string;
}

interface AlertsResponse {
  thresholdMinutes: number;
  alerts: AttendanceAlertItem[];
  lateNotices: LateNoticeItem[];
  checkedAt: string;
}

export function AdminAttendanceAlerts() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionToken, setActionToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/attendance-alerts");
      if (!res.ok) return;
      const json = (await res.json()) as AlertsResponse;
      setData(json);
      setError("");
    } catch {
      setError("Unable to refresh attendance alerts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const interval = window.setInterval(loadAlerts, 60_000);
    return () => window.clearInterval(interval);
  }, [loadAlerts]);

  async function runAction(token: string, action: "confirm-attendance" | "cancel") {
    if (action === "cancel") {
      const confirmed = window.confirm(
        "Cancel this appointment and release the time slot on the website?"
      );
      if (!confirmed) return;
    }

    setActionToken(token);
    setError("");

    try {
      const res = await fetch(`/api/admin/bookings/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Action failed.");
        return;
      }
      await loadAlerts();
    } catch {
      setError("Action failed.");
    } finally {
      setActionToken(null);
    }
  }

  if (loading && !data) {
    return (
      <section className="admin-card flex items-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" />
        Checking attendance alerts…
      </section>
    );
  }

  const alerts = data?.alerts ?? [];
  const lateNotices = data?.lateNotices ?? [];
  const threshold = data?.thresholdMinutes ?? 30;

  if (alerts.length === 0 && lateNotices.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      {alerts.length > 0 && (
        <div className="admin-card border-amber-200 bg-amber-50/80 ring-amber-100">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-dark">
                Contact patient — {threshold}+ min past appointment
              </h2>
              <p className="mt-1 text-sm text-muted">
                These confirmed visits have passed the {threshold}-minute threshold. Call the
                patient to confirm if they&apos;re still coming, or cancel to free the slot
                immediately.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.token}
                className="rounded-xl border border-amber-200/80 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-dark">{alert.name}</p>
                    <p className="text-sm text-muted">
                      {alert.time} · {alert.service}
                      {alert.dentistName ? ` · ${alert.dentistName}` : ""}
                    </p>
                    <p className="mt-1 text-xs font-medium text-amber-800">
                      {alert.minutesPastStart} min past scheduled start
                      {alert.hasLateNotice ? " · Patient reported late" : ""}
                    </p>
                    {alert.lateNoticeNote && (
                      <p className="mt-1 text-xs text-muted">
                        Patient note: {alert.lateNoticeNote}
                      </p>
                    )}
                  </div>
                  <a
                    href={`tel:${alert.phone.replace(/[^\d+]/g, "")}`}
                    className="btn-outline btn-cta-sm inline-flex"
                  >
                    <Phone className="size-4" />
                    Call
                  </a>
                </div>

                <div className="admin-actions-bar mt-4">
                  <button
                    type="button"
                    disabled={actionToken === alert.token}
                    onClick={() => runAction(alert.token, "confirm-attendance")}
                    className="btn-cta btn-cta-sm"
                  >
                    {actionToken === alert.token ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="size-4" />
                        Still coming
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={actionToken === alert.token}
                    onClick={() => runAction(alert.token, "cancel")}
                    className="btn-outline btn-cta-sm btn-outline-danger"
                  >
                    {actionToken === alert.token ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="size-4" />
                        Cancel &amp; free slot
                      </>
                    )}
                  </button>
                  <Link
                    href={`/admin/appointments?filter=today`}
                    className="btn-outline btn-cta-sm"
                  >
                    View appointment
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lateNotices.length > 0 && (
        <div className="admin-card">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            <h2 className="font-semibold text-dark">Late arrival notices today</h2>
          </div>
          <ul className="space-y-2 text-sm">
            {lateNotices.map((notice) => (
              <li
                key={notice.token}
                className="rounded-xl border border-gray-100 bg-surface/60 px-3 py-2"
              >
                <span className="font-medium text-dark">{notice.name}</span>
                <span className="text-muted">
                  {" "}
                  · {notice.time}
                  {notice.dentistName ? ` · ${notice.dentistName}` : ""}
                  {notice.lateNoticeMinutes ? ` · ~${notice.lateNoticeMinutes} min late` : ""}
                </span>
                {notice.lateNoticeNote && (
                  <span className="mt-1 block text-xs text-muted">{notice.lateNoticeNote}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
