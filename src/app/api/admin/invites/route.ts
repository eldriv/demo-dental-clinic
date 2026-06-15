import { NextResponse } from "next/server";
import { isSessionGuard, requireOwnerSessionFromRequest } from "@/lib/admin-guard";
import { getPendingDentistInvites } from "@/lib/admin-invites-store";
import { getAllAdminAccounts } from "@/lib/admin-accounts-store";
import { cancelDentistInvite, issueDentistInvite } from "@/lib/admin-dentist-invites";
import { getSiteUrlFromRequest } from "@/lib/site-url";

export async function GET(request: Request) {
  const session = await requireOwnerSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const [invites, accounts] = await Promise.all([
    getPendingDentistInvites(),
    getAllAdminAccounts(),
  ]);

  const dentistAccounts = accounts
    .filter((account) => account.role === "dentist" && account.status === "active")
    .map((account) => ({
      linkedDentistId: account.linkedDentistId,
      email: account.email,
      name: account.name,
    }));

  return NextResponse.json({
    invites,
    dentistAccounts,
  });
}

export async function POST(request: Request) {
  const session = await requireOwnerSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  try {
    const body = (await request.json()) as {
      linkedDentistId?: string;
      email?: string;
    };

    const result = await issueDentistInvite({
      linkedDentistId: body.linkedDentistId ?? "",
      email: body.email ?? "",
      createdBy: session.name,
      siteUrl: getSiteUrlFromRequest(request),
    });

    if (result.error) {
      const status = result.invite ? 200 : 400;
      return NextResponse.json(
        {
          success: Boolean(result.invite),
          invite: result.invite,
          warning: result.error,
          emailSent: !result.error?.includes("email"),
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      invite: result.invite,
      emailSent: true,
    });
  } catch {
    return NextResponse.json({ error: "Failed to send invite." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireOwnerSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Invite token is required." }, { status: 400 });
  }

  const result = await cancelDentistInvite(token);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
