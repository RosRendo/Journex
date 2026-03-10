import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
    const isPublicPage = isAuthPage
        || req.nextUrl.pathname.startsWith('/subscription')
        || req.nextUrl.pathname === '/'
        || req.nextUrl.pathname.startsWith('/api/stripe');

    if (isAuthPage) {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
        }
        return NextResponse.next();
    }

    if (isPublicPage) {
        return NextResponse.next();
    }

    if (!isLoggedIn) {
        let from = req.nextUrl.pathname;
        if (req.nextUrl.search) {
            from += req.nextUrl.search;
        }
        return NextResponse.redirect(
            new URL(`/auth?callbackUrl=${encodeURIComponent(from)}`, req.nextUrl)
        );
    }

    return NextResponse.next();
});

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
