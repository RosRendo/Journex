import { NextRequest, NextResponse } from "next/server";

// Mapping trading symbol to Yahoo Finance ticker
const SYMBOL_MAP: Record<string, string> = {
  XAUUSD: "GC=F",
  GOLD: "GC=F",
  XAGUSD: "SI=F",
  SILVER: "SI=F",
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  USDJPY: "USDJPY=X",
  AUDUSD: "AUDUSD=X",
  NZDUSD: "NZDUSD=X",
  USDCAD: "USDCAD=X",
  USDCHF: "USDCHF=X",
  EURJPY: "EURJPY=X",
  GBPJPY: "GBPJPY=X",
  BTCUSD: "BTC-USD",
  ETHUSD: "ETH-USD",
  NAS100: "NQ=F",
  US30: "YM=F",
  US500: "ES=F",
};

const TIMEFRAME_MAP: Record<string, { interval: string; range: string }> = {
  M1: { interval: "1m", range: "1d" },
  M5: { interval: "5m", range: "1d" },
  M15: { interval: "15m", range: "5d" },
  M30: { interval: "30m", range: "5d" },
  H1: { interval: "60m", range: "1mo" },
  H4: { interval: "60m", range: "1mo" }, // aggregate if needed
  D1: { interval: "1d", range: "1y" },
  W1: { interval: "1wk", range: "2y" },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSymbol = (searchParams.get("symbol") || "XAUUSD").toUpperCase().replace("/", "");
    const tf = (searchParams.get("timeframe") || "M15").toUpperCase();

    const yahooTicker = SYMBOL_MAP[rawSymbol] || (rawSymbol.length === 6 ? `${rawSymbol}=X` : rawSymbol);
    const tfConfig = TIMEFRAME_MAP[tf] || TIMEFRAME_MAP.M15;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yahooTicker
    )}?interval=${tfConfig.interval}&range=${tfConfig.range}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      next: { revalidate: 10 }, // cache for 10s
    });

    if (!res.ok) {
      throw new Error(`Yahoo Finance returned ${res.status}`);
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      throw new Error("No chart data returned from Yahoo Finance");
    }

    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];
    const volumes = quote.volume || [];

    const candles: any[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] !== null && closes[i] !== undefined && !isNaN(closes[i])) {
        candles.push({
          time: timestamps[i],
          open: Number((opens[i] ?? closes[i]).toFixed(rawSymbol === "XAUUSD" || rawSymbol.includes("JPY") ? 2 : 5)),
          high: Number((highs[i] ?? closes[i]).toFixed(rawSymbol === "XAUUSD" || rawSymbol.includes("JPY") ? 2 : 5)),
          low: Number((lows[i] ?? closes[i]).toFixed(rawSymbol === "XAUUSD" || rawSymbol.includes("JPY") ? 2 : 5)),
          close: Number(closes[i].toFixed(rawSymbol === "XAUUSD" || rawSymbol.includes("JPY") ? 2 : 5)),
          volume: volumes[i] || 1000,
        });
      }
    }

    const livePrice = Number(meta.regularMarketPrice || (candles.length > 0 ? candles[candles.length - 1].close : 4150.0));
    const digits = rawSymbol === "XAUUSD" || rawSymbol.includes("JPY") ? 2 : 5;
    const spreadPips = rawSymbol === "XAUUSD" ? 1.8 : 0.8;
    const spreadDelta = rawSymbol === "XAUUSD" ? 0.18 : 0.00008;

    const bid = Number(livePrice.toFixed(digits));
    const ask = Number((livePrice + spreadDelta).toFixed(digits));

    // Dynamic S/R Pivot Levels computed from real market data
    const lastClose = candles.length > 0 ? candles[candles.length - 1].close : livePrice;
    const lastHigh = candles.length > 0 ? Math.max(...candles.slice(-20).map((c) => c.high)) : livePrice * 1.008;
    const lastLow = candles.length > 0 ? Math.min(...candles.slice(-20).map((c) => c.low)) : livePrice * 0.992;
    const pivot = Number(((lastHigh + lastLow + lastClose) / 3).toFixed(digits));
    const r1 = Number((2 * pivot - lastLow).toFixed(digits));
    const r2 = Number((pivot + (lastHigh - lastLow)).toFixed(digits));
    const s1 = Number((2 * pivot - lastHigh).toFixed(digits));
    const s2 = Number((pivot - (lastHigh - lastLow)).toFixed(digits));

    return NextResponse.json({
      success: true,
      symbol: rawSymbol,
      price: livePrice,
      bid,
      ask,
      spreadPips,
      digits,
      changePct: meta.regularMarketChangePercent ? Number(meta.regularMarketChangePercent.toFixed(2)) : 0,
      candles,
      levels: {
        pivot,
        r1,
        r2,
        s1,
        s2,
        current: livePrice,
      },
    });
  } catch (error: any) {
    console.error("[MARKET PRICE API ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
