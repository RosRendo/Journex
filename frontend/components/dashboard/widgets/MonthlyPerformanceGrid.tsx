"use client";
import { useMemo } from "react";
import { TradeData } from "@/hooks/useCsvTrades";

interface Props {
  trades: TradeData[];
}

export function MonthlyPerformanceGrid({ trades }: Props) {
  const monthlyData = useMemo(() => {
    const map = new Map<string, { pnl: number; trades: number; wins: number }>();

    trades.forEach((t) => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { pnl: 0, trades: 0, wins: 0 });
      const m = map.get(key)!;
      m.pnl += t.profit;
      m.trades++;
      if (t.profit > 0) m.wins++;
    });

    return Array.from(map.entries())
      .map(([month, data]) => ({
        month,
        label: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        pnl: data.pnl,
        trades: data.trades,
        winRate: data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [trades]);

  const maxAbsPnl = useMemo(() => Math.max(...monthlyData.map((m) => Math.abs(m.pnl)), 1), [monthlyData]);

  if (!monthlyData.length) {
    return (
      <div className="w-full bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg p-5 flex items-center justify-center min-h-[180px]">
        <p className="text-gray-500 text-sm">No monthly data yet. Import trades to see P&L breakdown.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-white">Monthly P&L</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">{monthlyData.length} months · {trades.length} total trades</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(0,220,130,0.4)" }} />
            Profitable
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(239,68,68,0.4)" }} />
            Loss
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
        {monthlyData.map((m) => {
          const isProfitable = m.pnl >= 0;
          const intensity = Math.min(0.8, Math.abs(m.pnl) / maxAbsPnl * 0.8 + 0.15);
          const bgColor = isProfitable
            ? `rgba(0,220,130,${intensity})`
            : `rgba(239,68,68,${intensity})`;
          const borderColor = isProfitable
            ? `rgba(0,220,130,${intensity + 0.15})`
            : `rgba(239,68,68,${intensity + 0.15})`;

          return (
            <div
              key={m.month}
              className="group relative flex flex-col items-center justify-center p-2 rounded-lg cursor-default transition-all duration-200 hover:scale-105"
              style={{ background: bgColor, border: `1px solid ${borderColor}`, minHeight: "70px" }}
            >
              {/* Month label */}
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/80 mb-1">{m.label}</span>

              {/* P&L */}
              <span className="text-[11px] font-bold font-mono text-white">
                {isProfitable ? "+" : "-"}${Math.abs(m.pnl).toFixed(0)}
              </span>

              {/* Trades + WR on hover */}
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 rounded-lg z-10 p-1">
                <span className="text-[9px] font-bold uppercase text-gray-300 tracking-wider">{m.label}</span>
                <span className={`text-[13px] font-bold font-mono mt-1 ${isProfitable ? "text-[#00dc82]" : "text-red-400"}`}>
                  {isProfitable ? "+" : "-"}${Math.abs(m.pnl).toFixed(2)}
                </span>
                <span className="text-[9px] text-gray-400 mt-1">{m.trades} trades · {m.winRate}% WR</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
