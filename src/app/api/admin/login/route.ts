import { NextResponse } from "next/server";
import {
  authenticateAdmin,
  createSessionTokenForAccount,
  sessionCookieOptions,
  LOGIN_GENERIC_ERROR,
} from "@/lib/admin-auth";
import {
  checkLoginRateLimit,
  clearLoginAttempts,
  getClientIp,
  isValidLoginEmail,
  LOGIN_RATE_LIMIT_MESSAGE,
  recordFailedLoginAttempt,
  requiresEmailFormatLogin,
} from "@/lib/admin-login-rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    if (await checkLoginRateLimit(ip)) {
      return NextResponse.json({ error: LOGIN_RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: LOGIN_GENERIC_ERROR }, { status: 401 });
    }

    if (requiresEmailFormatLogin() && !isValidLoginEmail(email)) {
      await recordFailedLoginAttempt(ip);
      return NextResponse.json({ error: LOGIN_GENERIC_ERROR }, { status: 401 });
    }

    const account = await authenticateAdmin(email, password);
    if (!account) {
      await recordFailedLoginAttempt(ip);
      return NextResponse.json({ error: LOGIN_GENERIC_ERROR }, { status: 401 });
    }

    await clearLoginAttempts(ip);

    const token = await createSessionTokenForAccount(account);
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
    return NextResponse.json({ error: LOGIN_GENERIC_ERROR }, { status: 500 });
  }
}
