import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Next.js 16: proxy.ts replaces middleware.ts.
// Runs the edge-compatible NextAuth `authorized` callback (route protection
// + trial gate defined in auth.config.ts) on every matched request.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
