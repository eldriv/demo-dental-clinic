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

  return <AdminPatientsClient initialPatients={patients} />;
}
