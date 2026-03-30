import NextAuth from "next-auth";
import { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

// Build providers array conditionally
const providers: NextAuthConfig["providers"] = [];

// Only add Google if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

// Always add credentials provider
providers.push(
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      // ── Mock Lifetime User ──────────────────────────────────────
      // Accept any non-empty email + password combo.
      // All credential logins are treated as a lifetime-plan user.
      // Replace with a real DB lookup before going live.
      if (credentials?.email && credentials?.password) {
        return {
          id: "mock-lifetime-user",
          name: "Ros Rendo",
          email: credentials.email as string,
          image: null,
        };
      }
      return null;
    },
  }),
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        // Stamp createdAt once on first sign-in
        if (!token.createdAt) {
          token.createdAt = Date.now();
        }

        // Google OAuth users: check if this is YOUR email for lifetime
        if (account?.provider === "google") {
          const adminEmails = ["rousrendo@gmail.com"];
          token.isPro = adminEmails.includes(user.email ?? "");
          token.plan = token.isPro ? "lifetime" : "free";
          token.trialEndsAt = token.isPro ? null : (token.createdAt as number) + 7 * 24 * 60 * 60 * 1000;
        } else {
          // Credentials provider → always lifetime mock
          token.isPro = true;
          token.plan = "lifetime";
          token.trialEndsAt = null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).isPro = token.isPro;
        (session.user as any).plan = token.plan;
        (session.user as any).trialEndsAt = token.trialEndsAt;
        (session.user as any).createdAt = token.createdAt;
        // Compute trial expiry for easy consumption by client components
        const trialEnd = token.trialEndsAt as number | null;
        (session.user as any).isTrialExpired =
          trialEnd !== null && Date.now() > trialEnd;
        (session.user as any).trialDaysLeft = trialEnd
          ? Math.max(0, Math.ceil((trialEnd - Date.now()) / (1000 * 60 * 60 * 24)))
          : null;
      }
      return session;
    },
  },
  secret:
    process.env.NEXTAUTH_SECRET || "dev-fallback-secret-change-in-production",
});
