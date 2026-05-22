import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import prisma from "../config/database";
import { buildAdapter, SYMBOLS, generateCandles } from "../services/terminalBrokerAdapter";
import { fetchTECalendar, fetchCommunityOutlook, getRealNews } from "../services/externalFeedsService";
import { dispatchAlert, fmtTradeOpen, fmtTradeClose } from "../services/alertsService";

const router = express.Router();

// ----------------------------------------------------
// MOCK DATA CONSTANTS & UTILITIES
// ----------------------------------------------------

export { SYMBOLS };


const HEATMAP_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "NZDUSD", "USDCHF", "USDCAD", "XAUUSD", "XAGUSD", "EURJPY"];

// Custom Seeded Random Generator for deterministic walk & correlations
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  uniform(min: number, max: number) {
    return min + this.next() * (max - min);
  }
  randint(min: number, max: number) {
    return Math.floor(this.uniform(min, max + 1));
  }
  choice<T>(arr: T[]): T {
    const idx = this.randint(0, arr.length - 1);
    return arr[idx];
  }
  sample<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const res: T[] = [];
    for (let i = 0; i < n; i++) {
      if (copy.length === 0) break;
      const idx = this.randint(0, copy.length - 1);
      res.push(copy.splice(idx, 1)[0]);
    }
    return res;
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function timeframeSeconds(tf: string): number {
  const mapping: Record<string, number> = {
    "M1": 60, "M5": 300, "M15": 900, "M30": 1800,
    "H1": 3600, "H4": 14400, "D1": 86400, "W1": 604800,
  };
  return mapping[tf] || 14400;
}

// ----------------------------------------------------
// LOCAL JSON FILE PERSISTENCE FOR DRAWINGS & SETTINGS
// ----------------------------------------------------

