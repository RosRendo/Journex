import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * NextAuth middleware for Vercel Edge Runtime
 * Protects routes that require authentication
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    // Protect all routes except public pages and API
    "/((?!api|_next/static|_next/image|favicon.ico|auth|subscription|^/$).*)",
  ],
};
