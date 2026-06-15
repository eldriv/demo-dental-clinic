import { getAllDentists } from "@/lib/dentists-store";
import { getPendingDentistInvites } from "@/lib/admin-invites-store";
import { loadFreshAdminAccounts } from "@/lib/admin-accounts-store";
import { purgeLegacyDemoData } from "@/lib/legacy-demo-data-purge";
import { AdminDentistsClient } from "@/components/admin/AdminDentistsClient";

export const dynamic = "force-dynamic";

export default async function AdminDentistsPage() {
  await purgeLegacyDemoData();

  const [dentists, invites, accounts] = await Promise.all([
    getAllDentists(),
    getPendingDentistInvites(),
    loadFreshAdminAccounts(),
  ]);

  const dentistAccounts = accounts
    .filter((account) => account.role === "dentist" && account.status === "active")
    .map((account) => ({
      linkedDentistId: account.linkedDentistId,
      email: account.email,
      name: account.name,
    }));

  return (
    <AdminDentistsClient
      initialDentists={dentists}
      initialInvites={invites}
      initialAccounts={dentistAccounts}
    />
  );
}
