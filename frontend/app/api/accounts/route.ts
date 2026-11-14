import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!user) {
      return NextResponse.json({ success: true, data: [], accounts: [] });
    }

    const userEmail = (user.email || "").toLowerCase();
    const userId = user.id || userEmail;
    const isAdmin =
      user.role === "admin" ||
      userEmail === "rousrendo@gmail.com" ||
      userEmail === "admin@journex.io";

    const where: any = isAdmin
      ? { userId: { in: [userId, "default-user", "admin-master-id", "rousrendo@gmail.com"] } }
      : { userId };

    const rawAccounts = await prisma.account.findMany({
      where,
      orderBy: { id: "asc" },
    });

    const accounts = rawAccounts.map((a: any) => ({
      ...a,
      balance: a.balance != null ? Number(a.balance) : 0,
      equity: a.equity != null ? Number(a.equity) : 0,
      copierMultiplier: a.copierMultiplier != null ? Number(a.copierMultiplier) : 1,
    }));

    return NextResponse.json({
      success: true,
      data: accounts,
      accounts,
    });
  } catch (error: any) {
    console.error("[ACCOUNTS GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch accounts", data: [], accounts: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id || user.email || "default-user";
    const body = await req.json();

    const created = await prisma.account.create({
      data: {
        userId,
        brokerName: body.brokerName || "MetaTrader 5",
        accountNumber: String(body.accountNumber),
        mt5Server: body.mt5Server || null,
        mt5Password: body.mt5Password || null,
        balance: body.balance != null ? Number(body.balance) : 0,
        equity: body.equity != null ? Number(body.equity) : 0,
        isMaster: Boolean(body.isMaster),
        copierEnabled: Boolean(body.copierEnabled),
        copierMultiplier: body.copierMultiplier != null ? Number(body.copierMultiplier) : 1.0,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...created,
        balance: Number(created.balance || 0),
        equity: Number(created.equity || 0),
        copierMultiplier: Number(created.copierMultiplier || 1),
      },
    });
  } catch (error: any) {
    console.error("[ACCOUNTS POST ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
