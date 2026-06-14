import { NextResponse } from "next/server";
import { getSessionFromCookies, verifySessionToken } from "@/lib/admin-auth";
import type { AdminSession } from "@/lib/admin-auth";

export async function requireAdminSession(): Promise<AdminSession | NextResponse> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return session;
}

export async function requireAdminSessionFromRequest(
  request: Request
): Promise<AdminSession | NextResponse> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]+)/);
  const token = match?.[1];

  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const session = await verifySessionToken(decodeURIComponent(token));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return session;
}

export function isSessionGuard(
  value: AdminSession | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}

export async function requireOwnerSessionFromRequest(
  request: Request
): Promise<AdminSession | NextResponse> {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  if (session.role !== "owner") {
    return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  }

  return session;
}
