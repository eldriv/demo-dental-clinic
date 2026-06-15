import {
  createDentistInvite,
  getDentistInviteByToken,
  isInviteExpired,
  markDentistInviteAccepted,
  revokeDentistInvite,
  type DentistInvite,
} from "@/lib/admin-invites-store";
import {
  createDentistAccountFromInvite,
  getAdminAccountByEmail,
} from "@/lib/admin-accounts";
import {
  findAdminAccountByLinkedDentistId,
  findAdminAccountByEmail as findStoredAccountByEmail,
} from "@/lib/admin-accounts-store";
import { getDentistById } from "@/lib/dentists-store";
import { sendDentistInviteEmail } from "@/lib/email";
import { validateNewPassword } from "@/lib/admin-password";

export async function issueDentistInvite(input: {
  linkedDentistId: string;
  email: string;
  createdBy: string;
  siteUrl?: string;
}): Promise<{ invite?: DentistInvite; error?: string }> {
  const dentistId = input.linkedDentistId.trim();
  const email = input.email.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  const dentist = await getDentistById(dentistId);
  if (!dentist) {
    return { error: "Dentist not found." };
  }

  const existingAccount = await findAdminAccountByLinkedDentistId(dentistId);
  if (existingAccount) {
    return { error: "This dentist already has an active login." };
  }

  const emailTaken = await getAdminAccountByEmail(email);
  if (emailTaken) {
    return { error: "An account with this email already exists." };
  }

  const invite = await createDentistInvite({
    email,
    name: dentist.name,
    linkedDentistId: dentistId,
    createdBy: input.createdBy,
  });

  const emailResult = await sendDentistInviteEmail(invite, input.siteUrl);
  if (!emailResult.sent) {
    return {
      invite,
      error:
        emailResult.error === "SMTP not configured"
          ? "Invite created but email is not configured. Share the accept link manually."
          : `Invite created but email failed to send: ${emailResult.error}`,
    };
  }

  return { invite };
}

export async function validateDentistInviteToken(
  token: string
): Promise<{ invite?: DentistInvite; error?: string }> {
  const invite = await getDentistInviteByToken(token.trim());
  if (!invite) {
    return { error: "This invite link is invalid." };
  }
  if (invite.status === "revoked") {
    return { error: "This invite has been revoked. Ask the clinic owner for a new one." };
  }
  if (invite.status === "accepted") {
    return { error: "This invite has already been used. You can sign in instead." };
  }
  if (isInviteExpired(invite)) {
    return { error: "This invite has expired. Ask the clinic owner for a new one." };
  }

  const existingAccount = await findAdminAccountByLinkedDentistId(invite.linkedDentistId);
  if (existingAccount) {
    return { error: "This dentist already has an active login." };
  }

  return { invite };
}

export async function acceptDentistInvite(input: {
  token: string;
  password: string;
}): Promise<{ success?: boolean; error?: string }> {
  const validation = await validateDentistInviteToken(input.token);
  if (validation.error || !validation.invite) {
    return { error: validation.error ?? "Invalid invite." };
  }

  const passwordError = validateNewPassword(input.password);
  if (passwordError) {
    return { error: passwordError };
  }

  const invite = validation.invite;
  const emailTaken = await findStoredAccountByEmail(invite.email);
  if (emailTaken) {
    return { error: "An account with this email already exists." };
  }

  await createDentistAccountFromInvite({
    email: invite.email,
    name: invite.name,
    linkedDentistId: invite.linkedDentistId,
    password: input.password,
    invitedBy: invite.createdBy,
  });

  await markDentistInviteAccepted(invite.token);
  return { success: true };
}

export async function cancelDentistInvite(
  token: string
): Promise<{ invite?: DentistInvite; error?: string }> {
  const invite = await revokeDentistInvite(token.trim());
  if (!invite) {
    return { error: "Invite not found." };
  }
  return { invite };
}
