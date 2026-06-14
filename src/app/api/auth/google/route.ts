import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/calendar";

export async function GET() {
  const authUrl = getGoogleAuthUrl();

  if (!authUrl) {
    return NextResponse.json(
      {
        error:
          "Google Calendar OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      },
      { status: 500 }
    );
  }

  return NextResponse.redirect(authUrl);
}
