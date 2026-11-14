import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PUT(
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
    const body = await req.json();

    const updateData: any = {};
    if (body.brokerName !== undefined) updateData.brokerName = body.brokerName;
    if (body.accountNumber !== undefined) updateData.accountNumber = String(body.accountNumber);
    if (body.mt5Server !== undefined) updateData.mt5Server = body.mt5Server;
    if (body.mt5Password !== undefined) updateData.mt5Password = body.mt5Password;
    if (body.isMaster !== undefined) updateData.isMaster = Boolean(body.isMaster);
    if (body.copierEnabled !== undefined) updateData.copierEnabled = Boolean(body.copierEnabled);
    if (body.copierMultiplier !== undefined) updateData.copierMultiplier = Number(body.copierMultiplier);
    if (body.balance !== undefined) updateData.balance = Number(body.balance);
    if (body.equity !== undefined) updateData.equity = Number(body.equity);

    const updated = await prisma.account.update({
      where: { id: accountId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        balance: Number(updated.balance || 0),
        equity: Number(updated.equity || 0),
        copierMultiplier: Number(updated.copierMultiplier || 1),
      },
    });
  } catch (error: any) {
    console.error("[ACCOUNTS PUT ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update account" },
      { status: 500 }
    );
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
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const accountId = parseInt(id, 10);

    await prisma.account.delete({
      where: { id: accountId },
    });

    return NextResponse.json({ success: true, message: "Account deleted" });
  } catch (error: any) {
    console.error("[ACCOUNTS DELETE ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete account" },
      { status: 500 }
    );
  }
}
