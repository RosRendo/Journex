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
      <div className="w-full bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg p-5 flex items-center justify-center min-h-[180px] font-mono text-[10px]">
        <p className="text-zinc-550">Awaiting historical execution metrics to chart monthly returns...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg p-5 font-mono text-[9px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Monthly Return Grid</h3>
          <p className="text-[8px] text-zinc-600 mt-0.5">{monthlyData.length} active periods · {trades.length} trades recorded</p>
        </div>
        <div className="flex items-center gap-4 text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(32, 224, 178, 0.4)" }} />
            Profit
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(255, 92, 115, 0.4)" }} />
            Loss
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
        {monthlyData.map((m) => {
          const isProfitable = m.pnl >= 0;
          const intensity = Math.min(0.8, Math.abs(m.pnl) / maxAbsPnl * 0.8 + 0.15);
          const bgColor = isProfitable
            ? `rgba(32, 224, 178, ${intensity})`
            : `rgba(255, 92, 115, ${intensity})`;
          const borderColor = isProfitable
            ? `rgba(32, 224, 178, ${intensity + 0.15})`
            : `rgba(255, 92, 115, ${intensity + 0.15})`;

          return (
            <div
              key={m.month}
              className="group relative flex flex-col items-center justify-center p-2 rounded cursor-default transition-all duration-200 hover:scale-[1.02] border"
              style={{ background: bgColor, borderColor: borderColor, minHeight: "70px" }}
            >
              {/* Month label */}
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/90 mb-1">{m.label}</span>

              {/* P&L */}
              <span className="text-[11px] font-bold font-mono text-white">
                {isProfitable ? "+" : "-"}${Math.abs(m.pnl).toFixed(0)}
              </span>

              {/* Trades + WR on hover */}
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#101014] border border-[rgba(255,255,255,0.15)] rounded z-10 p-1">
                <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">{m.label}</span>
                <span className={`text-[11px] font-bold font-mono mt-1 ${isProfitable ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                  {isProfitable ? "+" : "-"}${Math.abs(m.pnl).toFixed(2)}
                </span>
                <span className="text-[8px] text-zinc-550 mt-1">{m.trades} trades · {m.winRate}% WR</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

