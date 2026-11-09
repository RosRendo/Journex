import type { NextAuthConfig } from "next-auth";

export const AUTH_SHARED_SECRET =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "journex-super-secret-auth-key-2026-production-ready-98214";

/**
 * Edge-compatible auth config.
 * NO providers here — providers use Node.js APIs (bcrypt, etc.)
 * that cannot run in the Edge runtime.
 * This is used ONLY by middleware/proxy.
 */
export const authConfig: NextAuthConfig = {
  secret: AUTH_SHARED_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/auth" },
  providers: [], // populated in auth.ts (Node runtime only)
  // We run behind Railway proxy / Cloudflare in the unified server — trust the Host header
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const user = auth?.user as any;

      const isAuthPage = pathname.startsWith("/auth");
      const isPublicPage =
        isAuthPage ||
        pathname.startsWith("/subscription") ||
        pathname.startsWith("/pricing") ||
        pathname === "/robots.txt" ||
        pathname === "/sitemap.xml" ||
        pathname === "/manifest.webmanifest" ||
        pathname === "/";

      if (isAuthPage) {
        // Redirect logged-in users away from auth pages to their intended callbackUrl or /dashboard
        if (isLoggedIn) {
          const callbackUrl = nextUrl.searchParams.get("callbackUrl");
          const target =
            callbackUrl && !callbackUrl.startsWith("/auth")
              ? callbackUrl
              : "/dashboard";
          return Response.redirect(new URL(target, nextUrl));
        }
        return true;
      }

      // API endpoints (NextAuth, bridge, backend, ws) must stay public to return JSON instead of HTML redirect
      if (
        pathname.startsWith("/api/") ||
        pathname.startsWith("/uploads/")
      ) return true;

      if (isPublicPage) return true;

      // Protect all other routes — require login
      if (!isLoggedIn) {
        const from = pathname + (nextUrl.search ?? "");
        return Response.redirect(
          new URL(`/auth?callbackUrl=${encodeURIComponent(from)}`, nextUrl),
        );
      }

      // ── Admin-Only Routes Gate ──────────────────────────────
      // Sensitive owner tools: Live Execution Terminal (/terminal),
      // Playbook learning notes, MT5 scripts, bot EA, custom indicators are strictly restricted.
      // NOTE: /macro and /macro/[pair] are public to all authenticated users (Macro Intel & 24/7 Charts).
      const normalizedPath = pathname.toLowerCase();
      const isAdminRoute =
        normalizedPath.startsWith("/script") ||
        normalizedPath.startsWith("/playbook") ||
        normalizedPath.startsWith("/bot") ||
        normalizedPath.startsWith("/indicator") ||
        normalizedPath.startsWith("/terminal");

      const userEmail = (user?.email || "").toLowerCase().trim();
      const envAdmins = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
        .split(",")
        .map((e) => e.toLowerCase().trim())
        .filter(Boolean);
      const defaultAdmins = ["rousrendo@gmail.com", "admin@journex.io"];
      const allowedAdmins = new Set([...defaultAdmins, ...envAdmins]);

      const isAdmin =
        user?.role === "admin" ||
        allowedAdmins.has(userEmail);

      if (isAdminRoute && !isAdmin) {
        return Response.redirect(new URL("/dashboard?denied=admin_only", nextUrl));
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
