import { NextResponse } from "next/server";
import { isSessionGuard, requireAdminSessionFromRequest } from "@/lib/admin-guard";
import { addDentist, deleteDentist, getAllDentists } from "@/lib/dentists-store";

export async function GET(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const dentists = await getAllDentists();
  return NextResponse.json({ dentists });
}

export async function POST(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  try {
    const body = (await request.json()) as { name?: string };
    const dentist = await addDentist(body.name ?? "");
    return NextResponse.json({ success: true, dentist });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add dentist.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Dentist id is required." }, { status: 400 });
  }

  try {
    await deleteDentist(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete dentist.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
