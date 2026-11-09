"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, AlertTriangle, Search, SlidersHorizontal } from "lucide-react";
import { getWebSocketUrl } from "@/lib/utils";
import { useIsAdmin } from "@/lib/role";
import { useWorkspace } from "@/src/context/WorkspaceContext";

export type AssetCategory = "all" | "metals" | "forex" | "crosses" | "crypto" | "indices";

export interface PairDefinition {
  symbol: string;
  name: string;
  category: "metals" | "forex" | "crosses" | "crypto" | "indices";
  baseCurr: string;
  quoteCurr: string;
  digits: number;
}

export interface PairState extends PairDefinition {
  price: number;
  change: number;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  volume: number; // 0-100%
  hasNews: boolean;
  isLive: boolean;
}

export const DEFAULT_PAIRS: PairDefinition[] = [
  // ── Metals & Commodities ────────────────────────────────
  { symbol: "XAUUSD", name: "Gold / US Dollar",      category: "metals",  baseCurr: "XAU", quoteCurr: "USD", digits: 2 },
  { symbol: "XAGUSD", name: "Silver / US Dollar",    category: "metals",  baseCurr: "XAG", quoteCurr: "USD", digits: 3 },
  { symbol: "USOIL",  name: "WTI Crude Oil / USD",   category: "metals",  baseCurr: "OIL", quoteCurr: "USD", digits: 2 },

  // ── Forex Majors ────────────────────────────────────────
  { symbol: "EURUSD", name: "Euro / US Dollar",      category: "forex",   baseCurr: "EUR", quoteCurr: "USD", digits: 5 },
  { symbol: "GBPUSD", name: "Pound / US Dollar",     category: "forex",   baseCurr: "GBP", quoteCurr: "USD", digits: 5 },
  { symbol: "USDJPY", name: "US Dollar / Yen",       category: "forex",   baseCurr: "USD", quoteCurr: "JPY", digits: 3 },
  { symbol: "AUDUSD", name: "Aussie / US Dollar",    category: "forex",   baseCurr: "AUD", quoteCurr: "USD", digits: 5 },
  { symbol: "USDCAD", name: "US Dollar / Loonie",    category: "forex",   baseCurr: "USD", quoteCurr: "CAD", digits: 5 },
  { symbol: "USDCHF", name: "US Dollar / Swiss Franc", category: "forex", baseCurr: "USD", quoteCurr: "CHF", digits: 5 },
  { symbol: "NZDUSD", name: "Kiwi / US Dollar",      category: "forex",   baseCurr: "NZD", quoteCurr: "USD", digits: 5 },

  // ── Forex Crosses ───────────────────────────────────────
  { symbol: "GBPJPY", name: "Pound / Yen (Dragon)",  category: "crosses", baseCurr: "GBP", quoteCurr: "JPY", digits: 3 },
  { symbol: "EURJPY", name: "Euro / Japanese Yen",   category: "crosses", baseCurr: "EUR", quoteCurr: "JPY", digits: 3 },
  { symbol: "EURGBP", name: "Euro / British Pound",  category: "crosses", baseCurr: "EUR", quoteCurr: "GBP", digits: 5 },
  { symbol: "AUDJPY", name: "Aussie / Japanese Yen", category: "crosses", baseCurr: "AUD", quoteCurr: "JPY", digits: 3 },
  { symbol: "CADJPY", name: "Loonie / Japanese Yen", category: "crosses", baseCurr: "CAD", quoteCurr: "JPY", digits: 3 },
  { symbol: "GBPCHF", name: "Pound / Swiss Franc",   category: "crosses", baseCurr: "GBP", quoteCurr: "CHF", digits: 5 },
  { symbol: "EURCHF", name: "Euro / Swiss Franc",    category: "crosses", baseCurr: "EUR", quoteCurr: "CHF", digits: 5 },
  { symbol: "EURAUD", name: "Euro / Australian Dollar", category: "crosses", baseCurr: "EUR", quoteCurr: "AUD", digits: 5 },
  { symbol: "CADCHF", name: "Loonie / Swiss Franc",  category: "crosses", baseCurr: "CAD", quoteCurr: "CHF", digits: 5 },

  // ── Crypto Assets ───────────────────────────────────────
  { symbol: "BTCUSD", name: "Bitcoin / US Dollar",   category: "crypto",  baseCurr: "BTC", quoteCurr: "USD", digits: 2 },
  { symbol: "ETHUSD", name: "Ethereum / US Dollar",  category: "crypto",  baseCurr: "ETH", quoteCurr: "USD", digits: 2 },
  { symbol: "SOLUSD", name: "Solana / US Dollar",    category: "crypto",  baseCurr: "SOL", quoteCurr: "USD", digits: 2 },

  // ── Global Indices ──────────────────────────────────────
  { symbol: "NAS100", name: "Nasdaq 100 Tech",       category: "indices", baseCurr: "NAS", quoteCurr: "USD", digits: 2 },
  { symbol: "US30",   name: "Dow Jones 30 Index",    category: "indices", baseCurr: "DOW", quoteCurr: "USD", digits: 2 },
  { symbol: "US500",  name: "S&P 500 Index",         category: "indices", baseCurr: "SPX", quoteCurr: "USD", digits: 2 },
  { symbol: "GER40",  name: "Germany 40 / DAX",      category: "indices", baseCurr: "DAX", quoteCurr: "EUR", digits: 2 },
];

