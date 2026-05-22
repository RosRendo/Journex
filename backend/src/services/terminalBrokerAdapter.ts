import axios from "axios";
import prisma from "../config/database";
const { HttpsProxyAgent } = require("https-proxy-agent");

// ----------------------------------------------------
// SYMBOLS & CONSTANTS (Shared for Mocks & Fallbacks)
// ----------------------------------------------------
export const SYMBOLS: Record<string, { price: number; digits: number; name: string }> = {
  "EURUSD": { price: 1.0950, digits: 5, name: "Euro / US Dollar" },
  "GBPUSD": { price: 1.2650, digits: 5, name: "Pound / US Dollar" },
  "USDJPY": { price: 152.40, digits: 3, name: "US Dollar / Japanese Yen" },
  "AUDUSD": { price: 0.6780, digits: 5, name: "Australian / US Dollar" },
  "NZDUSD": { price: 0.5950, digits: 5, name: "New Zealand / US Dollar" },
  "USDCHF": { price: 0.9020, digits: 5, name: "US Dollar / Swiss Franc" },
  "USDCAD": { price: 1.3680, digits: 5, name: "US Dollar / Canadian Dollar" },
  "XAUUSD": { price: 2400.0, digits: 2, name: "Gold / US Dollar" },
  "XAGUSD": { price: 28.50, digits: 3, name: "Silver / US Dollar" },
  "AUDJPY": { price: 97.80, digits: 3, name: "Australian / Japanese Yen" },
  "EURJPY": { price: 167.50, digits: 3, name: "Euro / Japanese Yen" },
};

// Seeded Random Generator for deterministic mock candle walk
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

export function generateCandles(symbol: string, timeframe: string, n = 200) {
  const base = SYMBOLS[symbol] || { price: 1.0, digits: 5 };
  const seed = hashString(symbol + timeframe);
  const rng = new SeededRandom(seed);
  const price = base.price;
  const digits = base.digits;

  const tfSecs = timeframeSeconds(timeframe);
  const vol = price * 0.0008 * (1 + Math.log1p(tfSecs / 3600));
  const step = tfSecs;

  let endTs = Math.floor(Date.now() / 1000);
  endTs = endTs - (endTs % step);

  const candles = [];
  let cur = price;
  for (let i = 0; i < n; i++) {
    const ts = endTs - (n - 1 - i) * step;
    const drift = rng.uniform(-vol * 0.4, vol * 0.4);
    const open_p = cur;
    const close_p = open_p + drift + rng.uniform(-vol, vol) * 0.6;
    const high_p = Math.max(open_p, close_p) + Math.abs(rng.uniform(0, vol));
    const low_p = Math.min(open_p, close_p) - Math.abs(rng.uniform(0, vol));
    const volume = rng.randint(500, 5000);
    candles.push({
      time: ts,
      open: parseFloat(open_p.toFixed(digits)),
      high: parseFloat(high_p.toFixed(digits)),
      low: parseFloat(low_p.toFixed(digits)),
      close: parseFloat(close_p.toFixed(digits)),
      volume: volume,
    });
    cur = close_p;
  }
  return candles;
}

// ----------------------------------------------------
// UNIFIED BROKER ADAPTER INTERFACE
// ----------------------------------------------------
export interface BrokerAdapter {
  provider: string;
  ping(): Promise<{ ok: boolean; provider: string; message: string }>;
  getCandles(symbol: string, timeframe: string, limit: number): Promise<any[]>;
  getPricing(symbols: string[]): Promise<Record<string, { bid: number; ask: number; mid: number }>>;
  getAccount(): Promise<any>;
  getPositions(): Promise<any[]>;
  submitOrder(symbol: string, side: "BUY" | "SELL", volume: number, sl?: number, tp?: number): Promise<any>;
  closeTrade(tradeId: string): Promise<any>;
}

// ----------------------------------------------------
// 1. MOCK / PAPER ADAPTER
// ----------------------------------------------------
export class MockAdapter implements BrokerAdapter {
  provider = "mock";

  async ping() {
    return { ok: true, provider: "mock", message: "Mock paper trading adapter always available" };
  }

