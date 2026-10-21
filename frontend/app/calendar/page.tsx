"use client";

import { useCsvTrades } from "@/hooks/useCsvTrades";
import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Globe,
  Newspaper,
  Eye,
  RefreshCw,
  Search,
  Flame,
  ExternalLink,
  Users,
  Activity,
  Zap,
} from "lucide-react";
import type { TradeData } from "@/hooks/useCsvTrades";
import { EconomicCalendar } from "@/components/ui/EconomicCalendar";
import JournalCalendar from "@/components/JournalCalendar";
import { RetailSentimentGauge } from "@/components/widgets/RetailSentimentGauge";
import { useBridgeUrl } from "@/hooks/useBridgeUrl";

const labelCls = "text-[9px] uppercase tracking-widest font-bold text-[#71717a] font-mono";

interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  time: string;
  isHot: boolean;
  impact: "high" | "medium" | "low";
  sentiment: "bullish" | "bearish" | "neutral";
  symbol: string;
  source: string;
  link?: string;
}

function CalendarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as any) || "economic";

  const { trades, loading } = useCsvTrades();
  const { bridgeUrl } = useBridgeUrl();

  const [activeTab, setActiveTab] = useState<"economic" | "news" | "sentiment" | "trading">(
    ["economic", "news", "sentiment", "trading"].includes(initialTab) ? initialTab : "economic"
  );

  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // News State
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsFilter, setNewsFilter] = useState<"all" | "hot">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchNews = async () => {
    setNewsLoading(true);
    try {
      const url = bridgeUrl ? `${bridgeUrl}/api/news` : "/api/bridge/api/news";
      const res = await fetch(url, { headers: { "ngrok-skip-browser-warning": "true" } });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.news)) {
          setNews(data.news);
        }
      }
    } catch (_) {
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "news") {
      fetchNews();
    }
  }, [activeTab]);

  const pnlMap = useMemo(() => {
    const m = new Map<string, { pnl: number; trades: number }>();
    if (trades && trades.length > 0) {
      trades.forEach((t: TradeData) => {
        const date = new Date(t.date).toISOString().split("T")[0];
        if (!m.has(date)) m.set(date, { pnl: 0, trades: 0 });
        const data = m.get(date)!;
        data.pnl += t.profit;
        data.trades += 1;
      });
    }
    return m;
  }, [trades]);

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));
  const todayFn = () => setCurrentDate(new Date());

  const monthTrades: TradeData[] = trades.filter((t: TradeData) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const monthPnl = monthTrades.reduce((s, t) => s + t.profit, 0);
  const winDays = Array.from(pnlMap.entries()).filter(([dateStr, data]) => {
    const dt = new Date(dateStr);
    return dt.getFullYear() === year && dt.getMonth() === month && data.pnl > 0;
  }).length;
  const lossDays = Array.from(pnlMap.entries()).filter(([dateStr, data]) => {
    const dt = new Date(dateStr);
    return dt.getFullYear() === year && dt.getMonth() === month && data.pnl <= 0 && data.trades > 0;
  }).length;
  const winRate = winDays + lossDays > 0 ? Math.round((winDays / (winDays + lossDays)) * 100) : 0;

  const filteredNews = news
    .filter((n) => (newsFilter === "hot" ? n.isHot : true))
    .filter((n) =>
      searchQuery
        ? n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.symbol.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col pb-12 font-sans">
      {/* ── TOPBAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-20 bg-[#09090b] gap-3">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#f4f4f5] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#20e0b2]" />
            Market Intel & Calendar
          </h1>
          <p className="text-[9px] font-bold uppercase tracking-widest font-mono text-[#71717a] mt-0.5">
            Economic events · Live news wire · Retail sentiment · P&L calendar
          </p>
        </div>

        {/* Unified Hub Tabs */}
        <div className="flex border border-white/[0.08] rounded-xl bg-black/40 p-1 gap-1 text-[9.5px] font-bold uppercase tracking-wider font-mono">
          <button
            onClick={() => setActiveTab("economic")}
            className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "economic"
                ? "bg-white/15 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-[#20e0b2]" />
            Economic Events
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "news"
                ? "bg-white/15 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Newspaper className="w-3.5 h-3.5 text-sky-400" />
            Breaking News
          </button>
          <button
            onClick={() => setActiveTab("sentiment")}
            className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "sentiment"
                ? "bg-white/15 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            Sentiment
          </button>
          <button
            onClick={() => setActiveTab("trading")}
            className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "trading"
                ? "bg-white/15 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
            P&L Calendar
          </button>
        </div>
      </div>

      {/* ── TAB 1: ECONOMIC CALENDAR ── */}
      {activeTab === "economic" && (
        <div className="flex-1 p-5">
          <EconomicCalendar />
        </div>
      )}

      {/* ── TAB 2: BREAKING NEWS WIRE ── */}
      {activeTab === "news" && (
        <div className="flex-1 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111116] p-3 rounded-xl border border-white/[0.07]">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs font-mono">
                <Search className="w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter news by pair or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-[11px] text-white placeholder-zinc-600 focus:outline-none w-56 font-mono"
                />
              </div>
              <div className="flex gap-1 text-[9px] font-bold uppercase tracking-wider font-mono">
                <button
                  onClick={() => setNewsFilter("all")}
                  className={`px-2.5 py-1.5 rounded-lg border transition-all ${
                    newsFilter === "all"
                      ? "bg-white/15 text-white border-white/20"
                      : "text-zinc-500 border-transparent hover:text-zinc-300"
                  }`}
                >
                  All ({news.length})
                </button>
                <button
                  onClick={() => setNewsFilter("hot")}
                  className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-all ${
                    newsFilter === "hot"
                      ? "bg-orange-500/20 text-orange-400 border-orange-500/30 font-black"
                      : "text-zinc-500 border-transparent hover:text-zinc-300"
                  }`}
                >
                  <Flame className="w-3 h-3 text-orange-400" />
                  Breaking Hot ({news.filter((n) => n.isHot).length})
                </button>
              </div>
            </div>

            <button
              onClick={fetchNews}
              disabled={newsLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-[9px] font-bold uppercase tracking-wider font-mono text-zinc-400 hover:text-white transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${newsLoading ? "animate-spin" : ""}`} /> Refresh Feed
            </button>
          </div>

          {/* News Feed Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
            {filteredNews.length === 0 ? (
              <div className="col-span-full py-16 text-center text-zinc-500">
                <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold uppercase">No headlines matching filter</p>
              </div>
            ) : (
              filteredNews.map((item) => (
                <a
                  key={item.id}
                  href={item.link || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/[0.07] bg-[#101015] p-3.5 hover:border-sky-500/30 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between text-[8px] text-zinc-500 mb-2">
                      <span className="font-bold">{item.source || "NewsWire"}</span>
                      <div className="flex items-center gap-1">
                        {item.isHot && (
                          <span className="px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-400 font-black uppercase text-[7.5px]">
                            HOT
                          </span>
                        )}
                        <span>{item.time || "Recent"}</span>
                      </div>
                    </div>
                    <h3 className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors leading-snug line-clamp-3 mb-2 font-sans">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[8px] font-bold uppercase">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        item.sentiment === "bullish"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : item.sentiment === "bearish"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {item.symbol || "MACRO"} • {item.sentiment || item.impact || "Neutral"}
                    </span>
                    <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: RETAIL SENTIMENT ── */}
      {activeTab === "sentiment" && (
        <div className="flex-1 p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Primary Gauge */}
            <div className="lg:col-span-2">
              <RetailSentimentGauge />
            </div>

            {/* Market Contrarian Intelligence Card */}
            <div className="rounded-xl border border-white/[0.07] bg-[#101015] p-5 flex flex-col justify-between font-mono">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Contrarian Liquidity Rule
                  </h3>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Retail order book sentiment reflects where non-institutional liquidity is
                  trapped. When retail positioning reaches extremes (&gt;75% Long or &gt;75% Short),
                  institutional market makers frequently initiate liquidity sweeps in the opposite
                  direction.
                </p>
                <div className="rounded-lg bg-black/40 border border-white/[0.05] p-3 space-y-2 text-[10px]">
                  <div className="flex justify-between items-center text-emerald-400">
                    <span>Retail Long &gt; 75%:</span>
                    <span className="font-bold">Look for Short Sweeps</span>
                  </div>
                  <div className="flex justify-between items-center text-rose-400">
                    <span>Retail Short &gt; 75%:</span>
                    <span className="font-bold">Look for Long Bounces</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06] text-[9px] text-zinc-500">
                Data refreshed every 30 seconds via broker order books.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: P&L TRADING CALENDAR ── */}
      {activeTab === "trading" && (
        <div className="flex flex-col flex-1">
          {/* Month stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[rgba(255,255,255,0.07)] border-b border-[rgba(255,255,255,0.07)]">
            <div className="px-5 py-4 flex flex-col gap-1 bg-[#101014]">
              <span className={labelCls}>Month PnL</span>
              <div
                className={`text-2xl font-black font-mono tracking-tight mt-1 ${
                  monthPnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"
                }`}
              >
                {monthPnl >= 0 ? "+" : ""}$
                {monthPnl.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </div>
              <span className="text-[8px] text-[#71717a] font-mono">{monthName}</span>
            </div>

            <div className="px-5 py-4 flex flex-col gap-1 bg-[#101014]">
              <span className={labelCls}>Trades</span>
              <div className="text-2xl font-black font-mono tracking-tight text-[#f4f4f5] mt-1">
                {monthTrades.length}
              </div>
              <span className="text-[8px] text-[#71717a] font-mono">this month</span>
            </div>

            <div className="px-5 py-4 flex flex-col gap-1 bg-[#101014]">
              <span className={labelCls}>Day Win Rate</span>
              <div className="text-2xl font-black font-mono tracking-tight text-[#20e0b2] mt-1">
                {winRate}%
              </div>
              <div className="w-full h-0.5 bg-[rgba(255,255,255,0.07)] rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-[#20e0b2] transition-all" style={{ width: `${winRate}%` }} />
              </div>
            </div>

            <div className="px-5 py-4 flex flex-col gap-1 bg-[#101014]">
              <span className={labelCls}>Green / Red Days</span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xl font-black font-mono text-[#20e0b2]">{winDays}</span>
                <span className="text-[#71717a] font-mono text-sm">/</span>
                <span className="text-xl font-black font-mono text-[#ff5c73]">{lossDays}</span>
              </div>
            </div>
          </div>

          {/* Month navigation header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)]">
            <span className={`${labelCls} text-[10px]`}>{monthName}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={prev}
                className="p-1 rounded border border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-[#f4f4f5] hover:border-[rgba(255,255,255,0.15)] transition-all"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={todayFn}
                className="px-2.5 py-0.5 rounded border border-[rgba(255,255,255,0.07)] text-[8px] font-bold text-[#71717a] hover:text-[#f4f4f5] uppercase tracking-wider font-mono transition-all"
              >
                Today
              </button>
              <button
                onClick={next}
                className="p-1 rounded border border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-[#f4f4f5] hover:border-[rgba(255,255,255,0.15)] transition-all"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="flex-1 p-5">
            <JournalCalendar
              trades={trades}
              onDayClick={(dateStr) => router.push(`/journal/day/${dateStr}`)}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 px-5 py-3 border-t border-[rgba(255,255,255,0.07)]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[rgba(32,224,178,0.15)] border border-[rgba(32,224,178,0.3)]" />
              <span className="text-[8px] font-mono text-[#71717a] uppercase tracking-wider">
                Profit day
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[rgba(255,92,115,0.15)] border border-[rgba(255,92,115,0.3)]" />
              <span className="text-[8px] font-mono text-[#71717a] uppercase tracking-wider">
                Loss day
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border border-[rgba(255,255,255,0.2)]" />
              <span className="text-[8px] font-mono text-[#71717a] uppercase tracking-wider">Today</span>
            </div>
            <span className="text-[8px] font-mono text-[#71717a] ml-auto">
              Click any day → Journal entry
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#09090b] flex items-center justify-center font-mono text-zinc-500 text-xs">
          Loading Market Intel & Calendar...
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
