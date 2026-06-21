import NextAuth from "next-auth";
import { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { SignJWT } from "jose";

const ADMIN_EMAIL = "rousrendo@gmail.com";

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
      if (!credentials?.email || !credentials?.password) return null;
      
      const email = (credentials.email as string).toLowerCase().trim();
      const password = credentials.password as string;

      // In production, restrict credentials login to only the admin email and a secure ADMIN_PASSWORD
      const adminPassword = process.env.ADMIN_PASSWORD || "rousrendo123";
      if (email === ADMIN_EMAIL && password === adminPassword) {
        return {
          id: "admin-user",
          name: "Ros Rendo",
          email: ADMIN_EMAIL,
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
          const adminEmails = [ADMIN_EMAIL];
          token.isPro = adminEmails.includes(user.email ?? "");
          token.plan = token.isPro ? "lifetime" : "free";
          token.trialEndsAt = token.isPro ? null : (token.createdAt as number) + 7 * 24 * 60 * 60 * 1000;
        } else {
          // Credentials provider (already validated password in authorize)
          token.isPro = true;
          token.plan = "lifetime";
          token.trialEndsAt = null;
        }
      }

      // Generate the cryptographically signed JWT for the backend on every run to keep it fresh
      if (token.email) {
        try {
          const secret = new TextEncoder().encode(process.env.API_SECRET_KEY || "dev-api-secret-key-change-in-prod");
          token.apiToken = await new SignJWT({ email: token.email })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("1d")
            .sign(secret);
        } catch (err) {
          console.error("Failed to sign API token:", err);
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
        (session.user as any).apiToken = token.apiToken; // Expose signed JWT to client components
        
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

