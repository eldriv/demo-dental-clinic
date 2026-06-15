import { NextResponse } from "next/server";
import { isSessionGuard, requireOwnerSessionFromRequest } from "@/lib/admin-guard";
import { revokeDentistDashboardAccess } from "@/lib/admin-dentist-access";

export async function DELETE(request: Request) {
  const session = await requireOwnerSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Dentist id is required." }, { status: 400 });
  }

  try {
    const result = await revokeDentistDashboardAccess(id);
    return NextResponse.json({ success: true, ...result });
  } catch {
    return NextResponse.json({ error: "Failed to revoke dashboard access." }, { status: 500 });
  }
}
