import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config.
 * NO providers here — providers use Node.js APIs (bcrypt, etc.)
 * that cannot run in the Edge runtime.
 * This is used ONLY by middleware.ts.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/auth" },
  providers: [], // populated in auth.ts (Node runtime only)
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const isAuthPage = pathname.startsWith("/auth");
      const isPublicPage =
        isAuthPage || pathname.startsWith("/subscription") || pathname === "/";

      if (isAuthPage) {
        // Redirect logged-in users away from auth pages
        if (isLoggedIn)
          return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      if (isPublicPage) return true;

      // Protect all other routes
      if (!isLoggedIn) {
        const from = pathname + (nextUrl.search ?? "");
        return Response.redirect(
          new URL(`/auth?callbackUrl=${encodeURIComponent(from)}`, nextUrl),
        );
      }

      return true;
    },
  },
};
