import { NextResponse } from "next/server";
import { isSessionGuard, requireAdminSessionFromRequest } from "@/lib/admin-guard";
import { getAllBookings } from "@/lib/bookings-store";
import {
  findPatientByEmailPrefix,
  getPatientRecord,
  listPatientSummaries,
  type PatientClinicStatus,
} from "@/lib/patient-profile";

export async function GET(request: Request) {
  const session = await requireAdminSessionFromRequest(request);
  if (isSessionGuard(session)) return session;

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim() ?? "";
  const query = searchParams.get("q")?.trim() ?? "";
  const list = searchParams.get("list");
  const statusParam = searchParams.get("status");

  const bookings = await getAllBookings();

  if (email) {
    const profile = getPatientRecord(bookings, email);
    return NextResponse.json({ profile });
  }

  if (list === "1" || list === "true") {
    const status: PatientClinicStatus | "all" =
      statusParam === "new" || statusParam === "returning" ? statusParam : "all";
    const patients = listPatientSummaries(bookings, { query, status });
    return NextResponse.json({ patients });
  }

  if (query.length >= 2) {
    return NextResponse.json({ patients: findPatientByEmailPrefix(bookings, query) });
  }

  return NextResponse.json({ error: "Provide email, q, or list=1." }, { status: 400 });
}
