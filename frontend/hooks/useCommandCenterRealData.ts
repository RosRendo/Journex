"use client";

import { useState, useEffect, useCallback } from "react";
import { sanitizeChartData } from "@/lib/chartSanitizer";

export interface RealAccountData {
  login: number;
  balance: number;
  equity: number;
  profit: number;
  margin: number;
  margin_free: number;
  currency: string;
  server: string;
}

export interface RealPriceData {
  bid: number;
  ask: number;
  spreadPips: number;
  digits: number;
}

export interface RealCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RealPosition {
  ticket: number;
  pair: string;
  direction: "Long" | "Short";
  volume: number;
  entry: number;
  current: number;
  sl: number;
  tp: number;
  pnl: number;
  openTime: string;
}

export interface RealLevels {
  pivot: number;
  r1: number;
  r2: number;
  s1: number;
  s2: number;
  current: number;
}

export function useCommandCenterRealData(symbol: string, timeframe: string) {
  const [account, setAccount] = useState<RealAccountData | null>(null);
  const [price, setPrice] = useState<RealPriceData | null>(null);
  const [candles, setCandles] = useState<RealCandle[]>([]);
  const [positions, setPositions] = useState<RealPosition[]>([]);
  const [levels, setLevels] = useState<RealLevels | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Comprehensive Timeframe mapping for MT5 API (handles all casing and formats)
  const resolveTf = (tf: string): string => {
    if (!tf) return "H1";
    const key = tf.toUpperCase().trim();
    const map: Record<string, string> = {
      "1M": "M1", "M1": "M1",
      "3M": "M3", "M3": "M3",
      "5M": "M5", "M5": "M5",
      "15M": "M15", "M15": "M15",
      "30M": "M30", "M30": "M30",
      "1H": "H1", "H1": "H1",
      "2H": "H2", "H2": "H2",
      "3H": "H3", "H3": "H3",
      "4H": "H4", "H4": "H4",
      "6H": "H6", "H6": "H6",
      "8H": "H8", "H8": "H8",
      "12H": "H12", "H12": "H12",
      "D": "D1", "1D": "D1", "D1": "D1",
      "W": "W1", "1W": "W1", "W1": "W1",
      "M": "MN1", "1MN": "MN1", "MN": "MN1", "MN1": "MN1",
    };
    return map[key] || "H1";
  };

  const fetchRealData = useCallback(async () => {
    try {
      // 1. Account Telemetry
      const accRes = await fetch("/api/bridge/api/account", {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (accRes.ok) {
        const accJson = await accRes.json();
        if (accJson.success && accJson.balance !== undefined) {
          setAccount({
            login: accJson.login ?? 0,
            balance: accJson.balance ?? 0,
            equity: accJson.equity ?? 0,
            profit: accJson.profit ?? 0,
            margin: accJson.margin ?? 0,
            margin_free: accJson.margin_free ?? 0,
            currency: accJson.currency ?? "USD",
            server: accJson.server ?? "MT5-Broker",
          });
          setConnected(true);
        } else {
          setConnected(false);
        }
      } else {
        setConnected(false);
      }

      // 2. Real Live Price
      let gotPrice = false;
      try {
        const priceRes = await fetch(`/api/bridge/api/symbol-price?symbol=${symbol}`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (priceRes.ok) {
          const pJson = await priceRes.json();
          if (pJson.success && typeof pJson.bid === "number") {
            const pipSize = pJson.pip_size || (symbol.includes("JPY") ? 0.01 : 0.0001);
            const spread = Math.abs(pJson.ask - pJson.bid) / (pipSize || 1);
            setPrice({
              bid: pJson.bid,
              ask: pJson.ask,
              spreadPips: Number(spread.toFixed(1)),
              digits: pJson.digits ?? (symbol === "XAUUSD" ? 2 : 5),
            });
            gotPrice = true;
          }
        }
      } catch (_) {}

      if (!gotPrice) {
        try {
          const clean = symbol.replace("/", "").toUpperCase();
          const snapRes = await fetch(`/api/terminal/snapshot?symbol=${clean}`);
          if (snapRes.ok) {
            const sJson = await snapRes.json();
            if (sJson.price && typeof sJson.price.bid === "number") {
              setPrice({
                bid: sJson.price.bid,
                ask: sJson.price.ask || sJson.price.bid + 0.25,
                spreadPips: sJson.price.spread || 2.5,
                digits: symbol === "XAUUSD" || symbol.includes("JPY") ? 2 : 5,
              });
              gotPrice = true;
            }
          }
        } catch (_) {}
      }

      // 3. Real MT5 Candles (Load 300 bars for full-width high-definition chart view)
      let gotCandles = false;
      try {
        const mappedTf = resolveTf(timeframe);
        const candlesRes = await fetch(
          `/api/bridge/api/historical-candles?symbol=${symbol}&timeframe=${mappedTf}&count=300`,
          { headers: { "ngrok-skip-browser-warning": "true" } }
        );
        if (candlesRes.ok) {
          const cJson = await candlesRes.json();
          if (cJson.success && Array.isArray(cJson.data) && cJson.data.length > 0) {
            setCandles(sanitizeChartData(cJson.data));
            gotCandles = true;
          }
        }
      } catch (_) {}

      // Fallback: Terminal API Candles
      if (!gotCandles) {
        try {
          const clean = symbol.replace("/", "").toUpperCase();
          const snapRes = await fetch(
            `/api/terminal/candles?symbol=${clean}&timeframe=${timeframe || "M15"}&limit=300`
          );
          if (snapRes.ok) {
            const snapJson = await snapRes.json();
            if (Array.isArray(snapJson.candles) && snapJson.candles.length > 0) {
              setCandles(sanitizeChartData(snapJson.candles));
              gotCandles = true;
            }
          }
        } catch (_) {}
      }

      // 4. Real Levels
      const levRes = await fetch(`/api/bridge/api/levels?symbol=${symbol}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (levRes.ok) {
        const lJson = await levRes.json();
        if (lJson.success && lJson.levels) {
          setLevels(lJson.levels);
        }
      }

      // 5. Real Positions
      const posRes = await fetch("/api/bridge/api/positions", {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (posRes.ok) {
        const posJson = await posRes.json();
        if (posJson.success && Array.isArray(posJson.positions)) {
          setPositions(posJson.positions);
        }
      }

      // 6. Real News
      const newsRes = await fetch("/api/bridge/api/news", {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (newsRes.ok) {
        const nJson = await newsRes.json();
        if (nJson.success && Array.isArray(nJson.news)) {
          setNews(nJson.news.slice(0, 5));
        }
      }
    } catch (err) {
      console.warn("Real data fetch warning:", err);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    fetchRealData();
    const interval = setInterval(fetchRealData, 2000); // 2-second real-time tick poll
    return () => clearInterval(interval);
  }, [fetchRealData]);

  return {
    account,
    price,
    candles,
    positions,
    levels,
    news,
    connected,
    loading,
    refetch: fetchRealData,
  };
}
