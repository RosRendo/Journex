import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = (user.email || "").toLowerCase();
    const userId = user.id || userEmail;
    const isAdmin =
      user.role === "admin" ||
      userEmail === "rousrendo@gmail.com" ||
      userEmail === "admin@journex.io";

    const { id } = await params;
    const tradeId = parseInt(id, 10);
    if (isNaN(tradeId)) {
      return NextResponse.json({ error: "Invalid trade ID" }, { status: 400 });
    }

    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { profitLoss: true },
    });

    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    if (!isAdmin && trade.userId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: trade });
  } catch (error: any) {
    console.error("[API TRADE GET BY ID ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = (user.email || "").toLowerCase();
    const userId = user.id || userEmail;
    const isAdmin =
      user.role === "admin" ||
      userEmail === "rousrendo@gmail.com" ||
      userEmail === "admin@journex.io";

    const { id } = await params;
    const tradeId = parseInt(id, 10);
    if (isNaN(tradeId)) {
      return NextResponse.json({ error: "Invalid trade ID" }, { status: 400 });
    }

    const existing = await prisma.trade.findUnique({ where: { id: tradeId } });
    if (!existing) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    if (!isAdmin && existing.userId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.pair !== undefined) updateData.pair = body.pair;
    if (body.date !== undefined) updateData.date = new Date(body.date);
    if (body.strategy !== undefined) updateData.strategy = body.strategy;
    if (body.setupType !== undefined) updateData.setupType = body.setupType;
    if (body.entry !== undefined) updateData.entry = body.entry;
    if (body.sl !== undefined) updateData.sl = body.sl;
    if (body.tp !== undefined) updateData.tp = body.tp;
    if (body.rr !== undefined) updateData.rr = String(body.rr);
    if (body.outcome !== undefined) updateData.outcome = body.outcome;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.direction !== undefined) updateData.direction = body.direction;
    if (body.profit !== undefined) updateData.profit = body.profit;
    if (body.lotSize !== undefined) updateData.lotSize = body.lotSize;
    if (body.emotion !== undefined) updateData.emotion = body.emotion;
    if (body.followedPlan !== undefined) updateData.followedPlan = body.followedPlan;
    if (body.planDeviationReason !== undefined) updateData.planDeviationReason = body.planDeviationReason;
    if (body.checklistPassed !== undefined) updateData.checklistPassed = body.checklistPassed;

    const trade = await prisma.trade.update({
      where: { id: tradeId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: trade });
  } catch (error: any) {
    console.error("[API TRADE PUT ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = (user.email || "").toLowerCase();
    const userId = user.id || userEmail;
    const isAdmin =
      user.role === "admin" ||
      userEmail === "rousrendo@gmail.com" ||
      userEmail === "admin@journex.io";

    const { id } = await params;
    const tradeId = parseInt(id, 10);
    if (isNaN(tradeId)) {
      return NextResponse.json({ error: "Invalid trade ID" }, { status: 400 });
    }

    const existing = await prisma.trade.findUnique({ where: { id: tradeId } });
    if (!existing) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    if (!isAdmin && existing.userId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.trade.delete({
      where: { id: tradeId },
    });

    return NextResponse.json({ success: true, message: "Trade deleted" });
  } catch (error: any) {
    console.error("[API TRADE DELETE ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
