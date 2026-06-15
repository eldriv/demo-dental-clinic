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
import { getSessionFromCookies } from "@/lib/admin-auth";
import { canViewAnalytics } from "@/content/admin";
import { DentistLeaveOverview } from "@/components/admin/DentistLeaveOverview";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminCalendarOverview } from "@/components/admin/AdminCalendarOverview";
import { AdminAttendanceAlerts } from "@/components/admin/AdminAttendanceAlerts";
import { AdminDashboardPanels } from "@/components/admin/AdminDashboardPanels";
import { AdminAnalyticsSection } from "@/components/admin/AdminAnalyticsSection";
import { AdminMorningBoard } from "@/components/admin/AdminMorningBoard";
import { AdminOperationalMetrics } from "@/components/admin/AdminOperationalMetrics";
import { needsStaffApproval } from "@/lib/booking-status";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const session = await getSessionFromCookies();
  const showAnalytics = session ? canViewAnalytics(session.role) : false;

  const [bookings, blocks, dentists] = await Promise.all([
    listBookingsForAdmin(),
    getAllScheduleBlocks(),
    getAllDentists(),
  ]);

  const todayBookings = filterTodayBookings(bookings);
  const pending = bookings.filter((booking) => needsStaffApproval(booking));
  const todayLabel = getTodayDateString();
  const today = new Date();
  const initialYear = today.getFullYear();
  const initialMonth = today.getMonth();

  const allLeaves = listUpcomingDentistLeaves(blocks, dentists, todayLabel);
  const todayLeaves = listTodayUnavailableDentists(allLeaves);
  const upcomingLeaves = allLeaves.filter((leave) => !leave.isToday);

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Dashboard" />

      <AdminMorningBoard bookings={todayBookings} />

      <AdminDashboardPanels pendingBookings={pending} todayBookings={todayBookings} />

      {showAnalytics && (
        <>
          <AdminOperationalMetrics bookings={bookings} />
          <AdminAnalyticsSection
            bookings={bookings}
            initialYear={initialYear}
            initialMonth={initialMonth}
          />
        </>
      )}

      <AdminAttendanceAlerts />

      <AdminCalendarOverview bookings={bookings} />

      <DentistLeaveOverview todayLeaves={todayLeaves} upcomingLeaves={upcomingLeaves} />
    </div>
  );
}
