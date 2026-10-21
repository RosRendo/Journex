import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || (session?.user as any)?.email || "default-user";
    const body = await req.json();
    const { answers } = body;

    const template = await prisma.checklistTemplate.findUnique({
      where: { userId },
    });

    if (!template) {
      return NextResponse.json({ error: "Checklist template not found" }, { status: 404 });
    }

    let passedCount = 0;
    const blockingReasons: string[] = [];
    const questions = template.questions as Array<{ id: number; text: string }>;
    const blockingQuestions = (template.blockingQuestions as number[]) || [];

    questions.forEach((q) => {
      const answeredYes = answers && answers[q.id.toString()] === true;
      if (answeredYes) {
        passedCount++;
        if (blockingQuestions.includes(q.id)) {
          blockingReasons.push(q.text);
        }
      }
    });

    const passRate = Math.round((passedCount / questions.length) * 100);
    const passedThreshold = passRate >= template.passThreshold;
    const passed = passedThreshold && blockingReasons.length === 0;

    return NextResponse.json({
      passed,
      passRate,
      reasons: blockingReasons.length > 0 ? blockingReasons : passedThreshold ? [] : ["Did not meet pass threshold"],
    });
  } catch (error: any) {
    console.error("[API CHECKLIST SUBMIT ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