const DATA_DIR = path.join(__dirname, "../data");
const DRAWINGS_FILE = path.join(DATA_DIR, "terminalDrawings.json");
const SETTINGS_FILE = path.join(DATA_DIR, "terminalSettings.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDrawings(): any[] {
  ensureDataDir();
  if (!fs.existsSync(DRAWINGS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DRAWINGS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveDrawings(drawings: any[]) {
  ensureDataDir();
  fs.writeFileSync(DRAWINGS_FILE, JSON.stringify(drawings, null, 2));
}

export function getSettings(): Record<string, any> {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveSettings(settings: Record<string, any>) {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// ── Admin guard ──────────────────────────────────────────────────────────────
const ADMIN_EMAIL = "rousrendo@gmail.com";

function isAdmin(req: any): boolean {
  const auth: string = req?.headers?.authorization || "";
  // Header is "Bearer <email>" set by the frontend Axios interceptor
  const email = auth.startsWith("Bearer ") ? auth.slice(7).trim().toLowerCase() : "";
  return email === ADMIN_EMAIL.toLowerCase();
}

function getActiveAdapter(req?: any) {
  // Non-admin callers always get the safe mock adapter — zero leakage of live
  // broker credentials, positions, or orders to guests / friends.
  if (req && !isAdmin(req)) {
    return buildAdapter({ provider: "mock" });
  }
  const currentSettings = getSettings();
  const brokerConfig = currentSettings.broker || { provider: "mock" };
  return buildAdapter(brokerConfig);
}

// ----------------------------------------------------
// SEEDING DATABASE FOR DEMO EXPERIENCE (Idempotent)
// ----------------------------------------------------

async function seedDemoTradesIfEmpty() {
  const count = await prisma.trade.count();
  if (count > 0) return;

  const now = new Date();
  const demoClosed = [
    { pair: "EURUSD", direction: "Short", profit: 412.0,  strategy: "Trend",    daysAgo: 16, hours: 4 },
    { pair: "USDJPY", direction: "Long",  profit: 188.0,  strategy: "Breakout", daysAgo: 18, hours: 3 },
    { pair: "GBPUSD", direction: "Short", profit: -120.0, strategy: "Reversal", daysAgo: 20, hours: 1 },
    { pair: "AUDUSD", direction: "Long",  profit: 305.0,  strategy: "Range",    daysAgo: 22, hours: 5 },
    { pair: "XAUUSD", direction: "Long",  profit: 980.0,  strategy: "Trend",    daysAgo: 24, hours: 7 },
    { pair: "EURJPY", direction: "Short", profit: -75.0,  strategy: "Scalp",    daysAgo: 25, hours: 0.5 },
    { pair: "USDJPY", direction: "Short", profit: 230.0,  strategy: "Trend",    daysAgo: 28, hours: 2 },
    { pair: "EURUSD", direction: "Long",  profit: -50.0,  strategy: "Counter",  daysAgo: 30, hours: 1.5 },
    { pair: "GBPUSD", direction: "Long",  profit: 445.0,  strategy: "Breakout", daysAgo: 32, hours: 6 },
    { pair: "XAGUSD", direction: "Long",  profit: 120.0,  strategy: "Range",    daysAgo: 36, hours: 2 },
    { pair: "USDCHF", direction: "Short", profit: 88.0,   strategy: "Trend",    daysAgo: 40, hours: 1 },
    { pair: "USDCAD", direction: "Long",  profit: -160.0, strategy: "Reversal", daysAgo: 44, hours: 0.5 },
  ];

  let idx = 0;
  for (const t of demoClosed) {
    const openTime = new Date(now.getTime() - (t.daysAgo * 24 + t.hours) * 60 * 60 * 1000);
    const closeTime = new Date(openTime.getTime() + 3 * 60 * 60 * 1000);
    const base = SYMBOLS[t.pair] || { price: 1.0, digits: 5 };
    const randomEntry = base.price * (1 + (Math.random() - 0.5) * 0.01);
    const randomExit = randomEntry + (t.profit > 0 ? 0.0050 : -0.0020);

    await prisma.trade.create({
      data: {
        date: openTime,
        pair: t.pair,
        direction: t.direction,
        entry: randomEntry,
        closePrice: randomExit,
        profit: t.profit,
        outcome: t.profit >= 0 ? (t.profit === 0 ? "BreakEven" : "Win") : "Loss",
        strategy: t.strategy,
        setupType: t.strategy,
        ticket: `T-${1000 - idx}`,
        openTime: openTime,
        closeTime: closeTime,
        lotSize: 1.0,
        notes: "Seeded demo closed trade",
      },
    });
    idx++;
  }

  const demoOpen = [
    { id: "P-1001", symbol: "EURUSD", side: "SELL", volume: 2.0, entry: 1.1000, current: 1.0950, sl: 1.1030, tp: 1.0850, pnl: 3333.0, hoursAgo: 2.23 },
    { id: "P-1002", symbol: "GBPUSD", side: "BUY", volume: 1.0, entry: 1.2625, current: 1.2650, sl: 1.2600, tp: 1.2720, pnl: 450.0, hoursAgo: 0.8 },
    { id: "P-1003", symbol: "USDJPY", side: "SELL", volume: 0.5, entry: 152.20, current: 152.40, sl: 152.60, tp: 151.40, pnl: -220.0, hoursAgo: 0.36 },
  ];

  for (const p of demoOpen) {
    const openTime = new Date(now.getTime() - p.hoursAgo * 60 * 60 * 1000);
    await prisma.trade.create({
      data: {
        date: openTime,
        pair: p.symbol,
        direction: p.side === "BUY" ? "Long" : "Short",
        entry: p.entry,
        profit: p.pnl,
        outcome: "Open",
        strategy: "Trend",
        ticket: p.id,
        openTime: openTime,
        lotSize: p.volume,
        sl: p.sl,
        tp: p.tp,
        notes: "Seeded demo open position",
      },
    });
  }
}

// generateCandles is imported from terminalBrokerAdapter

function getWatchlist() {
  const items = [];
  const rng = new SeededRandom(42);
  for (const sym of Object.keys(SYMBOLS)) {
    const base = SYMBOLS[sym];
    const change = rng.uniform(-0.9, 0.9);
    const change_pips = parseFloat((change * (base.digits >= 4 ? 10000 : 100)).toFixed(1));
    items.push({
      symbol: sym,
      price: base.price,
      digits: base.digits,
      change_pct: parseFloat(change.toFixed(2)),
      change_pips: change_pips,
      bid: parseFloat((base.price - Math.pow(10, -base.digits)).toFixed(base.digits)),
      ask: parseFloat((base.price + Math.pow(10, -base.digits)).toFixed(base.digits)),
    });
  }
  return items.slice(0, 8);
}

async function getPositionsList() {
  await seedDemoTradesIfEmpty();
  const openPositions = await prisma.trade.findMany({
    where: { outcome: "Open" },
    orderBy: { openTime: "desc" },
  });

  const now = new Date();
  return openPositions.map(t => {
    const openTime = t.openTime || new Date();
    const diffMs = now.getTime() - openTime.getTime();
    const hours = Math.floor(diffMs / (3600 * 1000));
    const minutes = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    const duration = `${hours}h ${minutes}m`;

    const sym = SYMBOLS[t.pair];
    const current = sym ? sym.price : Number(t.entry);
    const direction = t.direction === "Long" ? 1 : -1;
    const digits = sym ? sym.digits : 5;
    const pip = Math.pow(10, -digits);
    const pnl = Math.round(direction * (current - Number(t.entry)) / pip * 10 * Number(t.lotSize || 1) * 100) / 100;

    return {
      id: t.ticket || t.id.toString(),
      symbol: t.pair,
      side: t.direction === "Long" ? "BUY" : "SELL",
      volume: Number(t.lotSize),
      entry: Number(t.entry),
      current: current,
      sl: t.sl ? Number(t.sl) : null,
      tp: t.tp ? Number(t.tp) : null,
      pnl: pnl,
      status: "open",
      tag: t.strategy || "demo",
      duration: duration,
      opened_at: openTime.toISOString(),
    };
  });
}

async function getAccountData() {
  await seedDemoTradesIfEmpty();
  const closedTrades = await prisma.trade.findMany({
    where: { NOT: { outcome: "Open" } },
  });

  const pnls = closedTrades.map(t => Number(t.profit));
  const wins = pnls.filter(p => p > 0);
  const losses = pnls.filter(p => p < 0);
  const total_pnl = pnls.reduce((a, b) => a + b, 0);

  const win_rate = pnls.length ? Math.round((wins.length / pnls.length) * 1000) / 10 : 72.3;
  const totalWins = wins.reduce((a, b) => a + b, 0);
  const totalLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profit_factor = totalLosses > 0 ? Math.round((totalWins / totalLosses) * 100) / 100 : 2.14;

  const balance = 100000.0 + total_pnl;
  const positions = await getPositionsList();
  const floatPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const equity = balance + floatPnl;

  return {
    balance: Math.round(balance * 100) / 100,
    equity: Math.round(equity * 100) / 100,
    free_margin: Math.round((equity - 1500) * 100) / 100,
    used_margin_pct: 12.5,
    drawdown_pct: -1.8,
    win_rate: win_rate,
    trades_today: 3,
    profit_factor: profit_factor,
    avg_win: wins.length ? Math.round((totalWins / wins.length) * 100) / 100 : 412.0,
    avg_loss: losses.length ? Math.round((losses.reduce((a, b) => a + b, 0) / losses.length) * 100) / 100 : -192.0,
  };
}

function getSetupChecklist() {
  const items = [
    { id: "trend", label: "Trend Confirmed", status: "ok", detail: "D1 + H4 aligned bearish" },
    { id: "support", label: "Support Tested", status: "ok", detail: "S1 1.0850 tested 2x" },
    { id: "entry", label: "Entry Valid", status: "ok", detail: "MA50 rejection 1.0950" },
    { id: "rr", label: "R:R Acceptable", status: "ok", detail: "1:3.33 vs 1:2 min" },
    { id: "volatility", label: "Volatility High", status: "warn", detail: "ATR +27% above avg" },
    { id: "news", label: "News Risk (ECB)", status: "alert", detail: "ECB rate 47m" },
    { id: "session", label: "Session Active", status: "ok", detail: "London + NY overlap" },
  ];
  const score = items.filter(i => i.status === "ok").length;
  return {
    items,
    score,
    max_score: items.length,
    verdict: score >= 5 ? "VALID" : "WAIT",
  };
}

function getConfluence() {
  return {
    timeframes: [
      { tf: "W1", bias: "bearish", strength: 0.82, note: "Below MA50 weekly" },
      { tf: "D1", bias: "bearish", strength: 0.74, note: "Lower highs since Apr 19" },
      { tf: "H4", bias: "bearish", strength: 0.68, note: "MA50 rejection" },
      { tf: "H1", bias: "neutral", strength: 0.15, note: "Consolidation" },
    ],
    score: 8,
    max: 10,
    recommendation: "Bias bearish, await H1 break of 1.0935",
  };
}

function getCentralBanks() {
  return [
    { cb: "ECB", rate: 5.00, prev: 5.25, stance: "Dovish", next_meeting: "47m", implication: "EUR weakness" },
    { cb: "FED", rate: 5.33, prev: 5.33, stance: "Hold",   next_meeting: "12d", implication: "USD strong" },
    { cb: "BOE", rate: 5.25, prev: 5.25, stance: "Neutral",next_meeting: "5d",  implication: "GBP range" },
    { cb: "BOJ", rate: 0.10, prev: 0.10, stance: "Dovish", next_meeting: "9d",  implication: "JPY weak" },
    { cb: "SNB", rate: 1.50, prev: 1.75, stance: "Dovish", next_meeting: "21d", implication: "CHF soft" },
  ];
}

function getEvents(days = 7) {
  const now = new Date();
  const events = [];
  const rng = new SeededRandom(20260201);
  const templates = [
    { cc: "US", title: "NFP Non-Farm Payrolls", impact: "high", move: 180 },
    { cc: "US", title: "CPI m/m", impact: "high", move: 120 },
    { cc: "US", title: "Retail Sales m/m", impact: "med", move: 80 },
    { cc: "US", title: "FOMC Rate Decision", impact: "high", move: 200 },
    { cc: "EU", title: "ECB Rate Decision", impact: "high", move: 150 },
    { cc: "EU", title: "German CPI", impact: "med", move: 60 },
    { cc: "EU", title: "EZ Manufacturing PMI", impact: "med", move: 50 },
    { cc: "UK", title: "BoE Rate Decision", impact: "high", move: 130 },
    { cc: "UK", title: "UK GDP q/q", impact: "med", move: 70 },
    { cc: "JP", title: "BoJ Policy Statement", impact: "high", move: 110 },
    { cc: "CA", title: "BoC Rate Decision", impact: "high", move: 90 },
    { cc: "AU", title: "RBA Rate Decision", impact: "med", move: 80 },
    { cc: "CN", title: "Caixin Manufacturing PMI", impact: "med", move: 45 },
    { cc: "US", title: "ISM Services PMI", impact: "med", move: 65 },
    { cc: "US", title: "Crude Oil Inventories", impact: "low", move: 30 },
  ];

  for (let d = 0; d < days; d++) {
    const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    const n = rng.randint(2, 4);
    const chosen = rng.sample(templates, n);
    for (const t of chosen) {
      const hour = rng.choice([8, 10, 12, 14, 16]);
      const minute = rng.choice([0, 15, 30]);
      const ts = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
      const fc = parseFloat(rng.uniform(-1, 5).toFixed(1));
      const prev_v = parseFloat((fc + rng.uniform(-0.8, 0.8)).toFixed(1));
      events.push({
        time_iso: ts.toISOString(),
        country: t.cc,
        title: t.title,
        impact: t.impact,
        forecast: `${fc}%`,
        previous: `${prev_v}%`,
        expected_move_pips: t.move,
      });
    }
  }
  events.sort((a, b) => a.time_iso.localeCompare(b.time_iso));
  return events;
}

export function getNews() {
  const now = new Date();
  return [
    { time_iso: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),  tag: "BREAKING", headline: "Lagarde signals pause after today's expected cut", impact: "high",   affects: ["EURUSD","EURJPY"], sentiment: "bearish" },
    { time_iso: new Date(now.getTime() - 17 * 60 * 1000).toISOString(), tag: "FED",      headline: "Fed officials: more hikes possible if inflation sticky", impact: "high", affects: ["USDJPY","EURUSD"], sentiment: "bullish_usd" },
    { time_iso: new Date(now.getTime() - 27 * 60 * 1000).toISOString(), tag: "ENERGY",   headline: "Oil rallies after surprise OPEC+ supply cut",          impact: "med",  affects: ["USDCAD","XAUUSD"], sentiment: "risk_on" },
    { time_iso: new Date(now.getTime() - 44 * 60 * 1000).toISOString(), tag: "EQUITIES", headline: "DAX slips 1.8%, German factory orders disappoint",     impact: "med",  affects: ["EURUSD"],          sentiment: "bearish" },
    { time_iso: new Date(now.getTime() - 65 * 60 * 1000).toISOString(), tag: "CRYPTO",   headline: "BTC holds 67k as ETF inflows continue",          impact: "low",  affects: ["BTCUSD"],          sentiment: "bullish" },
    { time_iso: new Date(now.getTime() - 120 * 60 * 1000).toISOString(),tag: "ASIA",     headline: "Yen weakens as BOJ stays dovish on policy stance",     impact: "high", affects: ["USDJPY","AUDJPY"], sentiment: "bearish_jpy" },
  ];
}

function getCorrelations() {
  return {
    base: "EURUSD",
    items: [
      { asset: "SPX500", value:  0.65, note: "Risk-on aligned with EUR" },
      { asset: "DAX40",  value:  0.88, note: "German equities anchor" },
      { asset: "OILUSD", value: -0.42, note: "Mild inverse" },
      { asset: "XAUUSD", value:  0.38, note: "Mixed, safe-haven" },
      { asset: "USDJPY", value: -0.92, note: "Strong inverse via USD" },
      { asset: "GBPUSD", value:  0.85, note: "USD-bloc co-movement" },
      { asset: "USDCHF", value: -0.78, note: "Mirror via USD" },
    ],
    context: "RISK-OFF",
    conclusion: "Most correlated markets confirm EURUSD downside bias",
  };
}

function getPositioning() {
  return {
    retail:         { long_pct: 72, short_pct: 28, trend: "up" },
    institutional:  { long_pct: 35, short_pct: 65, trend: "down" },
    extreme:        true,
    risk:           "high",
    provider:       "mock",
    note:           "Retail crowded long while institutions short — reversal/continuation risk",
  };
}

function getVolatility() {
  return {
    atr_pips: 95,
    atr_change_pct: 27,
    iv_pct: 14.2,
    iv_change_pct: 18,
    expected_range_pips: 95,
    status: "ELEVATED",
    advice: "Reduce position size by 30%",
  };
}

async function getOrderBook(symbol: string) {
  const adapter = getActiveAdapter();
  if (adapter.provider !== "mock") {
    try {
      const pricing = await adapter.getPricing([symbol]);
      const priceObj = pricing[symbol];
      if (priceObj) {
        const p = priceObj.mid || ((priceObj.bid + priceObj.ask) / 2);
        const bid = priceObj.bid;
        const ask = priceObj.ask;
        const d = SYMBOLS[symbol]?.digits || 5;
        const tick = Math.pow(10, -d);
        const rng = new SeededRandom(hashString(symbol) + Math.floor(p * 100000));
        const bids = [];
        const asks = [];
        for (let i = 0; i < 10; i++) {
          bids.push({
            price: parseFloat((bid - i * tick).toFixed(d)),
            size: parseFloat(rng.uniform(0.5, 8.0).toFixed(2)),
          });
          asks.push({
            price: parseFloat((ask + i * tick).toFixed(d)),
            size: parseFloat(rng.uniform(0.5, 8.0).toFixed(2)),
          });
        }
        return {
          symbol,
          bids,
          asks,
          spread: parseFloat((ask - bid).toFixed(d)),
          source: adapter.provider,
        };
      }
    } catch (err) {
      console.warn("Failed to get order book pricing from adapter, falling back to mock:", err);
    }
  }

  const base = SYMBOLS[symbol] || { price: 1.0950, digits: 5 };
  const p = base.price;
  const d = base.digits;
  const tick = Math.pow(10, -d);

  // Use a stable seed for the orderbook based on symbol hash
  const rng = new SeededRandom(hashString(symbol));
  const bids = [];
  const asks = [];

  for (let i = 0; i < 10; i++) {
    bids.push({
      price: parseFloat((p - (i + 1) * tick).toFixed(d)),
      size: parseFloat(rng.uniform(0.5, 8.0).toFixed(2)),
    });
    asks.push({
      price: parseFloat((p + (i + 1) * tick).toFixed(d)),
      size: parseFloat(rng.uniform(0.5, 8.0).toFixed(2)),
    });
  }

  return {
    symbol,
    bids,
    asks,
    spread: parseFloat((2 * tick).toFixed(d)),
    source: "mock",
  };
}

function getTechnicalSignals() {
  return [
    { name: "MACD",           value: "Bearish Divergence", status: "bearish", strength: 0.78 },
    { name: "RSI(14)",        value: "35 (Oversold)",       status: "bearish", strength: 0.62 },
    { name: "Price vs MA50",  value: "Below by 0.18%",     status: "bearish", strength: 0.55 },
    { name: "Price vs MA200", value: "Below by 0.62%",     status: "bearish", strength: 0.81 },
    { name: "ADX(14)",        value: "28 (Trending)",       status: "neutral", strength: 0.50 },
    { name: "BBands",         value: "Lower band touch",   status: "neutral", strength: 0.40 },
    { name: "Stoch(14,3)",    value: "21/18 oversold",     status: "bearish", strength: 0.65 },
    { name: "R:R Setup",      value: "1:3.33 valid",       status: "bullish_setup", strength: 0.90 },
  ];
}

async function getJournalList() {
  await seedDemoTradesIfEmpty();
  const closed = await prisma.trade.findMany({
    where: { NOT: { outcome: "Open" } },
    orderBy: { closeTime: "desc" },
    take: 6,
  });

  return closed.map(t => {
    const duration = "3h 0m";
    return {
      id: t.ticket || t.id.toString(),
      symbol: t.pair,
      side: t.direction === "Long" ? "BUY" : "SELL",
      pnl: Number(t.profit),
      opened: t.openTime ? t.openTime.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + t.openTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
      closed: t.closeTime ? t.closeTime.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + t.closeTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
      tag: t.strategy || "Trend",
    };
  });
}

function getAlertsList() {
  const now = new Date();
  return [
    { time_iso: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),  level: "warn",   title: "Volatility ATR +27%",            category: "risk" },
    { time_iso: new Date(now.getTime() - 12 * 60 * 1000).toISOString(), level: "info",   title: "EURUSD touched MA50 1.0950",      category: "price" },
    { time_iso: new Date(now.getTime() - 24 * 60 * 1000).toISOString(), level: "alert",  title: "ECB decision in 47 minutes",      category: "event" },
    { time_iso: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), level: "ok",     title: "Margin healthy (45%)",            category: "account" },
  ];
}

// ----------------------------------------------------
// ROUTES IMPLEMENTATION
// ----------------------------------------------------

// GET /api/terminal/snapshot
router.get("/terminal/snapshot", async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || "EURUSD";
    const timeframe = (req.query.timeframe as string) || "H4";

    const adapter = getActiveAdapter(req);

    // Fetch candles via adapter, fallback if error
    let candles;
    try {
      candles = await adapter.getCandles(symbol, timeframe, 200);
    } catch (err) {
      console.warn("Failed to fetch candles via adapter, using mock fallback:", err);
      candles = generateCandles(symbol, timeframe, 200);
    }

    const watchlist = getWatchlist();

    // Fetch positions via adapter, fallback if error
    let positions;
    try {
      positions = await adapter.getPositions();
    } catch (err) {
      console.warn("Failed to fetch positions via adapter, using mock fallback:", err);
      positions = await getPositionsList();
    }

    // Fetch account via adapter, fallback if error
    let account;
    try {
      account = await adapter.getAccount();
    } catch (err) {
      console.warn("Failed to fetch account via adapter, using mock fallback:", err);
      account = await getAccountData();
    }

    const checklist = getSetupChecklist();
    const confluence = getConfluence();
    const central_banks = getCentralBanks();

    // Fetch dynamic events if Trading Economics API configured
    let events;
    try {
      const keys = getSettings().api_keys || {};
      const teKey = keys.tradingeconomics;
      if (teKey) {
        const teEvents = await fetchTECalendar(teKey, 3);
        if (teEvents && teEvents.length) {
          events = teEvents;
        }
      }
    } catch (err) {
      console.warn("Snapshot fetchTECalendar failed:", err);
    }
    if (!events || !events.length) {
      events = getEvents(3);
    }

    // Fetch dynamic news if Marketaux or NewsAPI configured
    let news;
    try {
      const keys = getSettings().api_keys || {};
      const newsRes = await getRealNews(keys, symbol, 6);
      if (newsRes && newsRes.items && newsRes.items.length) {
        news = newsRes.items;
      }
    } catch (err) {
      console.warn("Snapshot news fetch failed:", err);
    }
    if (!news || !news.length) {
      news = getNews();
    }

    const correlations = getCorrelations();

    // Fetch positioning via MyFXBook if available, else fallback
    let positioning;
    try {
      const keys = getSettings().api_keys || {};
      const email = keys.myfxbook_email;
      const password = keys.myfxbook_password;
      if (email && password) {
        const outlookList = await fetchCommunityOutlook(email, password);
        const normSym = symbol.toUpperCase().replace("/", "");
        const match = outlookList.find(item => {
          const itemSym = item.symbol.toUpperCase().replace("/", "");
          return itemSym === normSym;
        });
        if (match) {
          const extreme = Math.abs(match.long_pct - 50) >= 20;
          const risk = extreme ? "high" : "low";
          const instLong = match.short_pct;
          const instShort = match.long_pct;
          positioning = {
            retail: {
              long_pct: match.long_pct,
              short_pct: match.short_pct,
              trend: match.long_pct > 50 ? "up" : "down"
            },
            institutional: {
              long_pct: instLong,
              short_pct: instShort,
              trend: instLong > 50 ? "up" : "down"
            },
            extreme,
            risk,
            provider: "myfxbook",
            note: `MyFXBook: Retail is crowded ${match.long_pct > 50 ? "long" : "short"} (${match.long_pct}%) while institutions are opposite (${instLong}%)`
          };
        }
      }
    } catch (err) {
      console.warn("Snapshot MyFXBook positioning failed:", err);
    }
    if (!positioning) {
      positioning = getPositioning();
    }

    const volatility = getVolatility();
    const order_book = await getOrderBook(symbol);
    const signals = getTechnicalSignals();
    const journal = await getJournalList();
    const alerts = getAlertsList();

    const currentSettings = getSettings();
    const brokerProvider = currentSettings.broker?.provider || "mock";

    // Test actual connection
    let connected = true;
    let pingMsg = "Connected";
    try {
      const pingRes = await adapter.ping();
      connected = pingRes.ok;
      pingMsg = pingRes.message;
    } catch (err: any) {
      connected = false;
      pingMsg = err.message || "Failed to ping broker";
    }

    res.json({
      symbol,
      timeframe,
      candles,
      watchlist,
      positions,
      account,
      checklist,
      confluence,
      central_banks,
      events,
      news,
      correlations,
      positioning,
      volatility,
      order_book,
      signals,
      journal,
      alerts,
      status: {
        connected: connected,
        mt5_online: brokerProvider === "mt5_bridge" ? connected : false,
        backend: "healthy",
        latency_ms: 45,
        updates_per_sec: 523,
        live: brokerProvider !== "mock" && connected,
        provider: brokerProvider,
        message: pingMsg,
      },
    });
  } catch (error) {
    console.error("Error generating snapshot:", error);
    res.status(500).json({ error: "Failed to generate terminal snapshot" });
  }
});

