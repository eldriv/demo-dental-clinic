import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/admin-auth";
import { getAdminAccountById } from "@/lib/admin-accounts";
import { listBookingsForAdmin, filterTodayForDentist } from "@/lib/admin-bookings";
import { groupBookingsByPatient } from "@/lib/patient-profile";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminMyDayClient } from "@/components/admin/AdminMyDayClient";

export const dynamic = "force-dynamic";

export default async function AdminMyDayPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/admin/login");

  const account = await getAdminAccountById(session.sub);
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
  const patientsByEmail = groupBookingsByPatient(bookings);
  const patientStatusByEmail = Object.fromEntries(
    todayBookings.map((booking) => {
      const email = booking.email.trim().toLowerCase();
      const patientBookings = patientsByEmail.get(email) ?? [];
      const hasCompletedVisit = patientBookings.some((entry) => entry.status === "completed");
      return [email, hasCompletedVisit ? "returning" : "new"] as const;
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
