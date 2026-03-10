import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                // ── Demo mode: accept any non-empty email/password ──
                // Replace this block with a real DB lookup before production.
                if (credentials?.email && credentials?.password) {
                    return {
                        id: "demo-user-1",
                        name: "Trader",
                        email: credentials.email as string,
                        image: null,
                    };
                }
                return null;
            },
        }),
    ],
    session: { strategy: "jwt" },
    pages: { signIn: "/auth" },
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;

                // --- Mock Database Logic ---
                // In production, fetch this from a real database.
                if (user.email === "rousrendo@gmail.com") {
                    token.isPro = true; // Lifetime admin/pro
                } else {
                    // For anyone else, set a fake trial expiration. To demo the "Expired" state, 
                    // we'll pretend non-pro users who login with "expired@demo.com" are already expired.
                    // For others, we pretend their 7-day trial started 8 days ago (so they are expired) 
                    // EXCEPT if they just signed up (we'll make regular users expired by default so you can see the gate).
                    token.isPro = false;
                    token.trialEndsAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Expired 1 day ago
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).isPro = token.isPro;
                (session.user as any).trialEndsAt = token.trialEndsAt;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET ?? "fallback-dev-secret-change-in-prod",
});