// GET /api/terminal/symbols
router.get("/terminal/symbols", (req, res) => {
  const result = Object.keys(SYMBOLS).map(s => ({
    symbol: s,
    price: SYMBOLS[s].price,
    digits: SYMBOLS[s].digits,
    name: SYMBOLS[s].name,
  }));
  res.json(result);
});

// GET /api/terminal/candles
router.get("/terminal/candles", async (req, res) => {
  const symbol = (req.query.symbol as string) || "EURUSD";
  const timeframe = (req.query.timeframe as string) || "H4";
  const limit = parseInt(req.query.limit as string) || 200;

  try {
    const adapter = getActiveAdapter(req);
    let candles;
    try {
      candles = await adapter.getCandles(symbol, timeframe, limit);
    } catch (err) {
      console.warn("Failed to fetch candles via adapter, using mock fallback:", err);
      candles = generateCandles(symbol, timeframe, limit);
    }
    res.json({
      symbol,
      timeframe,
      candles,
      source: adapter.provider,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load candles" });
  }
});

// GET /api/terminal/watchlist
router.get("/terminal/watchlist", (req, res) => {
  res.json(getWatchlist());
});

// GET /api/terminal/positions
router.get("/terminal/positions", async (req, res) => {
  try {
    const adapter = getActiveAdapter(req);
    let list;
    try {
      list = await adapter.getPositions();
    } catch (err) {
      console.warn("Failed to fetch positions via adapter, using mock fallback:", err);
      list = await getPositionsList();
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to load positions" });
  }
});

// GET /api/terminal/account
router.get("/terminal/account", async (req, res) => {
  try {
    const adapter = getActiveAdapter(req);
    let acc;
    try {
      acc = await adapter.getAccount();
    } catch (err) {
      console.warn("Failed to fetch account via adapter, using mock fallback:", err);
      acc = await getAccountData();
    }
    res.json(acc);
  } catch (error) {
    res.status(500).json({ error: "Failed to load account details" });
  }
});

// GET /api/terminal/setup-checklist
router.get("/terminal/setup-checklist", (req, res) => {
  res.json(getSetupChecklist());
});

// GET /api/terminal/confluence
router.get("/terminal/confluence", (req, res) => {
  res.json(getConfluence());
});

// GET /api/terminal/central-banks
router.get("/terminal/central-banks", (req, res) => {
  res.json(getCentralBanks());
});

// GET /api/terminal/economic-events
router.get("/terminal/economic-events", async (req, res) => {
  try {
    const keys = getSettings().api_keys || {};
    const teKey = keys.tradingeconomics;
    if (teKey) {
      const teEvents = await fetchTECalendar(teKey, 7);
      if (teEvents && teEvents.length) {
        return res.json(teEvents.slice(0, 8));
      }
    }
    res.json(getEvents(7));
  } catch (error) {
    res.json(getEvents(7));
  }
});

// GET /api/terminal/news
router.get("/terminal/news", async (req, res) => {
  try {
    const symbol = req.query.symbol as string;
    const keys = getSettings().api_keys || {};
    const newsRes = await getRealNews(keys, symbol, 12);
    if (newsRes && newsRes.items && newsRes.items.length) {
      return res.json(newsRes.items);
    }
    res.json(getNews());
  } catch (error) {
    res.json(getNews());
  }
});

// GET /api/terminal/correlations
router.get("/terminal/correlations", (req, res) => {
  res.json(getCorrelations());
});

// GET /api/terminal/positioning
router.get("/terminal/positioning", async (req, res) => {
  try {
    const symbol = (req.query.symbol as string) || "EURUSD";
    const keys = getSettings().api_keys || {};
    const email = keys.myfxbook_email;
    const password = keys.myfxbook_password;
    if (email && password) {
      const outlookList = await fetchCommunityOutlook(email, password);
      const normSym = symbol.toUpperCase().replace("/", "");
      const match = outlookList.find(item => {
        const itemSym = item.symbol.toUpperCase().replace("/", "");
        return itemSym === normSym;
      });

      if (match) {
        const extreme = Math.abs(match.long_pct - 50) >= 20;
        const risk = extreme ? "high" : "low";
        const instLong = match.short_pct;
        const instShort = match.long_pct;

        return res.json({
          retail: {
            long_pct: match.long_pct,
            short_pct: match.short_pct,
            trend: match.long_pct > 50 ? "up" : "down"
          },
          institutional: {
            long_pct: instLong,
            short_pct: instShort,
            trend: instLong > 50 ? "up" : "down"
          },
          extreme,
          risk,
          provider: "myfxbook",
          note: `MyFXBook: Retail is crowded ${match.long_pct > 50 ? "long" : "short"} (${match.long_pct}%) while institutions are opposite (${instLong}%)`
        });
      }
    }
    res.json(getPositioning());
  } catch (error) {
    res.json(getPositioning());
  }
});

// GET /api/terminal/volatility
router.get("/terminal/volatility", (req, res) => {
  res.json(getVolatility());
});

// GET /api/terminal/order-book
router.get("/terminal/order-book", async (req, res) => {
  const symbol = (req.query.symbol as string) || "EURUSD";
  res.json(await getOrderBook(symbol));
});

// GET /api/terminal/technical-signals
router.get("/terminal/technical-signals", (req, res) => {
  res.json(getTechnicalSignals());
});

// GET /api/terminal/journal
router.get("/terminal/journal", async (req, res) => {
  try {
    const list = await getJournalList();
    res.json(list);
  } catch {
    res.status(500).json({ error: "Failed to load journal list" });
  }
});

// GET /api/terminal/alerts
router.get("/terminal/alerts", (req, res) => {
  res.json(getAlertsList());
});

// GET /api/heatmap
router.get("/heatmap", (req, res) => {
  const matrix = [];
  for (const a of HEATMAP_SYMBOLS) {
    const row = { symbol: a, values: [] as any[] };
    for (const b of HEATMAP_SYMBOLS) {
      if (a === b) {
        row.values.push({ symbol: b, corr: 1.0 });
      } else {
        const seed = hashString(`${Math.min(hashString(a), hashString(b))}-${Math.max(hashString(a), hashString(b))}`);
        const rng = new SeededRandom(seed);
        row.values.push({ symbol: b, corr: parseFloat(rng.uniform(-0.95, 0.95).toFixed(2)) });
      }
    }
    matrix.push(row);
  }
  res.json({ symbols: HEATMAP_SYMBOLS, matrix });
});

// GET /api/sentiment-gauge
router.get("/sentiment-gauge", (req, res) => {
  const hourSeed = parseInt(new Date().toISOString().substring(0, 13).replace(/[-T:]/g, ""));
  const rng = new SeededRandom(hourSeed);
  const value = parseFloat(rng.uniform(-65, 65).toFixed(1));
  let label = "NEUTRAL";
  if (value > 50) label = "EXTREME GREED";
  else if (value > 20) label = "GREED";
  else if (value > -20) label = "NEUTRAL";
  else if (value > -50) label = "FEAR";
  else label = "EXTREME FEAR";

  const components = [
    { name: "Equity Momentum", value: parseFloat(rng.uniform(-80, 80).toFixed(1)) },
    { name: "Safe Haven Demand", value: parseFloat(rng.uniform(-80, 80).toFixed(1)) },
    { name: "VIX Level", value: parseFloat(rng.uniform(-80, 80).toFixed(1)) },
    { name: "Put/Call Ratio", value: parseFloat(rng.uniform(-80, 80).toFixed(1)) },
    { name: "Junk Bond Demand", value: parseFloat(rng.uniform(-80, 80).toFixed(1)) },
  ];

  res.json({ value, label, components });
});

// GET /api/macro-calendar
router.get("/macro-calendar", async (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  try {
    const keys = getSettings().api_keys || {};
    const teKey = keys.tradingeconomics;
    if (teKey) {
      const teEvents = await fetchTECalendar(teKey, days);
      if (teEvents && teEvents.length) {
        return res.json(teEvents);
      }
    }
    res.json(getEvents(days));
  } catch (error) {
    res.json(getEvents(days));
  }
});

// POST /api/risk/calculate
router.post("/risk/calculate", (req, res) => {
  const { balance, risk_pct, sl_pips, pip_value_per_lot = 10.0, leverage = 100, entry_price = 1.0 } = req.body;

  if (!balance || !risk_pct || !sl_pips) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const risk_amount = Math.round(balance * (risk_pct / 100) * 100) / 100;
  const lots = risk_amount / (sl_pips * pip_value_per_lot);
  const units = Math.round(lots * 100000);
  const notional = units * entry_price;
  const margin_required = Math.round((notional / leverage) * 100) / 100;

  res.json({
    risk_amount,
    position_size_lots: Math.round(lots * 1000) / 1000,
    position_size_units: units,
    notional: Math.round(notional * 100) / 100,
    margin_required,
    max_loss: risk_amount,
    rr_targets: {
      "1R_pips": sl_pips,
      "2R_pips": sl_pips * 2,
      "3R_pips": sl_pips * 3,
      "2R_profit": Math.round(risk_amount * 2 * 100) / 100,
      "3R_profit": Math.round(risk_amount * 3 * 100) / 100,
    },
  });
});

const sentimentCache: Record<string, any> = {};

function hashHeadlines(headlines: string[]): string {
  const sorted = [...headlines].sort().join("||");
  return crypto.createHash("md5").update(sorted).digest("hex");
}

// POST /api/news/analyze
router.post("/news/analyze", async (req, res) => {
  const { headlines } = req.body as { headlines: string[] };
  if (!headlines || !headlines.length) {
    return res.status(400).json({ error: "No headlines to analyze" });
  }

  const runFallback = () => {
    const pos_words = ["rally", "surge", "beat", "rise", "gain", "boost", "strong", "bullish", "inflow", "support"];
    const neg_words = ["plunge", "miss", "fall", "drop", "cut", "weak", "bearish", "outflow", "slump", "disappoint", "dovish", "pause"];

    const items = headlines.map(h => {
      const low = h.toLowerCase();
      const pos = pos_words.filter(w => low.includes(w)).length;
      const neg = neg_words.filter(w => low.includes(w)).length;
      const raw = (pos - neg) * 25;
      const score = Math.max(-100, Math.min(100, raw));
      return {
        headline: h,
        score,
        label: score > 10 ? "bullish" : (score < -10 ? "bearish" : "neutral"),
      };
    });

    const overall = Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
    let label = "NEUTRAL";
    if (overall > 50) label = "EXTREME_GREED";
    else if (overall > 20) label = "GREED";
    else if (overall > -20) label = "NEUTRAL";
    else if (overall > -50) label = "FEAR";
    else label = "EXTREME_FEAR";

    return {
      overall,
      label,
      summary: "Rule-based sentiment from keyword scan.",
      items,
      cached: false,
      fallback: true,
    };
  };

  const cacheKey = hashHeadlines(headlines);
  if (sentimentCache[cacheKey]) {
    return res.json({ ...sentimentCache[cacheKey], cached: true });
  }

  const emergent_key = process.env.EMERGENT_LLM_KEY || getSettings().api_keys?.emergent_llm_key;
  if (!emergent_key) {
    const fb = runFallback();
    return res.json(fb);
  }

  try {
    const system = (
      "You are a financial markets sentiment analyst. Given a list of news headlines, " +
      "respond ONLY with a valid JSON object (no markdown fences) with this schema: " +
      "{\"overall\": <int -100..100>, \"label\": <one of EXTREME_FEAR,FEAR,NEUTRAL,GREED,EXTREME_GREED>, " +
      "\"summary\": <one-line market impact, max 140 chars>, " +
      "\"items\": [{\"headline\": <verbatim>, \"score\": <int -100..100>, \"label\": <bullish|bearish|neutral>}]}. " +
      "Bullish for USD = bearish for EURUSD; treat each headline at face value."
    );
    const user_text = "Headlines:\n" + headlines.map(h => `- ${h}`).join("\n");

    const response = await axios.post("https://api.anthropic.com/v1/messages", {
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4000,
      system: system,
      messages: [
        {
          role: "user",
          content: user_text
        }
      ]
    }, {
      headers: {
        "x-api-key": emergent_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      timeout: 25000
    });

    const responseText = response.data?.content?.[0]?.text || "";
    let text = responseText.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    }
    const data = JSON.parse(text);
    sentimentCache[cacheKey] = data;
    return res.json({ ...data, cached: false });
  } catch (err: any) {
    console.warn("Claude sentiment analysis failed, falling back:", err.message);
    const fb = runFallback();
    return res.json({ ...fb, error: err.message });
  }
});

// GET /api/journal/trades
router.get("/journal/trades", async (req, res) => {
  try {
    await seedDemoTradesIfEmpty();
    const status = req.query.status as string;

    const query: any = { NOT: { outcome: "Open" } };
    if (status === "open") {
      query.outcome = "Open";
    }

    const closedTradesPrisma = await prisma.trade.findMany({
      where: query,
      orderBy: { openTime: "desc" },
    });

    const trades = closedTradesPrisma.map(t => ({
      id: t.ticket || t.id.toString(),
      symbol: t.pair,
      side: t.direction === "Long" ? "BUY" : "SELL",
      volume: Number(t.lotSize),
      entry: Number(t.entry),
      exit: t.closePrice ? Number(t.closePrice) : Number(t.entry),
      sl: t.sl ? Number(t.sl) : null,
      tp: t.tp ? Number(t.tp) : null,
      pnl: Number(t.profit),
      status: t.outcome === "Open" ? "open" : "closed",
      tag: t.strategy || "demo",
      opened_at: t.openTime?.toISOString() || new Date().toISOString(),
      closed_at: t.closeTime?.toISOString() || new Date().toISOString(),
    }));

    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: "Failed to load journal trades" });
  }
});

// POST /api/journal/trades
router.post("/journal/trades", async (req, res) => {
  try {
    const { symbol, side, volume, entry, exit, sl, tp, pnl, tag, notes } = req.body;

    const trade = await prisma.trade.create({
      data: {
        date: new Date(),
        pair: symbol,
        direction: side === "BUY" ? "Long" : "Short",
        entry: Number(entry),
        closePrice: exit ? Number(exit) : null,
        sl: sl ? Number(sl) : null,
        tp: tp ? Number(tp) : null,
        profit: pnl ? Number(pnl) : 0,
        outcome: pnl !== undefined ? (pnl >= 0 ? "Win" : "Loss") : "Open",
        strategy: tag || "Manual",
        setupType: tag || "Manual",
        notes: notes || "Added from terminal journal",
        ticket: `T-${Date.now()}`,
        openTime: new Date(),
        closeTime: exit ? new Date() : null,
        lotSize: Number(volume),
      },
    });

    res.json({
      id: trade.ticket || trade.id.toString(),
      symbol: trade.pair,
      side: trade.direction === "Long" ? "BUY" : "SELL",
      volume: Number(trade.lotSize),
      entry: Number(trade.entry),
      exit: trade.closePrice ? Number(trade.closePrice) : null,
      sl: trade.sl ? Number(trade.sl) : null,
      tp: trade.tp ? Number(trade.tp) : null,
      pnl: Number(trade.profit),
      status: trade.outcome === "Open" ? "open" : "closed",
      tag: trade.strategy,
      opened_at: trade.openTime?.toISOString(),
      closed_at: trade.closeTime?.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create trade" });
  }
});

// DELETE /api/journal/trades/:trade_id
router.delete("/journal/trades/:trade_id", async (req, res) => {
  try {
    const ticket = req.params.trade_id;
    const trade = await prisma.trade.findFirst({
      where: {
        OR: [
          { ticket },
          { id: isNaN(Number(ticket)) ? -1 : Number(ticket) },
        ],
      },
    });

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    await prisma.trade.delete({ where: { id: trade.id } });
    res.json({ deleted: 1 });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

// GET /api/journal/stats
router.get("/journal/stats", async (req, res) => {
  try {
    await seedDemoTradesIfEmpty();
    const closedTrades = await prisma.trade.findMany({
      where: { NOT: { outcome: "Open" } },
      orderBy: { closeTime: "asc" },
    });

    if (closedTrades.length === 0) {
      return res.json({ trades_count: 0 });
    }

    const pnls = closedTrades.map(t => Number(t.profit));
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    const total_pnl = pnls.reduce((a, b) => a + b, 0);

    const win_rate = pnls.length ? Math.round((wins.length / pnls.length) * 1000) / 10 : 0;
    const totalWins = wins.reduce((a, b) => a + b, 0);
    const totalLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
    const profit_factor = totalLosses > 0 ? Math.round((totalWins / totalLosses) * 100) / 100 : 0;

    const avg_win = wins.length ? Math.round((totalWins / wins.length) * 100) / 100 : 0;
    const avg_loss = losses.length ? Math.round((losses.reduce((a, b) => a + b, 0) / losses.length) * 100) / 100 : 0;

    let equity = 100000.0;
    const curve = closedTrades.map(t => {
      equity += Number(t.profit);
      return {
        date: t.closeTime ? t.closeTime.toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        equity: Math.round(equity * 100) / 100,
      };
    });

    const monthlyMap: Record<string, { month: string; pnl: number; trades: number }> = {};
    for (const t of closedTrades) {
      const m = t.closeTime ? t.closeTime.toISOString().substring(0, 7) : new Date().toISOString().substring(0, 7);
      if (!monthlyMap[m]) {
        monthlyMap[m] = { month: m, pnl: 0, trades: 0 };
      }
      monthlyMap[m].pnl += Number(t.profit);
      monthlyMap[m].trades += 1;
    }
    const monthly = Object.values(monthlyMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({ ...m, pnl: Math.round(m.pnl * 100) / 100 }));

    res.json({
      trades_count: closedTrades.length,
      wins: wins.length,
      losses: losses.length,
      win_rate,
      profit_factor,
      avg_win,
      avg_loss,
      best_trade: pnls.length ? Math.round(Math.max(...pnls) * 100) / 100 : 0,
      worst_trade: pnls.length ? Math.round(Math.min(...pnls) * 100) / 100 : 0,
      total_pnl: Math.round(total_pnl * 100) / 100,
      equity_curve: curve,
      monthly,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate stats" });
  }
});

// POST /api/orders
router.post("/orders", async (req, res) => {
  try {
    const { symbol, side, volume, sl, tp } = req.body;
    const adapter = getActiveAdapter(req);
    const result = await adapter.submitOrder(
      symbol,
      side,
      Number(volume),
      sl ? Number(sl) : undefined,
      tp ? Number(tp) : undefined
    );

    // Async dispatch trade alert
    try {
      const keys = getSettings().api_keys || {};
      const content = fmtTradeOpen(result.symbol, result.side, result.volume, result.entry, result.sl, result.tp);
      dispatchAlert(keys, content).catch(err => console.warn("Failed to dispatch order open alert:", err.message));
    } catch (alertErr: any) {
      console.warn("Failed to format/dispatch trade open alert:", alertErr.message);
    }

    res.json(result);
  } catch (error: any) {
    console.error("Order submission error:", error);
    res.status(500).json({ error: error.message || "Failed to place order" });
  }
});

// POST /api/orders/:trade_id/close
router.post("/orders/:trade_id/close", async (req, res) => {
  try {
    const ticket = req.params.trade_id;
    const adapter = getActiveAdapter(req);
    const result = await adapter.closeTrade(ticket);

    // Async dispatch trade close alert
    try {
      const keys = getSettings().api_keys || {};
      const content = fmtTradeClose(result.symbol, result.side, result.exit || result.current || result.entry, result.pnl || 0);
      dispatchAlert(keys, content).catch(err => console.warn("Failed to dispatch order close alert:", err.message));
    } catch (alertErr: any) {
      console.warn("Failed to format/dispatch trade close alert:", alertErr.message);
    }

    res.json(result);
  } catch (error: any) {
    console.error("Order close error:", error);
    res.status(500).json({ error: error.message || "Failed to close trade" });
  }
});

// GET /api/settings/broker
router.get("/settings/broker", (req, res) => {
  // Guests receive a safe empty config — never expose real API keys
  if (!isAdmin(req)) {
    return res.json({
      provider: "mock",
      environment: "practice",
      api_key: "",
      api_secret: "",
      account_id: "",
      base_url: "",
      connected: true,
    });
  }
  const current = getSettings();
  const broker = current.broker || {
    provider: "mock",
    environment: "practice",
    api_key: "",
    api_secret: "",
    account_id: "",
    base_url: "",
    connected: false,
  };
  res.json(broker);
});

// POST /api/settings/broker
router.post("/settings/broker", (req, res) => {
  const payload = req.body;
  // Guests cannot overwrite the admin's broker config
  if (!isAdmin(req)) {
    return res.json({
      ...payload,
      connected: false,
      api_secret_masked: false,
      _guest: true,
    });
  }
  const current = getSettings();
  // Always reset connected=false on save — terminal stays in mock mode
  // until the user explicitly tests and confirms the connection.
  current.broker = { ...payload, connected: false };
  saveSettings(current);

  res.json({
    ...payload,
    connected: false,
    api_secret_masked: !!payload.api_secret,
  });
});

// POST /api/settings/broker/test
router.post("/settings/broker/test", async (req, res) => {
  // Guests get a simulated mock success — they never test live credentials
  if (!isAdmin(req)) {
    return res.json({
      success: true,
      connected: true,
      provider: "mock",
      message: "Mock paper trading adapter always available",
    });
  }
  try {
    const current = getSettings();
    const broker = current.broker || { provider: "mock" };
    const adapter = buildAdapter(broker);
    const testResult = await adapter.ping();

    // Persist connected status so terminal goes live immediately after a successful test
    current.broker = { ...broker, connected: testResult.ok };
    saveSettings(current);

    res.json({
      success: testResult.ok,
      connected: testResult.ok,
      provider: broker.provider,
      message: testResult.message,
    });
  } catch (error: any) {
    // Make sure connected stays false on error
    const current = getSettings();
    if (current.broker) {
      current.broker.connected = false;
      saveSettings(current);
    }
    // Return 200 with success: false instead of 500, so that the client handles it as a logical failure gracefully
    res.json({
      success: false,
      connected: false,
      error: error.message || "Connection test failed",
    });
  }
});

// GET /api/settings/api-keys
router.get("/settings/api-keys", (req, res) => {
  // Guests see no real keys
  if (!isAdmin(req)) {
    return res.json({
      marketaux: "", newsapi: "", tradingeconomics: "",
      discord_webhook: "", telegram_bot_token: "", telegram_chat_id: "",
      myfxbook_email: "", myfxbook_password: "", emergent_llm_key: "",
      configured: {
        marketaux: false, newsapi: false, tradingeconomics: false,
        discord_webhook: false, telegram: false, myfxbook: false, emergent_llm_key: false,
      },
    });
  }
  const current = getSettings();
  const keys = current.api_keys || {};

  res.json({
    marketaux: keys.marketaux ? "***" : "",
    newsapi: keys.newsapi ? "***" : "",
    tradingeconomics: keys.tradingeconomics ? "***" : "",
    discord_webhook: keys.discord_webhook ? "***" : "",
    telegram_bot_token: keys.telegram_bot_token ? "***" : "",
    telegram_chat_id: keys.telegram_chat_id || "",
    myfxbook_email: keys.myfxbook_email || "",
    myfxbook_password: keys.myfxbook_password ? "***" : "",
    emergent_llm_key: keys.emergent_llm_key ? "***" : "",
    configured: {
      marketaux: !!keys.marketaux,
      newsapi: !!keys.newsapi,
      tradingeconomics: !!keys.tradingeconomics,
      discord_webhook: !!keys.discord_webhook,
      telegram: !!(keys.telegram_bot_token && keys.telegram_chat_id),
      myfxbook: !!(keys.myfxbook_email && keys.myfxbook_password),
      emergent_llm_key: !!keys.emergent_llm_key,
    },
  });
});

// POST /api/settings/api-keys
router.post("/settings/api-keys", (req, res) => {
  // Guests cannot overwrite the admin's API keys
  if (!isAdmin(req)) {
    return res.json({ saved: false, configured: [], _guest: true });
  }
  const keys = req.body;
  const current = getSettings();
  const existing = current.api_keys || {};

  const merged = { ...existing };
  for (const [k, v] of Object.entries(keys)) {
    if (v === "CLEAR") {
      delete merged[k];
    } else if (v) {
      merged[k] = v;
    }
  }

  current.api_keys = merged;
  saveSettings(current);

  res.json({
    saved: true,
    configured: Object.keys(merged),
  });
});

// GET /api/drawings
router.get("/drawings", (req, res) => {
  const symbol = req.query.symbol as string;
  const drawings = getDrawings();
  const filtered = symbol ? drawings.filter(d => d.symbol === symbol) : drawings;
  res.json(filtered);
});

// POST /api/drawings
router.post("/drawings", (req, res) => {
  const d = req.body;
  const drawings = getDrawings();
  d.created_at = d.created_at || new Date().toISOString();
  drawings.push(d);
  saveDrawings(drawings);
  res.json(d);
});

// DELETE /api/drawings/:drawing_id
router.delete("/drawings/:drawing_id", (req, res) => {
  const drawingId = req.params.drawing_id;
  const drawings = getDrawings();
  const nextDrawings = drawings.filter(d => d.id !== drawingId);
  const deleted = drawings.length - nextDrawings.length;
  saveDrawings(nextDrawings);
  res.json({ deleted });
});

// DELETE /api/drawings
router.delete("/drawings", (req, res) => {
  const symbol = req.query.symbol as string;
  if (!symbol) {
    return res.status(400).json({ error: "Missing symbol parameter" });
  }

  const drawings = getDrawings();
  const nextDrawings = drawings.filter(d => d.symbol !== symbol);
  const deleted = drawings.length - nextDrawings.length;
  saveDrawings(nextDrawings);
  res.json({ deleted });
});

// GET /api/performance/equity-curve
router.get("/performance/equity-curve", async (req, res) => {
  try {
    await seedDemoTradesIfEmpty();
    const closedTrades = await prisma.trade.findMany({
      where: { NOT: { outcome: "Open" } },
      orderBy: { closeTime: "asc" },
    });

    let equity = 100000.0;
    const curve = closedTrades.map(t => {
      equity += Number(t.profit);
      return {
        date: t.closeTime ? t.closeTime.toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        equity: Math.round(equity * 100) / 100,
      };
    });

    const monthlyMap: Record<string, { month: string; pnl: number; trades: number }> = {};
    for (const t of closedTrades) {
      const m = t.closeTime ? t.closeTime.toISOString().substring(0, 7) : new Date().toISOString().substring(0, 7);
      if (!monthlyMap[m]) {
        monthlyMap[m] = { month: m, pnl: 0, trades: 0 };
      }
      monthlyMap[m].pnl += Number(t.profit);
      monthlyMap[m].trades += 1;
    }
    const monthly = Object.values(monthlyMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({ ...m, pnl: Math.round(m.pnl * 100) / 100 }));

    res.json({
      curve,
      monthly,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate performance curve" });
  }
});

// GET /api/news/headlines
router.get("/news/headlines", async (req, res) => {
  try {
    const symbol = req.query.symbol as string;
    const keys = getSettings().api_keys || {};
    const newsRes = await getRealNews(keys, symbol, 12);
    if (newsRes && newsRes.items && newsRes.items.length) {
      return res.json({
        provider: newsRes.provider,
        items: newsRes.items,
        cached: newsRes.cached || false,
      });
    }
    res.json({
      provider: "mock",
      items: getNews(),
      cached: false,
    });
  } catch (error) {
    res.json({
      provider: "mock",
      items: getNews(),
      cached: false,
    });
  }
});

export default router;
