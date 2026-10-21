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
      const user = auth?.user as any;

      const isAuthPage = pathname.startsWith("/auth");
      const isPublicPage =
        isAuthPage ||
        pathname.startsWith("/subscription") ||
        pathname === "/";

      if (isAuthPage) {
        // Redirect logged-in users away from auth pages
        if (isLoggedIn)
          return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      // NextAuth API endpoints (sign-in callbacks, session polling) must stay public
      if (pathname.startsWith("/api/auth")) return true;

      if (isPublicPage) return true;

      // Protect all other routes — require login
      if (!isLoggedIn) {
        const from = pathname + (nextUrl.search ?? "");
        return Response.redirect(
          new URL(`/auth?callbackUrl=${encodeURIComponent(from)}`, nextUrl),
        );
      }

      // ── Trial Gate ──────────────────────────────────────────
      // If trial has expired AND user is not a paid subscriber, bounce them.
      if (user?.isTrialExpired && !user?.isPro) {
        return Response.redirect(new URL("/subscription", nextUrl));
      }

      return true;
    },
  },
};
