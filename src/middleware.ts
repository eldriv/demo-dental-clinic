import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionTokenEdge, ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import {
  getDefaultAdminPath,
  isDentistRole,
  isOwnerOnlyPath,
  isStaffOnlyPath,
} from "@/content/admin";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi =
    pathname.startsWith("/api/admin") &&
    !pathname.startsWith("/api/admin/login");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/login")) {
    return NextResponse.next();
  }

  if (
    pathname === "/admin/accept-invite" ||
    pathname.startsWith("/api/admin/invites/accept")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = token ? await verifySessionTokenEdge(token) : null;

  if (!session) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isDentistRole(session.role)) {
    if (pathname === "/admin") {
      return NextResponse.redirect(new URL("/admin/my-day", request.url));
    }
    if (isAdminPage && (isOwnerOnlyPath(pathname) || isStaffOnlyPath(pathname))) {
      return NextResponse.redirect(new URL("/admin/my-day", request.url));
    }
  }

  if (isAdminPage && isOwnerOnlyPath(pathname) && session.role !== "owner") {
    return NextResponse.redirect(new URL(getDefaultAdminPath(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
