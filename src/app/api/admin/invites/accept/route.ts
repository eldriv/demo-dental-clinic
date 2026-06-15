import { NextResponse } from "next/server";
import {
  acceptDentistInvite,
  validateDentistInviteToken,
} from "@/lib/admin-dentist-invites";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Invite token is required." }, { status: 400 });
  }

  const result = await validateDentistInviteToken(token);
  if (result.error || !result.invite) {
    return NextResponse.json({ error: result.error ?? "Invalid invite." }, { status: 400 });
  }

  return NextResponse.json({
    invite: {
      email: result.invite.email,
      name: result.invite.name,
      expiresAt: result.invite.expiresAt,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      password?: string;
      confirmPassword?: string;
    };

    const token = body.token?.trim() ?? "";
    const password = body.password ?? "";
    const confirmPassword = body.confirmPassword ?? "";

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const result = await acceptDentistInvite({ token, password });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}
