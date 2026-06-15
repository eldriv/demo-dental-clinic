import type { StoredAdminAccount } from "@/lib/admin-accounts-store";
import type { DentistInvite } from "@/lib/admin-invites-store";
import type { ClinicDentist } from "@/lib/dentists";

/** Demo profiles auto-seeded before v2 — removed from all environments. */
export const LEGACY_SEED_DENTIST_IDS = ["dr-chen", "dr-patel"] as const;

const LEGACY_SEED_DENTIST_ID_SET = new Set<string>(LEGACY_SEED_DENTIST_IDS);

const LEGACY_SEED_ADMIN_ACCOUNT_IDS = new Set(["dentist-dr-chen", "dentist-dr-patel"]);

export function isLegacySeedDentistId(id: string): boolean {
  return LEGACY_SEED_DENTIST_ID_SET.has(id);
}

export function filterLegacySeedDentists(dentists: ClinicDentist[]): ClinicDentist[] {
  return dentists.filter((dentist) => !isLegacySeedDentistId(dentist.id));
}

export function filterLegacySeedInvites(invites: DentistInvite[]): DentistInvite[] {
  return invites.filter((invite) => !isLegacySeedDentistId(invite.linkedDentistId));
}

export function filterLegacySeedAdminAccounts(
  accounts: StoredAdminAccount[]
): StoredAdminAccount[] {
  return accounts.filter(
    (account) =>
      !LEGACY_SEED_ADMIN_ACCOUNT_IDS.has(account.id) &&
      !(account.linkedDentistId && isLegacySeedDentistId(account.linkedDentistId))
  );
}

export function countLegacySeedRecords(input: {
  dentists: ClinicDentist[];
  invites: DentistInvite[];
  accounts: StoredAdminAccount[];
}): number {
  return (
    input.dentists.filter((d) => isLegacySeedDentistId(d.id)).length +
    input.invites.filter((i) => isLegacySeedDentistId(i.linkedDentistId)).length +
    input.accounts.filter(
      (a) =>
        LEGACY_SEED_ADMIN_ACCOUNT_IDS.has(a.id) ||
        (a.linkedDentistId != null && isLegacySeedDentistId(a.linkedDentistId))
    ).length
  );
}
