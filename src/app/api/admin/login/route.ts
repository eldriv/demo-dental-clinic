import { NextResponse } from "next/server";
import {
  authenticateAdmin,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const account = await authenticateAdmin(email, password);
    if (!account) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await createSessionToken(account);
    const response = NextResponse.json({
      success: true,
      user: {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
      },
    });

    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
