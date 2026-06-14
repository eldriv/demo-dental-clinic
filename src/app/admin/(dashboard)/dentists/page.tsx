import { getAllDentists } from "@/lib/dentists-store";
import { AdminDentistsClient } from "@/components/admin/AdminDentistsClient";

export const dynamic = "force-dynamic";

export default async function AdminDentistsPage() {
  const dentists = await getAllDentists();
  return <AdminDentistsClient initialDentists={dentists} />;
}
