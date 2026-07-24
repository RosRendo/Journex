import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// GET /api/dashboard/stats
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const closedTrades = await prisma.trade.findMany({
      where: { userId, NOT: { outcome: "Open" } },
      orderBy: { closeTime: "asc" },
    });

    if (closedTrades.length === 0) {
      return res.json({
        winRate: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        capitalFlow: []
      });
    }

    const pnls = closedTrades.map(t => Number(t.profit));
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    
    const winRate = pnls.length ? Math.round((wins.length / pnls.length) * 1000) / 10 : 0;
    
    const totalWins = wins.reduce((a, b) => a + b, 0);
    const totalLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
    const profitFactor = totalLosses > 0 ? Math.round((totalWins / totalLosses) * 100) / 100 : totalWins > 0 ? 99 : 0;

    // Calculate Max Drawdown (Peak to Valley % on Equity)
    let equity = 100000.0; // Assume 100k start
    let peak = equity;
    let maxDrawdownPct = 0;

    closedTrades.forEach(t => {
      equity += Number(t.profit);
      if (equity > peak) {
        peak = equity;
      }
      const dd = (peak - equity) / peak * 100;
      if (dd > maxDrawdownPct) {
        maxDrawdownPct = dd;
      }
    });

    // Calculate Capital Flow (Sum of PnL grouped by Pair)
    const flowMap = new Map<string, number>();
    closedTrades.forEach(t => {
      const pair = t.pair || 'Unknown';
      flowMap.set(pair, (flowMap.get(pair) || 0) + Number(t.profit));
    });

    const capitalFlow = Array.from(flowMap.entries())
      .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)); // Sort by largest impact

    res.json({
      winRate,
      profitFactor,
      maxDrawdown: Math.round(maxDrawdownPct * 100) / 100,
      capitalFlow
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ error: "Failed to generate dashboard stats" });
  }
});

export default router;
