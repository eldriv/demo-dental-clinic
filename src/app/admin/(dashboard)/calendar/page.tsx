import { listBookingsForAdmin } from "@/lib/admin-bookings";
import { getAllScheduleBlocks } from "@/lib/schedule-blocks";
import { getClinicHoursDisplay } from "@/lib/clinic-settings-store";
import { getAllDentists } from "@/lib/dentists-store";
import { AdminCalendarView } from "@/components/admin/AdminCalendarView";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const [bookings, blocks, hours, dentists] = await Promise.all([
    listBookingsForAdmin(),
    getAllScheduleBlocks(),
    getClinicHoursDisplay(),
    getAllDentists(),
  ]);

  return (
    <AdminCalendarView
      initialBookings={bookings}
      initialBlocks={blocks}
      timeSlots={hours.timeSlots}
      dentists={dentists}
    />
  );
}
