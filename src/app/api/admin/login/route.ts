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
  recordFailedLoginAttempt,
  requiresEmailFormatLogin,
} from "@/lib/admin-login-rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    const rateLimit = await checkLoginRateLimit(ip);
    if (rateLimit.limited) {
      const response = NextResponse.json(
        { error: rateLimit.message ?? LOGIN_GENERIC_ERROR },
        { status: 429 }
      );
      if (rateLimit.retryAfterSeconds) {
        response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
      }
      return response;
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
