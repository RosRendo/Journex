import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();
const MT5_URL = process.env.LOCAL_MT5_URL || 'http://127.0.0.1:5003';

// GET /api/replay/:tradeId
router.get("/:tradeId", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const tradeId = parseInt(req.params.tradeId);

    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade || trade.userId !== userId) {
      return res.status(404).json({ error: "Trade not found" });
    }

    if (!trade.date || !trade.closeTime) {
      return res.status(400).json({ error: "Trade lacks entry or exit time for replay" });
    }

    const entryTime = new Date(trade.date).getTime() / 1000;
    const exitTime = new Date(trade.closeTime).getTime() / 1000;

    // Fetch candles from entry - 1 hour to exit + 1 hour (assuming M5 timeframe)
    const buffer = 3600; // 1 hour buffer in seconds
    const start_time = entryTime - buffer;
    const end_time = exitTime + buffer;
    const symbol = trade.pair;
    const timeframe = "M5"; // Defaulting to M5 for replay granularity

    const response = await fetch(`${MT5_URL}/api/history-candles?symbol=${symbol}&timeframe=${timeframe}&start_time=${start_time}&end_time=${end_time}`);
    const data = (await response.json()) as any;

    if (!response.ok || !data.success) {
      return res.status(500).json({ error: data.error || "Failed to fetch historical candles from bridge" });
    }

    res.json({
      success: true,
      trade,
      candles: data.candles
    });
  } catch (error) {
    console.error("Replay Error:", error);
    res.status(500).json({ error: "Failed to generate replay data" });
  }
});

export default router;