function formatAssetPrice(price: number, digits: number): string {
  if (price <= 0) return "--";
  return price.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function renderCategoryPill(category: PairDefinition["category"]) {
  switch (category) {
    case "metals":
      return (
        <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
          METALS
        </span>
      );
    case "forex":
      return (
        <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
          MAJORS
        </span>
      );
    case "crosses":
      return (
        <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          CROSS
        </span>
      );
    case "crypto":
      return (
        <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
          CRYPTO
        </span>
      );
    case "indices":
      return (
        <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          INDEX
        </span>
      );
  }
}

export function AllPairsGrid() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { activeWorkspace } = useWorkspace();

  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pairs, setPairs] = useState<PairState[]>(() =>
    DEFAULT_PAIRS.map((p) => ({
      ...p,
      price: 0,
      change: 0,
      bias: "NEUTRAL",
      volume: 0,
      hasNews: false,
      isLive: false,
    }))
  );
  const [isBridgeConnected, setIsBridgeConnected] = useState<boolean>(false);

  // Sync active category with current workspace context
  useEffect(() => {
    if (activeWorkspace === "Gold") {
      setSelectedCategory("metals");
    } else if (activeWorkspace === "Forex") {
      setSelectedCategory("forex");
    } else if (activeWorkspace === "Crypto") {
      setSelectedCategory("crypto");
    } else {
      setSelectedCategory("all");
    }
  }, [activeWorkspace]);

  // 1. Fetch real MT5 heatmap telemetry (Zero Fallback Enforced)
  const fetchHeatmap = async () => {
    try {
      const res = await fetch("/api/bridge/api/heatmap", {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (!res.ok) {
        setIsBridgeConnected(false);
        return;
      }
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        setIsBridgeConnected(false);
        return;
      }

      setIsBridgeConnected(true);
      setPairs((prev) =>
        prev.map((p) => {
          const match = json.data.find(
            (item: any) => item.pair.toUpperCase() === p.symbol.toUpperCase()
          );
          if (!match) return p;

          const change = typeof match.change24h === "number" ? match.change24h : 0;
          const livePrice =
            typeof match.price === "number" && match.price > 0
              ? match.price
              : typeof match.bid === "number" && match.bid > 0
              ? match.bid
              : p.price;

          // Real daily bias dynamically derived from MT5 24h net momentum
          const bias: "BULLISH" | "BEARISH" | "NEUTRAL" =
            change >= 0.15 ? "BULLISH" : change <= -0.15 ? "BEARISH" : "NEUTRAL";

          // Real volatility score derived from price variance & spread
          const volIndex = livePrice > 0
            ? Math.min(100, Math.max(10, Math.round(Math.abs(change) * 45 + (match.spread > 0 ? 15 : 0))))
            : 0;

          return {
            ...p,
            price: livePrice,
            change,
            bias,
            volume: volIndex,
            isLive: livePrice > 0,
          };
        })
      );
    } catch (_) {
      setIsBridgeConnected(false);
    }
  };

  // 2. Fetch real high-impact economic news releases for active currencies
  const fetchNewsAlerts = async () => {
    try {
      const res = await fetch("/api/bridge/api/news", {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (!res.ok) return;
      const json = await res.json();
      const events = json.events || json.data || (Array.isArray(json) ? json : []);
      if (!Array.isArray(events)) return;

      const activeCurrencies = new Set<string>();
      events.forEach((e: any) => {
        const impact = (e.impact || e.urgency || "").toLowerCase();
        if (impact === "high" || impact === "hot" || e.isHot) {
          const c = (e.currency || e.symbol || "").toUpperCase();
          if (c) activeCurrencies.add(c);
        }
      });

      setPairs((prev) =>
        prev.map((p) => {
          const has = activeCurrencies.has(p.baseCurr) || activeCurrencies.has(p.quoteCurr);
          return { ...p, hasNews: has };
        })
      );
    } catch (_) {}
  };

  // Run initial fetch and standing interval
  useEffect(() => {
    fetchHeatmap();
    fetchNewsAlerts();
    const heatmapInterval = setInterval(fetchHeatmap, 4000);
    const newsInterval = setInterval(fetchNewsAlerts, 45000);
    return () => {
      clearInterval(heatmapInterval);
      clearInterval(newsInterval);
    };
  }, []);

  // 3. Connect to live WebSocket price feeds
  useEffect(() => {
    const wsUrl = getWebSocketUrl("api/ws/prices");
    if (!wsUrl) return;
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => setIsBridgeConnected(true);
      socket.onmessage = (event) => {
        try {
          const tick = JSON.parse(event.data);
          if (tick && tick.type === "tick" && tick.symbol) {
            const cleanSym = tick.symbol.toUpperCase().replace("/", "").replace(".", "");
            setPairs((prev) =>
              prev.map((p) => {
                if (p.symbol.toUpperCase() === cleanSym) {
                  const mid = tick.mid ?? ((tick.bid + tick.ask) / 2);
                  const change = typeof tick.change24h === "number" ? tick.change24h : p.change;
                  const bias: "BULLISH" | "BEARISH" | "NEUTRAL" =
                    change >= 0.15 ? "BULLISH" : change <= -0.15 ? "BEARISH" : "NEUTRAL";
                  return {
                    ...p,
                    price: mid > 0 ? mid : p.price,
                    change,
                    bias,
                    isLive: true,
                  };
                }
                return p;
              })
            );
          }
        } catch (_) {}
      };
    } catch (_) {}

    return () => {
      if (socket) socket.close();
    };
  }, []);

  // Filter pairs by Category, Workspace, and Search
  const filteredPairs = useMemo(() => {
    return pairs.filter((p) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesSym = p.symbol.toLowerCase().includes(query);
        const matchesName = p.name.toLowerCase().includes(query);
        if (!matchesSym && !matchesName) return false;
      }

      // 2. Category Tab Filter
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [pairs, selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<AssetCategory, number> = {
      all: pairs.length,
      metals: 0,
      forex: 0,
      crosses: 0,
      crypto: 0,
      indices: 0,
    };
    pairs.forEach((p) => {
      if (counts[p.category] !== undefined) {
        counts[p.category]++;
      }
    });
    return counts;
  }, [pairs]);

  return (
    <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden font-mono shadow-xl">
      {/* Title Bar */}
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.07)] flex flex-wrap items-center justify-between gap-2 bg-black/20">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#20e0b2]" />
          <span className="text-[11px] uppercase tracking-wider font-bold text-white">
            Multi-Asset Intelligence Matrix
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 font-semibold">
            {filteredPairs.length} / {pairs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[8.5px] font-bold uppercase flex items-center gap-1.5 px-2 py-0.5 rounded border ${
              isBridgeConnected
                ? "text-[#20e0b2] bg-[#20e0b2]/10 border-[#20e0b2]/20"
                : "text-zinc-500 bg-white/5 border-white/10"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBridgeConnected ? "bg-[#20e0b2] animate-pulse" : "bg-zinc-600"
              }`}
            />
            {isBridgeConnected ? "Real-Time MT5 Feed" : "Awaiting MT5 Telemetry"}
          </span>
        </div>
      </div>

      {/* Asset Class Filter Tabs & Search Bar */}
      <div className="px-4 py-2 border-b border-[rgba(255,255,255,0.06)] bg-black/10 flex flex-wrap items-center justify-between gap-2">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: "all", label: "All" },
              { id: "metals", label: "Metals & Oil" },
              { id: "forex", label: "Majors" },
              { id: "crosses", label: "Crosses" },
              { id: "crypto", label: "Crypto" },
              { id: "indices", label: "Indices" },
            ] as const
          ).map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`text-[9.5px] font-bold px-2.5 py-1 rounded-md transition-all flex items-center gap-1 whitespace-nowrap ${
                  isSelected
                    ? "bg-[#20e0b2]/15 text-[#20e0b2] border border-[#20e0b2]/30 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                    isSelected ? "bg-[#20e0b2]/20 text-[#20e0b2]" : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {categoryCounts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/30 border border-white/10 text-zinc-400 focus-within:border-[#20e0b2]/50 transition-colors w-full sm:w-44">
          <Search className="w-3 h-3 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search asset..."
            className="w-full bg-transparent text-[9.5px] text-zinc-200 outline-none placeholder:text-zinc-600 font-sans"
          />
        </div>
      </div>

      {/* Grid List */}
      <div className="divide-y divide-[rgba(255,255,255,0.04)] max-h-[520px] overflow-y-auto">
        {filteredPairs.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            No assets match &ldquo;{searchQuery}&rdquo; in this category.
          </div>
        ) : (
          filteredPairs.map((p) => {
            const isBull = p.bias === "BULLISH" && p.isLive;
            const isBear = p.bias === "BEARISH" && p.isLive;

            return (
              <div
                key={p.symbol}
                onClick={() => router.push(`/macro/${p.symbol}`)}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer group"
              >
                {/* Asset Identifiers */}
                <div className="flex items-center gap-2.5 w-1/3 min-w-[140px]">
                  <div
                    className="w-1.5 h-7 rounded-sm transition-colors shrink-0"
                    style={{
                      background: p.isLive
                        ? isBull
                          ? "#20e0b2"
                          : isBear
                          ? "#ff5c73"
                          : "#71717a"
                        : "#27272a",
                    }}
                  />
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-[#f4f4f5] group-hover:text-[#20e0b2] transition-colors">
                        {p.symbol}
                      </span>
                      {renderCategoryPill(p.category)}
                    </div>
                    <div className="text-[9px] text-[#71717a] font-mono leading-none mt-0.5 truncate">
                      {p.name}
                    </div>
                  </div>
                </div>

                {/* Price Quotes (Pure Zero Fallback) */}
                <div className="w-1/4 text-right font-mono">
                  <div className="text-[11px] font-black text-[#f4f4f5] tabular-nums">
                    {p.isLive && p.price > 0 ? (
                      formatAssetPrice(p.price, p.digits)
                    ) : (
                      <span className="text-zinc-600 text-[10px]">--</span>
                    )}
                  </div>
                  <div
                    className={`text-[8.5px] font-bold mt-0.5 leading-none tabular-nums ${
                      p.isLive && p.price > 0
                        ? p.change >= 0
                          ? "text-[#20e0b2]"
                          : "text-[#ff5c73]"
                        : "text-zinc-600"
                    }`}
                  >
                    {p.isLive && p.price > 0
                      ? `${p.change >= 0 ? "+" : ""}${p.change.toFixed(2)}%`
                      : "--"}
                  </div>
                </div>

                {/* Daily Bias Pill */}
                <div className="w-1/6 flex justify-center shrink-0">
                  <span
                    className={`text-[7.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm font-mono ${
                      !p.isLive || p.price === 0
                        ? "bg-[rgba(255,255,255,0.02)] text-zinc-600 border border-[rgba(255,255,255,0.04)]"
                        : isBull
                        ? "bg-[rgba(32,224,178,0.08)] text-[#20e0b2] border border-[rgba(32,224,178,0.15)]"
                        : isBear
                        ? "bg-[rgba(255,92,115,0.08)] text-[#ff5c73] border border-[rgba(255,92,115,0.15)]"
                        : "bg-[rgba(255,255,255,0.03)] text-[#71717a] border border-[rgba(255,255,255,0.05)]"
                    }`}
                  >
                    {p.isLive && p.price > 0 ? p.bias : "STANDBY"}
                  </span>
                </div>

                {/* Volume Index Meter */}
                <div className="w-1/6 hidden md:block">
                  <div className="flex justify-between text-[7.5px] text-[#71717a] font-mono mb-1 font-bold">
                    <span>VOL</span>
                    <span>{p.isLive && p.price > 0 ? `${p.volume}%` : "--"}</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-[rgba(255,255,255,0.07)]">
                    <div
                      className={`h-full transition-all duration-500 ${
                        p.isLive && p.price > 0 ? "bg-[#20e0b2]" : "bg-zinc-800"
                      }`}
                      style={{ width: `${p.isLive && p.price > 0 ? p.volume : 0}%` }}
                    />
                  </div>
                </div>

                {/* Alert & Action */}
                <div className="flex items-center gap-3 justify-end w-12 shrink-0">
                  {p.hasNews && (
                    <span title="High impact economic release today">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#f5c451] animate-pulse" />
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-[#71717a] group-hover:text-[#20e0b2] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
