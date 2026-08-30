"use client";
import { useCsvTrades } from "@/hooks/useCsvTrades";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Globe } from "lucide-react";
import type { TradeData } from "@/hooks/useCsvTrades";
import { EconomicCalendar } from "@/components/ui/EconomicCalendar";
import { useRouter } from "next/navigation";
import JournalCalendar from "@/components/JournalCalendar";

const labelCls = "text-[9px] uppercase tracking-widest font-bold text-[#71717a] font-mono";

export default function CalendarPage() {
  const router = useRouter();
  const { trades, loading } = useCsvTrades();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"trading" | "economic">("trading");
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

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
  const winRate = (winDays + lossDays) > 0 ? Math.round((winDays / (winDays + lossDays)) * 100) : 0;

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col pb-12 font-sans">

      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-20 bg-[#09090b]">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#f4f4f5]">Trading Calendar</h1>
          <p className="text-[9px] font-bold uppercase tracking-widest font-mono text-[#71717a] mt-0.5">Daily performance · Economic events</p>
        </div>
        <div className="flex gap-0 border-l border-[rgba(255,255,255,0.07)]">
          <button
            onClick={() => setActiveTab("trading")}
            className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "trading" ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            <CalendarDays className="w-3 h-3" />
            Performance
          </button>
          <button
            onClick={() => setActiveTab("economic")}
            className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "economic" ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            <Globe className="w-3 h-3" />
            Economic Events
          </button>
        </div>
      </div>

      {activeTab === "economic" ? (
        <div className="flex-1 p-5">
          <EconomicCalendar />
        </div>
      ) : (
        <div className="flex flex-col flex-1">

          {/* Month stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[rgba(255,255,255,0.07)] border-b border-[rgba(255,255,255,0.07)]">
            
            <div className="px-5 py-4 flex flex-col gap-1 bg-[#101014]">
              <span className={labelCls}>Month PnL</span>
              <div className={`text-2xl font-black font-mono tracking-tight mt-1 ${monthPnl >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                {monthPnl >= 0 ? "+" : ""}${monthPnl.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
              <button onClick={prev} className="p-1 rounded border border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-[#f4f4f5] hover:border-[rgba(255,255,255,0.15)] transition-all">
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button onClick={todayFn} className="px-2.5 py-0.5 rounded border border-[rgba(255,255,255,0.07)] text-[8px] font-bold text-[#71717a] hover:text-[#f4f4f5] uppercase tracking-wider font-mono transition-all">
                Today
              </button>
              <button onClick={next} className="p-1 rounded border border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-[#f4f4f5] hover:border-[rgba(255,255,255,0.15)] transition-all">
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
              <span className="text-[8px] font-mono text-[#71717a] uppercase tracking-wider">Profit day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[rgba(255,92,115,0.15)] border border-[rgba(255,92,115,0.3)]" />
              <span className="text-[8px] font-mono text-[#71717a] uppercase tracking-wider">Loss day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border border-[rgba(255,255,255,0.2)]" />
              <span className="text-[8px] font-mono text-[#71717a] uppercase tracking-wider">Today</span>
            </div>
            <span className="text-[8px] font-mono text-[#71717a] ml-auto">Click any day → Journal entry</span>
          </div>
        </div>
      )}
    </div>
  );
}
