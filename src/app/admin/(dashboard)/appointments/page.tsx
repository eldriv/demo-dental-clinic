import { listBookingsForAdmin } from "@/lib/admin-bookings";
import { AdminAppointmentsPageClient } from "@/components/admin/AdminAppointmentsClient";

export const dynamic = "force-dynamic";

interface AppointmentsPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function AdminAppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const params = await searchParams;
  const filterParam = params.filter;
  const initialFilter =
    filterParam === "pending" || filterParam === "all" || filterParam === "today"
      ? filterParam
      : "today";

  const bookings = await listBookingsForAdmin();

  return (
    <AdminAppointmentsPageClient
      initialBookings={bookings}
      initialFilter={initialFilter}
    />
  );
}
