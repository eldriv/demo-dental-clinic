import {
  CalendarDays,
  ClipboardList,
  Clock,
} from "lucide-react";
import {
  filterTodayBookings,
  getTodayDateString,
  listBookingsForAdmin,
} from "@/lib/admin-bookings";
import { getAllScheduleBlocks } from "@/lib/schedule-blocks";
import { getAllDentists } from "@/lib/dentists-store";
import {
  listTodayUnavailableDentists,
  listUpcomingDentistLeaves,
} from "@/lib/dentist-leave";
import { AdminAppointmentsClient } from "@/components/admin/AdminAppointmentsClient";
import { DentistLeaveOverview } from "@/components/admin/DentistLeaveOverview";
import {
  AdminPageHeader,
  AdminSectionHeader,
} from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminCalendarOverview } from "@/components/admin/AdminCalendarOverview";
import { needsStaffApproval } from "@/lib/booking-status";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [bookings, blocks, dentists] = await Promise.all([
    listBookingsForAdmin(),
    getAllScheduleBlocks(),
    getAllDentists(),
  ]);

  const todayBookings = filterTodayBookings(bookings);
  const pending = bookings.filter((booking) => needsStaffApproval(booking));
  const todayLabel = getTodayDateString();

  const allLeaves = listUpcomingDentistLeaves(blocks, dentists, todayLabel);
  const todayLeaves = listTodayUnavailableDentists(allLeaves);
  const upcomingLeaves = allLeaves.filter((leave) => !leave.isToday);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard"
        description="Here's what's happening at the clinic — appointments, approvals, and staff availability."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard
          label="Today's visits"
          value={todayBookings.length}
          href="/admin/appointments?filter=today"
          icon={CalendarDays}
          accent="primary"
        />
        <AdminStatCard
          label="Needs approval"
          value={pending.length}
          href="/admin/appointments?filter=pending"
          icon={Clock}
          accent="amber"
        />
        <AdminStatCard
          label="All bookings"
          value={bookings.length}
          href="/admin/appointments?filter=all"
          icon={ClipboardList}
          accent="blue"
        />
      </div>

      <AdminCalendarOverview bookings={bookings} />

      <DentistLeaveOverview todayLeaves={todayLeaves} upcomingLeaves={upcomingLeaves} />

      <section className="space-y-4">
        <AdminSectionHeader
          title={`Today — ${todayLabel}`}
          href="/admin/appointments?filter=today"
        />
        <AdminAppointmentsClient initialBookings={todayBookings.slice(0, 5)} compact />
      </section>

      <section className="space-y-4">
        <AdminSectionHeader
          title="Pending approval"
          href="/admin/appointments?filter=pending"
        />
        <AdminAppointmentsClient initialBookings={pending.slice(0, 3)} compact />
      </section>
    </div>
  );
}
