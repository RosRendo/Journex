import fs from "fs";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import { dispatchAlert, fmtNews, fmtSignal } from "./alertsService";
import { getRealNews } from "./externalFeedsService";
import { getSettings, getNews, SYMBOLS } from "../routes/terminalRoutes";
import { analyzeNewsMacroImpact } from "./newsIntelligenceService";

const DATA_DIR = path.resolve(process.cwd(), "data");
const NEWS_POSTED_FILE = path.join(DATA_DIR, "posted_news.json");
const SIGNALS_POSTED_FILE = path.join(DATA_DIR, "posted_signals.json");

interface PostedNewsItem {
  id: string;
  headline: string;
  tag?: string;
  impact?: string;
  postedAt: string;
}

interface PostedSignalItem {
  symbol: string;
  type: "BUY" | "SELL";
  entry_price: number;
  timeframe: string;
  grade?: string;
  confidence?: number;
  reason?: string;
  signal_id?: string;
  postedAt: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

export function getPostedNews(): Record<string, PostedNewsItem> {
  ensureDataDir();
  if (!fs.existsSync(NEWS_POSTED_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(NEWS_POSTED_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function savePostedNews(data: Record<string, PostedNewsItem>) {
  ensureDataDir();
  try {
    // Keep only newest 500 items to avoid file bloating
    const entries = Object.entries(data);
    if (entries.length > 500) {
      entries.sort((a, b) => new Date(b[1].postedAt).getTime() - new Date(a[1].postedAt).getTime());
      const trimmed = Object.fromEntries(entries.slice(0, 500));
      fs.writeFileSync(NEWS_POSTED_FILE, JSON.stringify(trimmed, null, 2), "utf8");
      return;
    }
    fs.writeFileSync(NEWS_POSTED_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err: any) {
    console.warn("[AUTO-BROADCASTER] Failed saving posted news state:", err.message);
  }
}

export function getPostedSignals(): Record<string, PostedSignalItem> {
  ensureDataDir();
  if (!fs.existsSync(SIGNALS_POSTED_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SIGNALS_POSTED_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function savePostedSignals(data: Record<string, PostedSignalItem>) {
  ensureDataDir();
  try {
    fs.writeFileSync(SIGNALS_POSTED_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err: any) {
    console.warn("[AUTO-BROADCASTER] Failed saving posted signals state:", err.message);
  }
}

function getHeadlineId(headline: string): string {
  return crypto.createHash("md5").update(headline.trim().toLowerCase()).digest("hex").slice(0, 16);
}

/**
 * Check and broadcast new unposted breaking/high-impact news.
 * If force=true, bypasses deduplication for top items.
 */
export async function checkAndBroadcastNews(force = false): Promise<{ count: number; dispatches: any[] }> {
  const dispatches: any[] = [];
  try {
    const keys = getSettings().api_keys || {};
    let candidateItems: any[] = [];

    try {
      const real = await getRealNews(keys, undefined, 15);
      if (real && real.items && real.items.length > 0) {
        candidateItems = real.items;
      }
    } catch {
      // Fallback
    }

    if (!candidateItems.length) {
      candidateItems = getNews();
    }

    const postedNews = getPostedNews();
    const itemsToPost: any[] = [];

    for (const item of candidateItems) {
      const headline = item.headline || "";
      if (!headline) continue;
      const hid = getHeadlineId(headline);

      if (!force && postedNews[hid]) {
        // Already posted previously across server sessions
        continue;
      }

      const impact = (item.impact || "med").toLowerCase();
      const tag = (item.tag || "").toUpperCase();

      // Only alert high impact, breaking, or if forced
      const isImportant = impact === "high" || tag === "BREAKING" || tag === "FED" || force;
      if (isImportant) {
        itemsToPost.push({ hid, item });
      }
    }

    // Limit batch on startup to top 3 freshest to avoid flood
    const batch = itemsToPost.slice(0, 3);

    for (const { hid, item } of batch) {
      const intel = analyzeNewsMacroImpact(
        item.headline,
        item.tag,
        item.impact,
        item.url,
        item.tradingImpact || item.headline
      );

      const details = {
        sentiment: item.sentiment || intel.usd_direction_formatted,
        assetsAffected: item.assetsAffected || (item.affects ? (Array.isArray(item.affects) ? item.affects : [item.affects]) : undefined) || intel.currencies.map(c => c.symbol),
        tradingImpact: item.tradingImpact || intel.trade_action || intel.explanation,
        actionableNote: item.actionableNote || intel.trade_action,
        source: item.source || item.tag || "Market News",
        url: item.url || (item.headline ? `https://www.google.com/search?q=${encodeURIComponent(item.headline + " market news")}` : undefined),
        pairSignals: intel.currencies
      };

      const text = fmtNews(
        item.tag || "NEWS",
        item.headline,
        item.impact || "med",
        item.time_iso || item.time || new Date(),
        details
      );

      const res = await dispatchAlert(keys, text, undefined, "news");
      dispatches.push({ headline: item.headline, ...res });

      if (res.ok || res.sent.length > 0) {
        postedNews[hid] = {
          id: hid,
          headline: item.headline,
          tag: item.tag,
          impact: item.impact,
          postedAt: new Date().toISOString()
        };
      }
    }

    if (dispatches.some(d => d.ok || (d.sent && d.sent.length > 0))) {
      savePostedNews(postedNews);
    }
  } catch (err: any) {
    console.warn("[AUTO-BROADCASTER] News broadcast check failed:", err.message);
  }

  return { count: dispatches.length, dispatches };
}

/**
 * Check and broadcast live confluence scanner signals.
 * - On first startup: posts active confluence signals for all pairs.
 * - On subsequent startups: skips pairs whose active setup was already posted,
 *   only posting when a pair's setup hits a new direction/level/signal.
 * - If force=true, bypasses deduplication.
 */
export async function checkAndBroadcastSignals(force = false): Promise<{ count: number; dispatches: any[] }> {
  const dispatches: any[] = [];
  try {
    const keys = getSettings().api_keys || {};
    let signals: any[] = [];

    // 1. Check live MT5 bridge signals
    try {
      const bridgeUrl = process.env.MT5_BRIDGE_URL || "http://127.0.0.1:5003";
      const bRes = await axios.get(`${bridgeUrl}/api/signals`, { timeout: 8000 });
      if (bRes.data?.signals?.length) {
        signals = bRes.data.signals;
      }
    } catch {
      // Bridge offline or has no signals
    }

    // If no live signals from MT5 bridge, do NOT send any mock data
    if (!signals.length) {
      return { count: 0, dispatches: [] };
    }

    const postedSignals = getPostedSignals();
    const signalsToPost: any[] = [];

    for (const sig of signals.slice(0, 5)) {
      const sym = sig.symbol;
      const symClean = (sym || "").toUpperCase().replace(/[^A-Z]/g, "");
      const isXau = symClean === "XAUUSD" || symClean === "XAU" || symClean === "GOLD";

      // Signal alert notifications restricted to XAUUSD only
      if (!isXau) {
        continue;
      }

      const type = (sig.type || "BUY").toUpperCase();
      const entry = Number(sig.entry_price || 0);
      const prev = postedSignals[sym];

      if (!force && prev) {
        // If same direction
        const sameDirection = prev.type.toUpperCase() === type;

        // Check if price is within setup tolerance (1 * ATR or setup threshold)
        let tolerance = 0.0025; // default forex
        if (sym === "XAUUSD") tolerance = 15.0;
        else if (sym === "BTCUSD") tolerance = 1500.0;
        else if (sym.includes("JPY")) tolerance = 0.60;

        const priceDiff = Math.abs(entry - prev.entry_price);
        const isSamePriceZone = priceDiff < tolerance;

        // Setup age in hours
        const ageHours = (Date.now() - new Date(prev.postedAt).getTime()) / (1000 * 60 * 60);

        // If same direction, within same price zone, and less than 12h old -> ALREADY POSTED!
        if (sameDirection && isSamePriceZone && ageHours < 12) {
          continue;
        }
      }

      // If we reach here, it's a NEW setup hitting or first time running
      signalsToPost.push(sig);
    }

    for (const sig of signalsToPost) {
      const prev = postedSignals[sig.symbol];
      const isReversal = Boolean(prev && prev.type.toUpperCase() !== (sig.type || "").toUpperCase());
      const previousType = prev?.type;

      let checklist: string[] = [];
      if (sig.confluence_matrix) {
        checklist = Object.entries(sig.confluence_matrix).map(([k, v]: [string, any]) => {
          const pass = v.status === "valid" ? "✅" : "⚪";
          return `${pass} ${k} (+${v.points} pts)`;
        });
      } else if (Array.isArray(sig.checklist)) {
        checklist = sig.checklist;
      }

      const riskReward = (sig.tp && sig.sl && sig.entry_price && Math.abs(sig.entry_price - sig.sl) > 0)
        ? `1:${(Math.abs(sig.tp - sig.entry_price) / Math.abs(sig.entry_price - sig.sl)).toFixed(1)}`
        : undefined;

      const text = fmtSignal(
        sig.symbol,
        sig.type,
        sig.entry_price,
        sig.sl,
        sig.tp,
        sig.timeframe || "M15",
        sig.grade,
        sig.confidence,
        sig.reason,
        undefined,
        {
          minScore: 70,
          passed: (sig.confidence || 0) >= 70,
          riskReward,
          tp1: sig.tp1,
          tp2: sig.tp2,
          tp3: sig.tp3,
          isReversal,
          previousType
        }
      );

      const res = await dispatchAlert(keys, text, undefined, "signals");
      dispatches.push({ symbol: sig.symbol, ...res });

      if (res.ok || res.sent.length > 0) {
        postedSignals[sig.symbol] = {
          symbol: sig.symbol,
          type: sig.type,
          entry_price: sig.entry_price,
          timeframe: sig.timeframe || "M15",
          grade: sig.grade,
          confidence: sig.confidence,
          reason: sig.reason,
          signal_id: sig.id,
          postedAt: new Date().toISOString()
        };
      }
    }

    if (dispatches.some(d => d.ok || (d.sent && d.sent.length > 0))) {
      savePostedSignals(postedSignals);
    }
  } catch (err: any) {
    console.warn("[AUTO-BROADCASTER] Signals broadcast check failed:", err.message);
  }

  return { count: dispatches.length, dispatches };
}

let broadcasterRunning = false;

/**
 * Start the automated Telegram broadcaster:
 * - Runs instantly on server boot (+2.5s delay to ensure all services are up).
 * - Avoids duplicate posts if laptop was restarted.
 * - Monitors in background every 60s for newly arriving news or signals.
 */
export function startAutoBroadcaster() {
  if (broadcasterRunning) return;
  broadcasterRunning = true;

  console.log("📡 [AUTO-BROADCASTER] Initializing automated Telegram/Discord broadcaster...");

  // Instant execution on boot (slight 2.5s warmup delay)
  setTimeout(async () => {
    console.log("⚡ [AUTO-BROADCASTER] Executing instant startup broadcast check...");
    try {
      const newsResult = await checkAndBroadcastNews(false);
      const signalResult = await checkAndBroadcastSignals(false);
      console.log(
        `✅ [AUTO-BROADCASTER] Instant startup check complete: ${newsResult.count} news posted, ${signalResult.count} signals posted.`
      );
    } catch (err: any) {
      console.warn("⚠️ [AUTO-BROADCASTER] Startup broadcast error:", err.message);
    }
  }, 2500);

  // Background interval: News every 60 seconds
  setInterval(async () => {
    try {
      await checkAndBroadcastNews(false);
    } catch {}
  }, 60000);

  // Background interval: Signals every 60 seconds
  setInterval(async () => {
    try {
      await checkAndBroadcastSignals(false);
    } catch {}
  }, 60000);
}
