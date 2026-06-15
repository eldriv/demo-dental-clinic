import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/admin-auth";
import { getAdminAccountById } from "@/content/admin";
import { listBookingsForAdmin, filterTodayForDentist } from "@/lib/admin-bookings";
import { getPatientRecord } from "@/lib/patient-profile";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminMyDayClient } from "@/components/admin/AdminMyDayClient";

export const dynamic = "force-dynamic";

export default async function AdminMyDayPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/admin/login");

  const account = getAdminAccountById(session.sub);
  const dentistId = account?.linkedDentistId;

  if (!dentistId) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="My Day" />
        <p className="text-sm text-muted">This account is not linked to a dentist profile.</p>
      </div>
    );
  }

  const bookings = await listBookingsForAdmin();
  const todayBookings = filterTodayForDentist(bookings, dentistId);
  const patientStatusByEmail = Object.fromEntries(
    todayBookings.map((booking) => {
      const record = getPatientRecord(bookings, booking.email);
      return [booking.email.trim().toLowerCase(), record?.clinicStatus ?? "new"];
    })
  );

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="My Day"
        description={
          todayBookings.length === 0
            ? "No visits scheduled for today."
            : `${todayBookings.length} appointment${todayBookings.length === 1 ? "" : "s"} · tap a row for notes`
        }
      />
      <AdminMyDayClient
        initialBookings={todayBookings}
        patientStatusByEmail={patientStatusByEmail}
      />
    </div>
  );
}
