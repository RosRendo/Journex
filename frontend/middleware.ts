import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if user has a session/token (check for auth cookie)
  const token =
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isLoggedIn = !!token;
  const isAuthPage = pathname.startsWith("/auth");
  const isPublicPage =
    isAuthPage ||
    pathname.startsWith("/subscription") ||
    pathname === "/" ||
    pathname.startsWith("/api/stripe");

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  // Allow public pages
  if (isPublicPage) {
    return NextResponse.next();
  }

  // Protect all other routes
  if (!isLoggedIn) {
    const from = pathname + (request.nextUrl.search ?? "");
    return NextResponse.redirect(
      new URL(`/auth?callbackUrl=${encodeURIComponent(from)}`, request.nextUrl),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
