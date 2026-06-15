import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/admin-auth";
import { canCreateStaffBookings } from "@/content/admin";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStaffBookingForm } from "@/components/admin/AdminStaffBookingForm";

export const dynamic = "force-dynamic";

export default async function AdminBookPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/admin/login");
  if (!canCreateStaffBookings(session.role)) redirect("/admin");

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Book appointment"
        description="Walk-in or phone — defaults to today and confirms immediately."
      />
      <AdminStaffBookingForm />
    </div>
  );
}
