import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast, optimistic gate for the admin area: visitors without a session cookie are sent to the
 * login page before any admin code runs. The real check (session lookup + role) happens on
 * every admin page, server action and API route.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = request.cookies.has("ska_admin") || request.cookies.has("__Host-ska_admin");
  if (hasCookie) return NextResponse.next();

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const url = new URL("/admin/login", request.url);
    if (pathname !== "/admin") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
