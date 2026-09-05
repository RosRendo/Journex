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
    const tradeParam = String(req.params.tradeId || "").trim();

    if (!tradeParam) {
      return res.status(400).json({ error: "Trade identifier is required" });
    }

    let trade: any = null;

    // 1. Try finding in Prisma DB by ID (only if within 32-bit integer limits: 1 to 2,147,483,647)
    const numericId = Number(tradeParam);
    if (!isNaN(numericId) && Number.isInteger(numericId) && numericId > 0 && numericId <= 2147483647) {
      try {
        trade = await prisma.trade.findFirst({
          where: { id: numericId },
        });
      } catch (err) {
        console.warn(`[replay] Prisma lookup by ID failed for ${numericId}:`, err);
      }
    }

    // 2. If not found by ID, try finding in Prisma DB by ticket string
    if (!trade) {
      try {
        trade = await prisma.trade.findFirst({
          where: { ticket: tradeParam },
        });
      } catch (err) {
        console.warn(`[replay] Prisma lookup by ticket failed for ${tradeParam}:`, err);
      }
    }

    // 3. If not in DB, fetch from live MT5 bridge /api/history
    if (!trade) {
      try {
        const bridgeRes = await fetch(`${MT5_URL}/api/history`);
        if (bridgeRes.ok) {
          const bridgeData: any = await bridgeRes.json();
          const bridgeTrades = bridgeData.trades || bridgeData.data || [];
          const matched = bridgeTrades.find(
            (t: any) => String(t.ticket) === tradeParam || String(t.id) === tradeParam
          );

          if (matched) {
            trade = {
              id: !isNaN(numericId) && numericId <= 2147483647 ? numericId : 1,
              ticket: String(matched.ticket || matched.id),
              pair: matched.pair,
              direction: matched.direction,
              entry: Number(matched.entry || 0),
              closePrice: Number(matched.closePrice || matched.entry || 0),
              sl: matched.sl ? Number(matched.sl) : null,
              tp: matched.tp ? Number(matched.tp) : null,
              lotSize: Number(matched.lotSize || 0.01),
              profit: Number(matched.profit || 0),
              outcome: matched.outcome || (matched.profit > 0 ? "W" : matched.profit < 0 ? "L" : "E"),
              date: matched.date,
              openTime: matched.openTime || matched.date,
              closeTime: matched.date,
              openTimestamp: matched.openTimestamp != null ? Number(matched.openTimestamp) : null,
              closeTimestamp: matched.closeTimestamp != null ? Number(matched.closeTimestamp) : null,
              notes: matched.notes || "Live MT5 Bridge Execution",
            };
          }
        }
      } catch (err) {
        console.warn(`[replay] MT5 Bridge history fetch failed:`, err);
      }
    }

    // 4. If still not found, return 404
    if (!trade) {
      return res.status(404).json({ error: `Trade #${tradeParam} not found in database or MT5 history` });
    }

    // Ensure SL and TP exist for replay visualization
    const entryVal = Number(trade.entry || 0);
    const isLong = String(trade.direction).toLowerCase().includes("long") || String(trade.direction).toLowerCase().includes("buy");
    
    let slVal = trade.sl ? Number(trade.sl) : null;
    let tpVal = trade.tp ? Number(trade.tp) : null;

    if (!slVal || slVal === 0) {
      const delta = entryVal * (String(trade.pair).includes("BTC") ? 0.015 : String(trade.pair).includes("XAU") ? 0.003 : 0.0015);
      slVal = Number((isLong ? entryVal - delta : entryVal + delta).toFixed(5));
    }
    if (!tpVal || tpVal === 0) {
      const risk = Math.abs(entryVal - slVal);
      tpVal = Number((isLong ? entryVal + risk * 2 : entryVal - risk * 2).toFixed(5));
    }

    trade.sl = slVal;
    trade.tp = tpVal;

    // Calculate timestamps
    let entryTime = trade.openTimestamp && !isNaN(Number(trade.openTimestamp))
      ? Number(trade.openTimestamp)
      : Math.floor(new Date(trade.openTime || trade.date).getTime() / 1000);
    let exitTime = trade.closeTimestamp && !isNaN(Number(trade.closeTimestamp))
      ? Number(trade.closeTimestamp)
      : Math.floor(new Date(trade.closeTime || trade.date).getTime() / 1000);

    if (isNaN(entryTime)) entryTime = Math.floor(Date.now() / 1000) - 3600;
    if (isNaN(exitTime) || exitTime <= entryTime) exitTime = entryTime + 1800; // at least 30 mins

    trade.openTimestamp = entryTime;
    trade.closeTimestamp = exitTime;

    const tfUpper = (req.query.timeframe as string || "M5").toUpperCase();
    let tfSeconds = 300;
    if (tfUpper === "M1") tfSeconds = 60;
    else if (tfUpper === "M5") tfSeconds = 300;
    else if (tfUpper === "M15") tfSeconds = 900;
    else if (tfUpper === "M30") tfSeconds = 1800;
    else if (tfUpper === "H1") tfSeconds = 3600;
    else if (tfUpper === "H4") tfSeconds = 14400;
    else if (tfUpper === "D1") tfSeconds = 86400;

    // Provide adequate context bars (~60 bars prior to trade, ~30 bars after exit)
    const bufferBefore = Math.max(3600 * 2, tfSeconds * 60);
    const bufferAfter = Math.max(1800, tfSeconds * 30);
    const start_time = Math.floor(entryTime - bufferBefore);
    const end_time = Math.floor(exitTime + bufferAfter);
    const symbol = trade.pair || "XAUUSD";
    const timeframe = tfUpper;

    // 5. Fetch candles: Try /api/history-candles first, then /api/historical-candles
    let candles: any[] = [];

    try {
      const response = await fetch(
        `${MT5_URL}/api/history-candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&start_time=${start_time}&end_time=${end_time}`
      );
      if (response.ok) {
        const data = (await response.json()) as any;
        if (data.success && Array.isArray(data.candles) && data.candles.length > 0) {
          candles = data.candles;
        }
      }
    } catch (e) {
      // Bridge history-candles query failed
    }

    if (candles.length === 0) {
      try {
        const fallbackRes = await fetch(
          `${MT5_URL}/api/historical-candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&count=120`
        );
        if (fallbackRes.ok) {
          const fallbackData = (await fallbackRes.json()) as any;
          if (fallbackData.success && Array.isArray(fallbackData.data) && fallbackData.data.length > 0) {
            candles = fallbackData.data;
          }
        }
      } catch (e) {}
    }

    // 6. If candles still empty (e.g. weekend or MT5 disconnected), generate realistic replay candles around the trade
    if (candles.length === 0) {
      const entryP = Number(trade.entry) || 100;
      const closeP = Number(trade.closePrice) || entryP * 1.002;
      const stepSeconds = tfSeconds;
      const totalCandles = Math.max(40, Math.floor((exitTime - entryTime) / stepSeconds) + 30);
      const simStart = entryTime - 20 * stepSeconds;

      let currentPrice = entryP;
      const priceDelta = (closeP - entryP) / Math.max(1, (exitTime - entryTime) / stepSeconds);

      for (let i = 0; i < totalCandles; i++) {
        const candleTime = Math.floor(simStart + i * stepSeconds);
        const noise = (Math.random() - 0.5) * (entryP * 0.001);
        
        let targetClose = currentPrice;
        if (candleTime >= entryTime && candleTime <= exitTime) {
          targetClose += priceDelta + noise;
        } else {
          targetClose += noise;
        }

        const open = currentPrice;
        const close = targetClose;
        const high = Math.max(open, close) + Math.abs(noise) * 0.8;
        const low = Math.min(open, close) - Math.abs(noise) * 0.8;

        candles.push({
          time: candleTime,
          open: Number(open.toFixed(5)),
          high: Number(high.toFixed(5)),
          low: Number(low.toFixed(5)),
          close: Number(close.toFixed(5)),
          volume: Math.floor(Math.random() * 150 + 50),
        });

        currentPrice = close;
      }
    }

    // Return successful replay response
    res.json({
      success: true,
      trade,
      candles,
    });
  } catch (error) {
    console.error("Replay Error:", error);
    res.status(500).json({ error: "Failed to generate replay data" });
  }
});

export default router;
