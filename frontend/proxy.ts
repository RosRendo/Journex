import NextAuth from 'next-auth';
import { authConfig, AUTH_SHARED_SECRET } from '@/auth.config';

// Next.js 16: proxy.ts replaces middleware.ts.
export default NextAuth({
  secret: AUTH_SHARED_SECRET,
  ...authConfig,
}).auth;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
