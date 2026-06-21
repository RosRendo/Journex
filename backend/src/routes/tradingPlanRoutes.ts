import express from "express";
import { PrismaClient } from "@prisma/client";
import { adminGuard } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// Secure all trading plan routes behind the adminGuard
router.use(adminGuard);

// GET /api/trading-plan
router.get("/", async (req, res) => {
  try {
    const userId = "default-user";
    const plan = await prisma.tradingPlan.findUnique({
      where: { userId },
    });

    if (!plan) {
       return res.json({ exists: false });
    }
    
    res.json({ exists: true, plan });
  } catch (error) {
    console.error("Error fetching trading plan:", error);
    res.status(500).json({ error: "Failed to fetch trading plan" });
  }
});

// PUT /api/trading-plan
router.put("/", async (req, res) => {
  try {
    const userId = "default-user";
    const data = req.body;
    
    const plan = await prisma.tradingPlan.update({
      where: { userId },
      data,
    });

    res.json(plan);
  } catch (error) {
    console.error("Error updating trading plan:", error);
    res.status(500).json({ error: "Failed to update trading plan" });
  }
});

// POST /api/trading-plan/generate
router.post("/generate", async (req, res) => {
  try {
    const userId = "default-user";
    const {
      market, pairs, timeframe, strategyType, session, 
      accountSize, riskPerTrade, dailyLossLimit, goal
    } = req.body;

    // Generate static content based on the user's choices
    const generatedSections = [
      {
        title: "Executive Summary & Goal",
        content: `Your primary trading goal is: "${goal}". You will trade the ${market} market focusing on the ${session} session.`
      },
      {
        title: "Setup & Strategy",
        content: `Strategy: ${strategyType}\nTimeframe: ${timeframe}\nPairs: ${pairs.join(", ")}`
      },
      {
        title: "Risk Management",
        content: `Account Size: $${accountSize}\nRisk per trade: ${riskPerTrade}%\nDaily Loss Limit: ${dailyLossLimit}%\nYou must stop trading if your daily loss limit is hit.`
      },
      {
        title: "Psychological Rules",
        content: `- Never revenge trade after a string of losses.\n- Stick strictly to your checklist.\n- Walk away after 3 consecutive losses.`
      }
    ];

    const planData = {
      userId,
      market,
      pairs: pairs || [],
      timeframe,
      strategyType,
      session,
      accountSize,
      riskPerTrade,
      dailyLossLimit,
      goal,
      planSections: generatedSections
    };

    const plan = await prisma.tradingPlan.upsert({
      where: { userId },
      update: planData,
      create: planData,
    });

    res.json(plan);
  } catch (error) {
    console.error("Error generating trading plan:", error);
    res.status(500).json({ error: "Failed to generate trading plan" });
  }
});

export default router;
