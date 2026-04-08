import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/checklist/template
router.get("/template", async (req, res) => {
  try {
    // Hardcoded userId for now, replace with req.user from auth middleware
    const userId = "default-user";
    let template = await prisma.checklistTemplate.findUnique({
      where: { userId },
    });

    if (!template) {
      // Return a default template if none exists
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

    res.json(template);
  } catch (error) {
    console.error("Error fetching checklist template:", error);
    res.status(500).json({ error: "Failed to fetch template" });
  }
});

// PUT /api/checklist/template
router.put("/template", async (req, res) => {
  try {
    const userId = "default-user";
    const { questions, blockingQuestions, passThreshold, overrideAllowed } = req.body;

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

    res.json(template);
  } catch (error) {
    console.error("Error updating checklist template:", error);
    res.status(500).json({ error: "Failed to update template" });
  }
});

// POST /api/checklist/submit
router.post("/submit", async (req, res) => {
  try {
    const userId = "default-user";
    const { answers } = req.body; // e.g. { "1": true, "2": true, "3": false }

    const template = await prisma.checklistTemplate.findUnique({
      where: { userId },
    });

    if (!template) {
      return res.status(404).json({ error: "Checklist template not found" });
    }

    let passedCount = 0;
    const blockingReasons: string[] = [];
    const questions = template.questions as Array<{ id: number; text: string }>;
    const blockingQuestions = template.blockingQuestions as number[];

    questions.forEach((q) => {
      const answeredYes = answers[q.id.toString()] === true;
      if (answeredYes) {
        passedCount++;
        // If it's a blocking question and they answered YES (e.g. FOMO trade = Yes), it blocks.
        if (blockingQuestions.includes(q.id)) {
            blockingReasons.push(q.text);
        }
      }
    });

    const passRate = Math.round((passedCount / questions.length) * 100);
    const passedThreshold = passRate >= template.passThreshold;
    const passed = passedThreshold && blockingReasons.length === 0;

    res.json({
      passed,
      passRate,
      reasons: blockingReasons.length > 0 ? blockingReasons : passedThreshold ? [] : ["Did not meet pass threshold"],
    });

  } catch (error) {
    console.error("Error submitting checklist:", error);
    res.status(500).json({ error: "Failed to submit checklist" });
  }
});

export default router;
