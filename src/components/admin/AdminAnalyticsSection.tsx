import type { Booking } from "@/lib/bookings";
import { getCumulativePatientsByMonth, getPatientChartYMax } from "@/lib/admin-analytics";
import { AdminNewPatientsChart } from "@/components/admin/AdminNewPatientsChart";
import { AdminTopTreatmentsCard } from "@/components/admin/AdminTopTreatmentsCard";

interface AdminAnalyticsSectionProps {
  bookings: Booking[];
  initialYear: number;
  initialMonth: number;
}

export function AdminAnalyticsSection({
  bookings,
  initialYear,
  initialMonth,
}: AdminAnalyticsSectionProps) {
  const patientSeries = getCumulativePatientsByMonth(bookings, 6);
  const chartYMax = getPatientChartYMax(patientSeries.map((point) => point.count));

  return (
    <section className="space-y-3">
      <h2 className="admin-dash-panel-title px-0.5">Analytics</h2>
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminNewPatientsChart data={patientSeries} yMax={chartYMax} />
        <AdminTopTreatmentsCard
          bookings={bookings}
          initialYear={initialYear}
          initialMonth={initialMonth}
        />
      </div>
    </section>
  );
}
