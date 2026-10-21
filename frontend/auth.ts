import NextAuth from "next-auth";
import { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
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

// Add GitHub only if credentials are available (button hidden in /auth unless enabled)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  );
}

import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";

// Always add credentials provider
providers.push(
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      name: { label: "Name", type: "text" },
      isRegister: { label: "Is Register", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      
      const email = (credentials.email as string).toLowerCase().trim();
      const password = credentials.password as string;
      const isReg = credentials.isRegister === "true" || credentials.isRegister === true || String(credentials.isRegister) === "true";

      try {
        if (isReg) {
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (existingUser) {
            console.warn(`[AUTH] User already exists with email: ${email}`);
            return null;
          }

          // Hash password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          const role = email === ADMIN_EMAIL ? "admin" : "user";

          const user = await prisma.user.create({
            data: {
              email,
              password: hashedPassword,
              name: (credentials.name as string) || "",
              role,
            },
          });

          console.log(`[AUTH] Successfully registered new user: ${email} (${role})`);
          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            image: null,
            role: user.role,
          };
        } else {
          // Login existing user
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            console.warn(`[AUTH] User not found: ${email}`);
            return null;
          }

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            console.warn(`[AUTH] Password mismatch for: ${email}`);
            return null;
          }

          console.log(`[AUTH] Successfully authenticated user: ${email} (${user.role})`);
          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            image: null,
            role: user.role,
          };
        }
      } catch (error) {
        console.error("[AUTH] Direct database authentication error:", error);
        return null;
      }
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
          token.apiToken = await new SignJWT({ email: token.email, isPro: token.isPro })
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

