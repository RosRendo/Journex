import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const accountId = parseInt(id, 10);
    const body = await req.json().catch(() => ({}));
    const days = body.days || 90;

    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    // Attempt to contact MT5 bridge on-demand
    const bridgeUrl =
      process.env.BRIDGE_URL ||
      (process.env.VERCEL ? "https://python.dashboardkiller.online" : "http://127.0.0.1:5003");

    try {
      const bridgeRes = await fetch(`${bridgeUrl}/api/sync-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          server: account.mt5Server,
          login: account.accountNumber,
          password: account.mt5Password || "",
          days,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (bridgeRes.ok) {
        const syncData = await bridgeRes.json();
        return NextResponse.json({
          success: true,
          message: `Successfully synced trades from ${account.mt5Server || "MT5"}`,
          data: syncData,
        });
      }
    } catch (_) {}

    // Fallback if desktop bridge is currently off
    return NextResponse.json({
      success: false,
      error: "MT5 Bridge is currently offline. Ensure MetaTrader 5 and start_production.ps1 are running on your computer.",
    });
  } catch (error: any) {
    console.error("[ACCOUNTS SYNC ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Sync execution failed" },
      { status: 500 }
    );
  }
}
