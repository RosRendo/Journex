import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  try {
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
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Allow public pages
    if (isPublicPage) {
      return NextResponse.next();
    }

    // Protect all other routes
    if (!isLoggedIn) {
      const callbackUrl = `${pathname}${request.nextUrl.search || ""}`;
      return NextResponse.redirect(
        new URL(
          `/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`,
          request.url,
        ),
      );
    }

    return NextResponse.next();
  } catch (error) {
    // If middleware fails, allow the request to proceed
    // This prevents middleware errors from blocking the app
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
