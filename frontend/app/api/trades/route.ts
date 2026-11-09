import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;

    // Unauthenticated guest: return clean empty dataset with 0 trades
    if (!user) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 },
      });
    }

    const userEmail = (user.email || "").toLowerCase();
    const userId = user.id || userEmail;
    const isAdmin =
      user.role === "admin" ||
      userEmail === "rousrendo@gmail.com" ||
      userEmail === "admin@journex.io";

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "1000", 10);
    const strategy = searchParams.get("strategy");
    const outcome = searchParams.get("outcome");
    const pair = searchParams.get("pair");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const accountNumber = searchParams.get("accountNumber");

    const skip = (page - 1) * limit;

    // Strict multi-tenant isolation:
    // Only master admin has access to legacy default/seed trades.
    // Regular and Pro users strictly see ONLY their own trades (userId).
    const where: any = isAdmin
      ? { userId: { in: [userId, "default-user", "admin-master-id", "rousrendo@gmail.com"] } }
      : { userId };

    if (accountNumber) where.accountNumber = accountNumber;
    if (strategy) where.strategy = strategy;
    if (outcome) where.outcome = outcome;
    if (pair) where.pair = pair;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.trade.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: trades,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[API TRADES GET] Database offline or unreachable. Zero fallback policy enforced:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: "Database offline or unreachable. Real trade telemetry required.",
        data: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 },
      },
      { status: 503 }
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

    const trade = await prisma.trade.create({
      data: {
        userId,
        accountNumber: body.accountNumber || null,
        date: body.date ? new Date(body.date) : new Date(),
        pair: body.pair || "EURUSD",
        strategy: body.strategy || null,
        setupType: body.setupType || null,
        entry: body.entry !== undefined ? body.entry : 0,
        sl: body.sl !== undefined ? body.sl : null,
        tp: body.tp !== undefined ? body.tp : null,
        rr: body.rr !== undefined ? String(body.rr) : null,
        outcome: body.outcome || "BREAK_EVEN",
        notes: body.notes || null,
        imageUrl: body.imageUrl || null,
        direction: body.direction || "BUY",
        profit: body.profit !== undefined ? body.profit : 0,
        lotSize: body.lotSize !== undefined ? body.lotSize : null,
        emotion: body.emotion || null,
        followedPlan: body.followedPlan !== undefined ? Boolean(body.followedPlan) : null,
        planDeviationReason: body.planDeviationReason || null,
        checklistPassed: body.checklistPassed !== undefined ? Boolean(body.checklistPassed) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: trade,
    }, { status: 201 });
  } catch (error: any) {
    console.error("[API TRADES POST ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