  async getCandles(symbol: string, timeframe: string, limit: number) {
    return generateCandles(symbol, timeframe, limit);
  }

  async getPricing(symbols: string[]) {
    const out: Record<string, { bid: number; ask: number; mid: number }> = {};
    for (const s of symbols) {
      const data = SYMBOLS[s];
      if (!data) continue;
      const tick = Math.pow(10, -data.digits);
      out[s] = {
        bid: parseFloat((data.price - tick).toFixed(data.digits)),
        ask: parseFloat((data.price + tick).toFixed(data.digits)),
        mid: data.price
      };
    }
    return out;
  }

  async getAccount() {
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
    const positions = await this.getPositions();
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

  async getPositions() {
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

  async submitOrder(symbol: string, side: "BUY" | "SELL", volume: number, sl?: number, tp?: number) {
    const sym = SYMBOLS[symbol];
    const entry = sym ? sym.price : 1.0000;
    const ticketId = `P-${Date.now()}`;

    const trade = await prisma.trade.create({
      data: {
        date: new Date(),
        pair: symbol,
        entry: entry,
        sl: sl ? Number(sl) : null,
        tp: tp ? Number(tp) : null,
        outcome: "Open",
        direction: side === "BUY" ? "Long" : "Short",
        lotSize: Number(volume),
        profit: 0.0,
        ticket: ticketId,
        openTime: new Date(),
        notes: "Paper trade from terminal",
      },
    });

    return {
      id: trade.ticket || trade.id.toString(),
      symbol: trade.pair,
      side: trade.direction === "Long" ? "BUY" : "SELL",
      volume: Number(trade.lotSize),
      entry: Number(trade.entry),
      current: entry,
      sl: trade.sl ? Number(trade.sl) : null,
      tp: trade.tp ? Number(trade.tp) : null,
      pnl: 0.0,
      status: "open",
      tag: "live",
      opened_at: trade.openTime?.toISOString(),
    };
  }

  async closeTrade(tradeId: string) {
    const trade = await prisma.trade.findFirst({
      where: {
        OR: [
          { ticket: tradeId },
          { id: isNaN(Number(tradeId)) ? -1 : Number(tradeId) },
        ],
      },
    });

    if (!trade) {
      throw new Error("Trade not found");
    }

    const sym = SYMBOLS[trade.pair];
    const exit_p = sym ? sym.price : Number(trade.entry);
    const direction = trade.direction === "Long" ? 1 : -1;
    const digits = sym ? sym.digits : 5;
    const pip = Math.pow(10, -digits);
    const pnl = Math.round(direction * (exit_p - Number(trade.entry)) / pip * 10 * Number(trade.lotSize || 1) * 100) / 100;

    const updated = await prisma.trade.update({
      where: { id: trade.id },
      data: {
        outcome: pnl >= 0 ? "Win" : "Loss",
        closePrice: exit_p,
        profit: pnl,
        closeTime: new Date(),
      },
    });

    return {
      id: updated.ticket || updated.id.toString(),
      symbol: updated.pair,
      side: updated.direction === "Long" ? "BUY" : "SELL",
      volume: Number(updated.lotSize),
      entry: Number(updated.entry),
      current: exit_p,
      exit: exit_p,
      sl: updated.sl ? Number(updated.sl) : null,
      tp: updated.tp ? Number(updated.tp) : null,
      pnl: pnl,
      status: "closed",
      tag: "live",
      opened_at: updated.openTime?.toISOString(),
      closed_at: updated.closeTime?.toISOString(),
    };
  }
}

// ----------------------------------------------------
// 2. MT5 BRIDGE ADAPTER
// ----------------------------------------------------
export class Mt5BridgeAdapter implements BrokerAdapter {
  provider = "mt5_bridge";
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async ping() {
    try {
      const res = await axios.get(`${this.baseUrl}/health`, { timeout: 4000 });
      if (res.status === 200) {
        if (res.data.connected) {
          return { ok: true, provider: "mt5_bridge", message: `MT5 bridge connected @ ${this.baseUrl}. Active account: #${res.data.balance !== null ? "Logged In" : "Not Logged In"}` };
        }
        return { ok: true, provider: "mt5_bridge", message: `MT5 bridge online @ ${this.baseUrl} but MetaTrader client is disconnected.` };
      }
      return { ok: false, provider: "mt5_bridge", message: `MT5 bridge returned status code ${res.status}` };
    } catch (err: any) {
      return { ok: false, provider: "mt5_bridge", message: `MT5 bridge unreachable @ ${this.baseUrl}: ${err.message}` };
    }
  }

  async getCandles(symbol: string, timeframe: string, limit: number) {
    // mt5_bridge.py does not expose a candles endpoint, so we fallback to mock candles
    return generateCandles(symbol, timeframe, limit);
  }

  async getPricing(symbols: string[]) {
    // Redo fallback logic, streaming bids/asks based on live quotes or mock walk
    const out: Record<string, { bid: number; ask: number; mid: number }> = {};
    for (const s of symbols) {
      try {
        const res = await axios.get(`${this.baseUrl}/api/symbol-price`, { params: { symbol: s }, timeout: 2000 });
        if (res.data && res.data.success) {
          out[s] = {
            bid: res.data.bid,
            ask: res.data.ask,
            mid: (res.data.bid + res.data.ask) / 2
          };
          continue;
        }
      } catch {}
      // fallback
      const data = SYMBOLS[s];
      if (data) {
        const tick = Math.pow(10, -data.digits);
        out[s] = { bid: data.price - tick, ask: data.price + tick, mid: data.price };
      }
    }
    return out;
  }

  async getAccount() {
    try {
      const res = await axios.get(`${this.baseUrl}/api/account`, { timeout: 5000 });
      if (res.data && res.data.success) {
        const a = res.data;
        const equity = a.equity;
        const margin = a.margin || 0;
        const usedMarginPct = equity > 0 ? parseFloat(((margin / equity) * 100).toFixed(2)) : 0.0;
        return {
          balance: a.balance,
          equity: a.equity,
          free_margin: a.margin_free,
          used_margin_pct: usedMarginPct,
          drawdown_pct: 0.0,
          win_rate: 70.0,
          trades_today: 0,
          profit_factor: 2.0,
          unrealized_pl: a.profit,
          currency: a.currency || "USD",
          server: a.server || "Local",
          login: a.login
        };
      }
      throw new Error(res.data.error || "No MT5 account active");
    } catch (err: any) {
      throw new Error(`MT5 account fetch failed: ${err.message}`);
    }
  }

  async getPositions() {
    try {
      const res = await axios.get(`${this.baseUrl}/api/positions`, { timeout: 5000 });
      if (res.data && res.data.success) {
        return res.data.positions.map((p: any) => {
          let duration = "0h 0m";
          if (p.openTime) {
            const diffMs = Date.now() - new Date(p.openTime).getTime();
            const hours = Math.floor(diffMs / (3600 * 1000));
            const minutes = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
            duration = `${hours}h ${minutes}m`;
          }
          return {
            id: p.ticket.toString(),
            symbol: p.pair,
            side: p.direction.toUpperCase(), // BUY or SELL
            volume: p.volume,
            entry: p.entry,
            current: p.current,
            sl: p.sl || null,
            tp: p.tp || null,
            pnl: p.pnl,
            status: "open",
            tag: "live",
            duration,
            opened_at: p.openTime
          };
        });
      }
      return [];
    } catch (err: any) {
      console.error("[Mt5BridgeAdapter] getPositions error:", err.message);
      return [];
    }
  }

  async submitOrder(symbol: string, side: "BUY" | "SELL", volume: number, sl?: number, tp?: number) {
    try {
      const payload = {
        symbol,
        direction: side,
        lot_size: volume,
        sl: sl || 0.0,
        tp: tp || 0.0,
        comment: "Bloomberg QuickTrade"
      };
      const res = await axios.post(`${this.baseUrl}/api/trade`, payload, { timeout: 6000 });
      if (res.data && res.data.success) {
        return {
          id: res.data.ticket.toString(),
          symbol,
          side,
          volume,
          entry: res.data.price,
          pnl: 0.0,
          status: "open",
          raw: res.data
        };
      }
      throw new Error(res.data.error || "Order execution failed");
    } catch (err: any) {
      throw new Error(`MT5 submitOrder error: ${err.message}`);
    }
  }

  async closeTrade(tradeId: string) {
    try {
      const payload = {
        ticket: parseInt(tradeId),
        volume: null // full close
      };
      const res = await axios.post(`${this.baseUrl}/api/close-position`, payload, { timeout: 6000 });
      if (res.data && res.data.success) {
        return {
          id: tradeId,
          status: "closed",
          raw: res.data
        };
      }
      throw new Error(res.data.error || "Close failed");
    } catch (err: any) {
      throw new Error(`MT5 closeTrade error: ${err.message}`);
    }
  }
}

// ----------------------------------------------------
// 3. OANDA V20 ADAPTER
// ----------------------------------------------------
export class OandaAdapter implements BrokerAdapter {
  provider = "oanda";
  private token: string;
  private accountId: string;
  private baseUrl: string;

  constructor(token: string, accountId: string, baseUrl?: string) {
    this.token = token;
    this.accountId = accountId;
    this.baseUrl = (baseUrl || "https://api-fxpractice.oanda.com").replace(/\/$/, "");
  }

  private async request(method: "GET" | "POST" | "PUT", path: string, data?: any, params?: any) {
    // Use OANDA_PROXY_URL env var if set (e.g. local dev behind firewall).
    // Leave unset in Railway / production — requests go direct.
    const proxyUrl = process.env.OANDA_PROXY_URL || "";
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

    const res = await axios({
      method,
      url: `${this.baseUrl}${path}`,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      ...(agent ? { httpsAgent: agent } : {}),
      data,
      params,
      timeout: 10000
    });
    return res.data;
  }

  private toOandaSymbol(s: string) {
    const clean = s.toUpperCase().replace("/", "");
    if (clean.includes("_")) return clean;
    if (clean.length === 6) return `${clean.substring(0, 3)}_${clean.substring(3)}`;
    return clean;
  }

  private fromOandaSymbol(s: string) {
    return s.replace("_", "");
  }

  async ping() {
    if (!this.token || !this.accountId) {
      return { ok: false, provider: "oanda", message: "OANDA: Missing credentials." };
    }
    try {
      const data = await this.request("GET", `/v3/accounts/${this.accountId}/summary`);
      return { ok: true, provider: "oanda", message: `OANDA active — Balance ${data.account.balance} ${data.account.currency}` };
    } catch (err: any) {
      return { ok: false, provider: "oanda", message: `OANDA failed: ${err.message}` };
    }
  }

  async getCandles(symbol: string, timeframe: string, limit: number) {
    const oSymbol = this.toOandaSymbol(symbol);
    const mapping: Record<string, string> = {
      "M1": "M1", "M5": "M5", "M15": "M15", "M30": "M30",
      "H1": "H1", "H4": "H4", "D1": "D"
    };
    const gran = mapping[timeframe.toUpperCase()] || "H4";
    try {
      const res = await this.request("GET", `/v3/instruments/${oSymbol}/candles`, undefined, {
        granularity: gran,
        count: limit,
        price: "M"
      });
      return res.candles.filter((c: any) => c.complete).map((c: any) => ({
        time: Math.floor(new Date(c.time).getTime() / 1000),
        open: parseFloat(c.mid.o),
        high: parseFloat(c.mid.h),
        low: parseFloat(c.mid.l),
        close: parseFloat(c.mid.c),
        volume: parseInt(c.volume)
      }));
    } catch {
      return generateCandles(symbol, timeframe, limit);
    }
  }

  async getPricing(symbols: string[]) {
    const oSymbols = symbols.map(s => this.toOandaSymbol(s)).join(",");
    const out: Record<string, { bid: number; ask: number; mid: number }> = {};
    try {
      const res = await this.request("GET", `/v3/accounts/${this.accountId}/pricing`, undefined, {
        instruments: oSymbols
      });
      for (const p of res.prices) {
        const sym = this.fromOandaSymbol(p.instrument);
        const bid = parseFloat(p.bids[0].price);
        const ask = parseFloat(p.asks[0].price);
        out[sym] = { bid, ask, mid: (bid + ask) / 2 };
      }
    } catch {
      for (const s of symbols) {
        const data = SYMBOLS[s];
        if (data) {
          const tick = Math.pow(10, -data.digits);
          out[s] = { bid: data.price - tick, ask: data.price + tick, mid: data.price };
        }
      }
    }
    return out;
  }

  async getAccount() {
    const res = await this.request("GET", `/v3/accounts/${this.accountId}/summary`);
    const a = res.account;
    return {
      balance: parseFloat(a.balance),
      equity: parseFloat(a.NAV),
      free_margin: parseFloat(a.marginAvailable),
      used_margin_pct: parseFloat(a.NAV) > 0 ? parseFloat(((parseFloat(a.marginUsed) / parseFloat(a.NAV)) * 100).toFixed(2)) : 0.0,
      drawdown_pct: 0.0,
      win_rate: 75.0,
      trades_today: a.openTradeCount,
      profit_factor: 2.5,
      unrealized_pl: parseFloat(a.unrealizedPL),
      currency: a.currency,
      server: "Practice/Live",
      login: this.accountId
    };
  }

  async getPositions() {
    try {
      const res = await this.request("GET", `/v3/accounts/${this.accountId}/openPositions`);
      const out = [];
      for (const p of res.positions) {
        const sym = this.fromOandaSymbol(p.instrument);
        const longUnits = parseFloat(p.long.units);
        const shortUnits = parseFloat(p.short.units);
        if (longUnits === 0 && shortUnits === 0) continue;

        const side = longUnits > 0 ? "BUY" : "SELL";
        const units = longUnits > 0 ? longUnits : Math.abs(shortUnits);
        const entry = longUnits > 0 ? parseFloat(p.long.averagePrice) : parseFloat(p.short.averagePrice);
        const pnl = longUnits > 0 ? parseFloat(p.long.unrealizedPL) : parseFloat(p.short.unrealizedPL);
        const tradeIds = longUnits > 0 ? p.long.tradeIDs : p.short.tradeIDs;

        out.push({
          id: tradeIds && tradeIds.length ? tradeIds[0] : sym,
          symbol: sym,
          side,
          volume: parseFloat((units / 100000).toFixed(2)),
          entry,
          current: entry,
          sl: null,
          tp: null,
          pnl,
          status: "open",
          tag: "live",
          duration: "N/A",
          opened_at: new Date().toISOString()
        });
      }
      return out;
    } catch {
      return [];
    }
  }

  async submitOrder(symbol: string, side: "BUY" | "SELL", volume: number, sl?: number, tp?: number) {
    const oSymbol = this.toOandaSymbol(symbol);
    let units = Math.round(volume * 100000);
    if (side === "SELL") units = -units;

    const payload: any = {
      order: {
        instrument: oSymbol,
        units: units.toString(),
        type: "MARKET",
        timeInForce: "FOK",
        positionFill: "DEFAULT"
      }
    };
    if (sl) payload.order.stopLossOnFill = { price: sl.toString() };
    if (tp) payload.order.takeProfitOnFill = { price: tp.toString() };

    const res = await this.request("POST", `/v3/accounts/${this.accountId}/orders`, payload);
    const fill = res.orderFillTransaction || {};
    return {
      id: fill.tradeOpened?.tradeID || res.lastTransactionID || `O-${Date.now()}`,
      symbol,
      side,
      volume,
      entry: parseFloat(fill.price || 0),
      pnl: 0.0,
      status: "open",
      raw: res
    };
  }

  async closeTrade(tradeId: string) {
    const res = await this.request("PUT", `/v3/accounts/${this.accountId}/trades/${tradeId}/close`, {
      units: "ALL"
    });
    const fill = res.orderFillTransaction || {};
    return {
      id: tradeId,
      status: "closed",
      exit: parseFloat(fill.price || 0),
      pnl: parseFloat(fill.pl || 0),
      raw: res
    };
  }
}

// ----------------------------------------------------
// 4. ALPACA ADAPTER (Skeleton)
// ----------------------------------------------------
export class AlpacaAdapter implements BrokerAdapter {
  provider = "alpaca";
  private key: string;
  private secret: string;
  private baseUrl: string;

  constructor(key: string, secret: string, baseUrl?: string) {
    this.key = key;
    this.secret = secret;
    this.baseUrl = (baseUrl || "https://paper-api.alpaca.markets").replace(/\/$/, "");
  }

  private async request(method: "GET" | "POST" | "DELETE", path: string, data?: any) {
    const res = await axios({
      method,
      url: `${this.baseUrl}${path}`,
      headers: {
        "APCA-API-KEY-ID": this.key,
        "APCA-API-SECRET-KEY": this.secret,
        "Content-Type": "application/json"
      },
      data,
      timeout: 10000
    });
    return res.data;
  }

  async ping() {
    if (!this.key || !this.secret) {
      return { ok: false, provider: "alpaca", message: "Alpaca: Missing credentials." };
    }
    try {
      const data = await this.request("GET", "/v2/account");
      return { ok: true, provider: "alpaca", message: `Alpaca active — Equity $${data.equity}` };
    } catch (err: any) {
      return { ok: false, provider: "alpaca", message: `Alpaca failed: ${err.message}` };
    }
  }

  async getCandles(symbol: string, timeframe: string, limit: number) {
    return generateCandles(symbol, timeframe, limit);
  }

  async getPricing(symbols: string[]) {
    const out: Record<string, { bid: number; ask: number; mid: number }> = {};
    for (const s of symbols) {
      const data = SYMBOLS[s];
      if (data) {
        const tick = Math.pow(10, -data.digits);
        out[s] = { bid: data.price - tick, ask: data.price + tick, mid: data.price };
      }
    }
    return out;
  }

  async getAccount() {
    const data = await this.request("GET", "/v2/account");
    return {
      balance: parseFloat(data.cash),
      equity: parseFloat(data.equity),
      free_margin: parseFloat(data.buying_power),
      used_margin_pct: 0.0,
      drawdown_pct: 0.0,
      win_rate: 65.0,
      trades_today: 0,
      profit_factor: 1.8,
      unrealized_pl: 0.0,
      currency: "USD",
      server: "Paper API",
      login: this.key
    };
  }

  async getPositions() {
    try {
      const res = await this.request("GET", "/v2/positions");
      return res.map((p: any) => ({
        id: p.asset_id,
        symbol: p.symbol,
        side: parseFloat(p.qty) > 0 ? "BUY" : "SELL",
        volume: Math.abs(parseFloat(p.qty)),
        entry: parseFloat(p.avg_entry_price),
        current: parseFloat(p.current_price),
        sl: null,
        tp: null,
        pnl: parseFloat(p.unrealized_pl),
        status: "open",
        tag: "live",
        duration: "N/A",
        opened_at: new Date().toISOString()
      }));
    } catch {
      return [];
    }
  }

  async submitOrder(symbol: string, side: "BUY" | "SELL", volume: number, sl?: number, tp?: number) {
    const payload = {
      symbol,
      qty: volume.toString(),
      side: side.toLowerCase(),
      type: "market",
      time_in_force: "day"
    };
    const data = await this.request("POST", "/v2/orders", payload);
    return {
      id: data.id,
      symbol,
      side,
      volume,
      entry: parseFloat(data.price || 0),
      pnl: 0.0,
      status: "open",
      raw: data
    };
  }

  async closeTrade(tradeId: string) {
    const data = await this.request("DELETE", `/v2/positions/${tradeId}`);
    return {
      id: tradeId,
      status: "closed",
      raw: data
    };
  }
}

// ----------------------------------------------------
// UNIFIED BROKER ADAPTER FACTORY
// ----------------------------------------------------
export function buildAdapter(cfg: any): BrokerAdapter {
  const provider = (cfg || {}).provider || "mock";
  const api_key = (cfg || {}).api_key || "";
  const api_secret = (cfg || {}).api_secret || "";
  const account_id = (cfg || {}).account_id || "";
  const base_url = (cfg || {}).base_url || "";

  if (provider === "oanda") {
    return new OandaAdapter(api_key, account_id, base_url || undefined);
  }
  if (provider === "alpaca") {
    return new AlpacaAdapter(api_key, api_secret, base_url || undefined);
  }
  if (provider === "mt5_bridge") {
    return new Mt5BridgeAdapter(base_url || "http://localhost:5003");
  }
  return new MockAdapter();
}
