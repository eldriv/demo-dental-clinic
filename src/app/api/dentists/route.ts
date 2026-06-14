import { NextResponse } from "next/server";
import { getAllDentists } from "@/lib/dentists-store";

export async function GET() {
  const dentists = await getAllDentists();
  return NextResponse.json({
    dentists: dentists.map(({ id, name }) => ({ id, name })),
  });
}
