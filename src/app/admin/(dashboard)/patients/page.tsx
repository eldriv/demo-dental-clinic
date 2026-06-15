import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/admin-auth";
import { listBookingsForAdmin } from "@/lib/admin-bookings";
import { listPatientSummaries } from "@/lib/patient-profile";
import { AdminPatientsClient } from "@/components/admin/AdminPatientsClient";

export const dynamic = "force-dynamic";

export default async function AdminPatientsPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/admin/login");

  const bookings = await listBookingsForAdmin();
  const patients = listPatientSummaries(bookings);

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading patients…</div>}>
      <AdminPatientsClient initialPatients={patients} />
    </Suspense>
  );
}
