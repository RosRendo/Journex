/**
 * GET /api/bridge-status
 *
 * Returns the current bridge URL configured on the SERVER (Railway).
 * This lets the frontend fetch the bridge URL at runtime instead of
 * having it baked into the JS bundle at build time.
 *
 * Set BRIDGE_URL as a SERVER-SIDE env var on Railway (not NEXT_PUBLIC_).
 * This way you can change the ngrok/Cloudflare URL any time without redeploying.
 */
import { NextResponse } from "next/server";

export async function GET() {
  const bridgeUrl =
    process.env.BRIDGE_URL ||           // server-side only (Railway env var)
    process.env.NEXT_PUBLIC_BRIDGE_URL || // fallback to public var
    "http://localhost:5003";

  return NextResponse.json({
    url: bridgeUrl,
    mode: process.env.TRADE_MODE || "local",
  });
}
