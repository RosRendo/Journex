import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    url: "/api/bridge",
    mode: process.env.TRADE_MODE || "local",
  });
}
