import type { AdminAccount } from "@/content/admin";
import {
  createAdminAccountId,
  findAdminAccountByEmail,
  findAdminAccountById,
  findAdminAccountByLinkedDentistId,
  getAllAdminAccounts,
  saveAdminAccount,
  type StoredAdminAccount,
} from "@/lib/admin-accounts-store";
import { hashAdminPassword } from "@/lib/admin-password";

export function toAdminAccount(stored: StoredAdminAccount): AdminAccount {
  return {
    id: stored.id,
    email: stored.email,
    name: stored.name,
    role: stored.role,
    linkedDentistId: stored.linkedDentistId,
  };
}

export async function getAdminAccountById(id: string): Promise<AdminAccount | undefined> {
  const stored = await findAdminAccountById(id);
  return stored ? toAdminAccount(stored) : undefined;
}

export async function getAdminAccountByEmail(
  email: string
): Promise<AdminAccount | undefined> {
  const stored = await findAdminAccountByEmail(email);
  return stored ? toAdminAccount(stored) : undefined;
}

export async function getDentistLoginSummary(): Promise<
  Array<{
    linkedDentistId: string;
    email?: string;
    accountStatus: "none" | "active";
  }>
> {
  const accounts = await getAllAdminAccounts();
  return accounts
    .filter((account) => account.role === "dentist" && account.status === "active")
    .map((account) => ({
      linkedDentistId: account.linkedDentistId ?? "",
      email: account.email,
      accountStatus: "active" as const,
    }))
    .filter((entry) => entry.linkedDentistId);
}

export async function createDentistAccountFromInvite(input: {
  email: string;
  name: string;
  linkedDentistId: string;
  password: string;
  invitedBy: string;
}): Promise<AdminAccount> {
  const existingEmail = await findAdminAccountByEmail(input.email);
  if (existingEmail) {
    throw new Error("An account with this email already exists.");
  }

  const existingDentist = await findAdminAccountByLinkedDentistId(input.linkedDentistId);
  if (existingDentist) {
    throw new Error("This dentist already has an active login.");
  }

  const email = input.email.trim().toLowerCase();
  const account: StoredAdminAccount = {
    id: createAdminAccountId("dentist", email),
    email,
    name: input.name.trim(),
    role: "dentist",
    linkedDentistId: input.linkedDentistId,
    passwordHash: await hashAdminPassword(input.password),
    createdAt: new Date().toISOString(),
    invitedBy: input.invitedBy,
    status: "active",
  };

  await saveAdminAccount(account);
  return toAdminAccount(account);
}
