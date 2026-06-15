import { removeDentistAdminAccount } from "@/lib/admin-accounts-store";
import { revokeAllInvitesForDentist } from "@/lib/admin-invites-store";

/** Remove dashboard login and cancel pending invites; keeps the dentist profile. */
export async function revokeDentistDashboardAccess(linkedDentistId: string): Promise<{
  accountRemoved: boolean;
  invitesRevoked: number;
}> {
  const [accountRemoved, invitesRevoked] = await Promise.all([
    removeDentistAdminAccount(linkedDentistId),
    revokeAllInvitesForDentist(linkedDentistId),
  ]);

  return { accountRemoved, invitesRevoked };
}
