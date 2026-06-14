import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { isSessionGuard, requireAdminSessionFromRequest } from "@/lib/admin-guard";
import {
  deleteScheduleBlock,
  getAllScheduleBlocks,
  saveScheduleBlock,
} from "@/lib/schedule-blocks";
import { isValidDentistId } from "@/lib/dentists-store";

export async function GET(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const blocks = await getAllScheduleBlocks();
  return NextResponse.json({ blocks });
}

export async function POST(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  try {
    const body = (await request.json()) as {
      date?: string;
      endDate?: string;
      reason?: string;
      providerId?: string;
    };

    if (!body.date?.trim()) {
      return NextResponse.json({ error: "Start date is required." }, { status: 400 });
    }

    const providerId = body.providerId?.trim() || undefined;
    if (providerId && !(await isValidDentistId(providerId))) {
      return NextResponse.json({ error: "Invalid dentist selected." }, { status: 400 });
    }

    const block = {
      id: uuidv4(),
      providerId,
      date: body.date.trim(),
      endDate: body.endDate?.trim() || undefined,
      reason: body.reason?.trim() || undefined,
      createdBy: session.sub,
      createdAt: new Date().toISOString(),
    };

    await saveScheduleBlock(block);
    return NextResponse.json({ success: true, block });
  } catch {
    return NextResponse.json({ error: "Failed to save block." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Block id is required." }, { status: 400 });
  }

  const deleted = await deleteScheduleBlock(id);
  if (!deleted) {
    return NextResponse.json({ error: "Block not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
