import { NextResponse } from "next/server";

/**
 * Proxy that fetches the TradingView widget script and serves it
 * with correct headers so it's not blocked by ORB.
 * Called from the client as /api/tv-script
 */
export async function GET() {
    const res = await fetch(
        "https://s3.tradingview.com/external-embedding/embed-uhart-v3.js",
        { next: { revalidate: 3600 } } // cache for 1 hour
    );

    if (!res.ok) {
        return new NextResponse("Failed to fetch TradingView script", { status: 502 });
    }

    const text = await res.text();

    return new NextResponse(text, {
        headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "public, max-age=3600",
            // Allow any origin to use this proxied script
            "Access-Control-Allow-Origin": "*",
        },
    });
}
