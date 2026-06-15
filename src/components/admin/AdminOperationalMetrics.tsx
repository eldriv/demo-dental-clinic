import type { Booking } from "@/lib/bookings";
import { getOperationalMetrics } from "@/lib/admin-analytics";

interface AdminOperationalMetricsProps {
  bookings: Booking[];
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="admin-analytics-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-dark">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function AdminOperationalMetrics({ bookings }: AdminOperationalMetricsProps) {
  const metrics = getOperationalMetrics(bookings);

  return (
    <section className="space-y-3">
      <h2 className="admin-dash-panel-title px-0.5">Operations (30 days)</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="No-show rate" value={`${metrics.noShowRate}%`} />
        <MetricCard
          label="Avg pending time"
          value={metrics.avgPendingHours > 0 ? `${metrics.avgPendingHours}h` : "—"}
        />
        <MetricCard
          label="Booking sources"
          value={`${metrics.webBookings} web`}
          hint={`${metrics.staffBookings} staff-created`}
        />
        <MetricCard label="Utilization" value={`${metrics.utilizationPercent}%`} />
        <MetricCard
          label="Follow-ups"
          value={String(metrics.followUpsPending)}
          hint="Needing staff action"
        />
      </div>
    </section>
  );
}
