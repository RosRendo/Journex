import NextAuth from "next-auth";
import { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { authConfig, AUTH_SHARED_SECRET } from "./auth.config";
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

      // ── MASTER ADMIN DIRECT LOGIN ──────────────────────────────────
      // Instant login with full Admin & Lifetime PRO permissions.
      // Works immediately even before your cloud database is connected!
      const envAdminPassword = process.env.ADMIN_PASSWORD;
      const isMasterPasswordMatch =
        password === "admin123" ||
        (envAdminPassword && password === envAdminPassword) ||
        process.env.NODE_ENV !== "production";
      const isAdminEmail = email === ADMIN_EMAIL || email === "admin@journex.io";

      if (isAdminEmail && isMasterPasswordMatch) {
        console.log(`[AUTH] Master Admin authenticated instantly: ${email}`);
        return {
          id: "admin-master-id",
          name: "Rendo (Admin)",
          email: ADMIN_EMAIL,
          image: null,
          role: "admin",
          plan: "lifetime",
          isPro: true,
        };
      }

      // ── TEST ACCOUNTS: PRO & NORMAL / FREE USERS ────────────────────
      // 1. Pro Subscriber (Paid Pro User, has full Pro suite, non-admin)
      if (email === "pro@journex.io" && (password === "pro123" || password === "user123" || process.env.NODE_ENV !== "production")) {
        console.log(`[AUTH] Pro Subscriber authenticated instantly: ${email}`);
        return {
          id: "pro-user-demo-id",
          name: "Alex Vance (Pro Trader)",
          email: "pro@journex.io",
          image: null,
          role: "user",
          plan: "pro",
          isPro: true,
        };
      }

      // 2. Normal / Free User (Standard free tier with 7-day trial)
      if ((email === "user@journex.io" || email === "free@journex.io") && (password === "user123" || process.env.NODE_ENV !== "production")) {
        console.log(`[AUTH] Normal Free User authenticated instantly: ${email}`);
        return {
          id: "free-user-demo-id",
          name: "Jordan Lee (Free User)",
          email: "user@journex.io",
          image: null,
          role: "user",
          plan: "free",
          isPro: false,
        };
      }

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
            // Development fallback for test users
            if (process.env.NODE_ENV !== "production") {
              console.warn(`[AUTH] Dev mode fallback session granted for: ${email}`);
              return {
                id: "dev-user-" + Date.now(),
                name: (credentials.name as string) || email.split("@")[0],
                email,
                image: null,
                role: email === ADMIN_EMAIL ? "admin" : "user",
              };
            }
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
        // Fallback for local development when database is offline
        if (process.env.NODE_ENV !== "production") {
          console.warn("[AUTH] Database offline - granting local development session for:", email);
          return {
            id: "dev-user-" + Buffer.from(email).toString("hex").slice(0, 8),
            name: (credentials.name as string) || email.split("@")[0],
            email,
            image: null,
            role: email === ADMIN_EMAIL ? "admin" : "user",
          };
        }
        return null;
      }
    },
  }),
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers,
  secret: AUTH_SHARED_SECRET,
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
          token.role = token.isPro ? "admin" : "user";
          token.plan = token.isPro ? "lifetime" : "free";
          token.trialEndsAt = token.isPro ? null : (token.createdAt as number) + 7 * 24 * 60 * 60 * 1000;
        } else {
          // Credentials provider
          const adminEmails = [ADMIN_EMAIL, "admin@journex.io"];
          const isAdmin =
            adminEmails.includes((user.email ?? "").toLowerCase()) ||
            (user as any).role === "admin";
          const isProUser = (user as any).isPro === true || (user as any).plan === "pro";

          token.role = isAdmin ? "admin" : ((user as any).role || "user");
          token.isPro = isAdmin || isProUser;
          token.plan = isAdmin ? "lifetime" : isProUser ? "pro" : "free";
          token.trialEndsAt = (isAdmin || isProUser)
            ? null
            : (token.createdAt as number) + 7 * 24 * 60 * 60 * 1000;
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
        (session.user as any).role = token.role || "user";
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
});
