import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// GET /api/ai/coach
router.get("/coach", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Fetch the last 50 closed trades to analyze patterns
    const recentTrades = await prisma.trade.findMany({
      where: { userId: { in: [userId, "default-user"] }, NOT: { outcome: "Open" } },
      orderBy: { closeTime: "desc" },
      take: 50,
    });

    const insights = [];
    
    // Reverse so chronologically oldest to newest for streak analysis
    const chronological = [...recentTrades].reverse();

    // 1. Tilt / Revenge Trading (Streak of losses in a short time)
    let lossStreak = 0;
    for (const trade of chronological) {
      if (Number(trade.profit) < 0) {
        lossStreak++;
      } else {
        lossStreak = 0;
      }
    }

    if (lossStreak >= 3) {
      insights.push({
        type: "danger",
        title: "Tilt Warning",
        message: `You are on a ${lossStreak}-trade losing streak. Step away from the charts to reset your psychology and protect capital.`,
      });
    }

    // 2. Out-of-session trading
    const outOfSession = recentTrades.filter(t => {
      if (!t.closeTime) return false;
      const hour = new Date(t.closeTime).getUTCHours();
      // London (7-11 UTC) and NY (13-17 UTC)
      const inLondon = hour >= 7 && hour < 11;
      const inNY = hour >= 13 && hour < 17;
      return !(inLondon || inNY);
    });

    if (outOfSession.length > 5 && recentTrades.length > 0) {
      const pct = Math.round((outOfSession.length / recentTrades.length) * 100);
      insights.push({
        type: "warning",
        title: "Dead-Zone Trading",
        message: `${pct}% of your recent trades were placed outside of London and NY killzones, potentially exposing you to low-probability, low-liquidity conditions.`,
      });
    }

    // 3. Poor risk management (Missing SL)
    const missingSL = recentTrades.filter(t => !t.sl || Number(t.sl) === 0);
    if (missingSL.length > 0) {
      insights.push({
        type: "danger",
        title: "Naked Risk",
        message: `You have ${missingSL.length} recent trades without a hard stop-loss. This is a severe breach of risk management. Always protect your downside.`,
      });
    }
    
    // 4. Positive Reinforcement
    if (insights.length === 0 && recentTrades.length > 0) {
       insights.push({
         type: "success",
         title: "Solid Discipline",
         message: "Your execution metrics look clean. Keep sticking to the plan and maintaining rigid risk management.",
       });
    }

    res.json({ success: true, insights });
  } catch (error) {
    console.error("AI Coach Error:", error);
    res.status(500).json({ error: "Failed to generate AI insights" });
  }
});

// POST /api/ai/chat
router.post("/chat", requireAuth, async (req, res) => {
  try {
    const { message, history } = req.body;
    
    // In a real app, you would pass `message` and `history` to OpenAI/Claude here,
    // along with the user's trading data for context.
    
    // For now, we simulate an intelligent context-aware response
    let response = "I am processing your request.";
    const lower = message.toLowerCase();
    
    if (lower.includes("risk") || lower.includes("exposure")) {
      response = "Your current portfolio risk is well-managed. You have 0 open positions and no floating drawdown. However, your last 3 trades were consecutive losses. I recommend reducing your risk to 0.5% on your next setup.";
    } else if (lower.includes("opportunity") || lower.includes("setup")) {
      response = "I am currently monitoring XAUUSD. There is a strong bullish accumulation pattern forming near the 2345.00 support level. Wait for a clear H1 break of structure before entering.";
    } else if (lower.includes("performance") || lower.includes("report")) {
      response = "Your win rate this week is 45%, but your profit factor is a solid 1.8. You are cutting losses quickly, which is excellent. Focus on letting your winners run slightly longer to reach the 2.5 RR target.";
    } else {
      response = "I see. Based on your current MT5 equity and recent journal history, your psychology seems stable. What specific asset or metric would you like me to analyze?";
    }

    res.json({ success: true, response });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: "AI failed to respond" });
  }
});

export default router;
