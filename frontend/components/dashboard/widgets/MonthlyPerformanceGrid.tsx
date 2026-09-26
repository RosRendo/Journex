"use client";
import React, { useMemo } from "react";
import { TradeData } from "@/hooks/useCsvTrades";
import { Calendar } from "lucide-react";

interface Props {
  trades: TradeData[];
}

export function MonthlyPerformanceGrid({ trades }: Props) {
  const { monthlyData, summary } = useMemo(() => {
    const map = new Map<string, { pnl: number; trades: number; wins: number; losses: number }>();

    trades.forEach((t) => {
      const date = new Date(t.date);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { pnl: 0, trades: 0, wins: 0, losses: 0 });
      const m = map.get(key)!;
      m.pnl += t.profit;
      m.trades++;
      if (t.profit > 0) m.wins++;
      else if (t.profit < 0) m.losses++;
    });

    const list = Array.from(map.entries())
      .map(([month, data]) => {
        const [yearStr, monthStr] = month.split("-");
        const monthDate = new Date(Number(yearStr), Number(monthStr) - 1, 1);
        const monthName = monthDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
        return {
          month,
          year: yearStr,
          monthName,
          label: `${monthName} '${yearStr.slice(-2)}`,
          pnl: data.pnl,
          trades: data.trades,
          wins: data.wins,
          losses: data.losses,
          winRate: data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    const totalPnl = list.reduce((acc, cur) => acc + cur.pnl, 0);
    const totalTrades = list.reduce((acc, cur) => acc + cur.trades, 0);
    const totalWins = list.reduce((acc, cur) => acc + cur.wins, 0);
    const overallWinRate = totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 0;

    return {
      monthlyData: list,
      summary: {
        totalPnl,
        totalTrades,
        overallWinRate,
      },
    };
  }, [trades]);

  if (!monthlyData.length) {
    return (
      <div className="w-full bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg p-5 flex items-center justify-center min-h-[180px] font-mono text-[10px]">
        <p className="text-zinc-500">Awaiting historical execution metrics to chart monthly returns...</p>
      </div>
    );
  }

  const isOverallProfitable = summary.totalPnl >= 0;

  return (
    <div className="w-full bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg p-4 font-mono text-[9px]">
      {/* ── TOP HEADER ── */}
      <div className="flex items-center justify-between mb-3 border-b border-[rgba(255,255,255,0.05)] pb-3">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#20e0b2]" />
            Monthly Return Grid
          </h3>
          <p className="text-[8px] text-zinc-500 mt-0.5">
            {monthlyData.length} active periods · {summary.totalTrades.toLocaleString()} trades recorded
          </p>
        </div>

        {/* YTD Cumulative Badge */}
        <div className="text-right">
          <span className="text-[7.5px] uppercase font-bold text-zinc-500 tracking-wider block">YTD Net P&L</span>
          <span className={`text-xs font-black tracking-tight ${isOverallProfitable ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
            {isOverallProfitable ? "+" : ""}${summary.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* ── RESPONSIVE MONTHLY CARDS GRID (2 or 3 columns, never cramped 12) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {monthlyData.map((m) => {
          const isProfitable = m.pnl >= 0;
          return (
            <div
              key={m.month}
              className={`group relative p-2.5 rounded-lg border transition-all duration-200 hover:border-white/20 flex flex-col justify-between ${
                isProfitable
                  ? "bg-[#20e0b2]/[0.06] border-[#20e0b2]/20 hover:bg-[#20e0b2]/[0.10]"
                  : "bg-[#ff5c73]/[0.06] border-[#ff5c73]/20 hover:bg-[#ff5c73]/[0.10]"
              }`}
            >
              {/* Card Header: Month badge & Win rate */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[9px] font-black tracking-wider text-zinc-300 uppercase">
                  {m.label}
                </span>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                  isProfitable
                    ? "bg-[#20e0b2]/10 border-[#20e0b2]/30 text-[#20e0b2]"
                    : "bg-[#ff5c73]/10 border-[#ff5c73]/30 text-[#ff5c73]"
                }`}>
                  {m.winRate}% WR
                </span>
              </div>

              {/* PnL Value */}
              <div className="my-1">
                <span className={`text-xs sm:text-[13px] font-black tracking-tight block ${
                  isProfitable ? "text-[#20e0b2]" : "text-[#ff5c73]"
                }`}>
                  {isProfitable ? "+" : ""}${m.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Progress Bar & Trade Count */}
              <div className="mt-1 pt-1.5 border-t border-white/[0.04]">
                <div className="w-full bg-black/40 h-1 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(4, m.winRate)}%`,
                      backgroundColor: isProfitable ? "#20e0b2" : "#ff5c73",
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[7.5px] text-zinc-500">
                  <span>{m.trades.toLocaleString()} trades</span>
                  <span>{m.wins}W · {m.losses}L</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── FOOTER LEGEND & STATS ── */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.04)] text-[8px] text-zinc-500 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#20e0b2]" />
            Profit Period
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ff5c73]" />
            Loss Period
          </span>
        </div>
        <span className="text-zinc-400 font-bold">
          Avg WR: {summary.overallWinRate}%
        </span>
      </div>
    </div>
  );
}
