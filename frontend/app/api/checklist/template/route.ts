import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || (session?.user as any)?.email || "default-user";

    let template = await prisma.checklistTemplate.findUnique({
      where: { userId },
    });

    if (!template) {
      template = await prisma.checklistTemplate.create({
        data: {
          userId,
          questions: [
            { id: 1, text: "Am I following my written trading plan?" },
            { id: 2, text: "Am I risking 1% or less on this trade?" },
            { id: 3, text: "Is this a FOMO or Revenge trade?" },
          ],
          blockingQuestions: [3],
          passThreshold: 100,
          overrideAllowed: true,
        },
      });
    }

    return NextResponse.json(template);
  } catch (error: any) {
    console.error("[API CHECKLIST GET ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || (session?.user as any)?.email || "default-user";
    const body = await req.json();
    const { questions, blockingQuestions, passThreshold, overrideAllowed } = body;

    const template = await prisma.checklistTemplate.upsert({
      where: { userId },
      update: { questions, blockingQuestions, passThreshold, overrideAllowed },
      create: {
        userId,
        questions,
        blockingQuestions,
        passThreshold,
        overrideAllowed,
      },
    });

    return NextResponse.json(template);
  } catch (error: any) {
    console.error("[API CHECKLIST PUT ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
