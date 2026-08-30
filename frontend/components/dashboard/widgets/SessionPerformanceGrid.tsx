"use client";
import { useMemo } from "react";
import { TradeData } from "@/hooks/useCsvTrades";

interface Props {
  trades: TradeData[];
}

const SESSION_WINDOWS = [
  { name: "Asia", label: "ASIA", startUTC: 0, endUTC: 8, color: "#71717a" },
  { name: "London", label: "LONDON", startUTC: 7, endUTC: 16, color: "#a1a1aa" },
  { name: "New York", label: "NEW YORK", startUTC: 13, endUTC: 22, color: "#e4e4e7" },
];

function getSessionForTrade(trade: TradeData): string {
  const hour = new Date(trade.date).getUTCHours();
  if (hour >= 13 && hour < 22) return "New York";
  if (hour >= 7 && hour < 16) return "London";
  return "Asia";
}

export function SessionPerformanceGrid({ trades }: Props) {
  const sessionStats = useMemo(() => {
    const map: Record<string, { wins: number; losses: number; pnl: number; trades: number }> = {
      Asia: { wins: 0, losses: 0, pnl: 0, trades: 0 },
      London: { wins: 0, losses: 0, pnl: 0, trades: 0 },
      "New York": { wins: 0, losses: 0, pnl: 0, trades: 0 },
    };

    trades.forEach((t) => {
      const session = getSessionForTrade(t);
      map[session].pnl += t.profit;
      map[session].trades++;
      if (t.profit > 0) map[session].wins++;
      else if (t.profit < 0) map[session].losses++;
    });

    return SESSION_WINDOWS.map((s) => {
      const data = map[s.name];
      const total = data.wins + data.losses;
      return {
        ...s,
        ...data,
        winRate: total > 0 ? (data.wins / total) * 100 : 0,
      };
    });
  }, [trades]);

  if (!trades.length) {
    return (
      <div className="w-full bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg p-5 flex items-center justify-center min-h-[160px] font-mono text-[10px]">
        <p className="text-zinc-500">Awaiting sufficient trade records to analyze session efficiency...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg p-5 font-mono text-[9px]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Session Performance</h3>
          <p className="text-[8px] text-zinc-600 mt-0.5">P&L distribution aligned by execution window (UTC)</p>
        </div>
        <span className="text-[8px] text-zinc-650 uppercase">Timing Edge</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sessionStats.map((s) => {
          const isProfitable = s.pnl >= 0;
          const barWidth = s.trades > 0 ? Math.min(100, (s.trades / trades.length) * 100 * 3) : 0;

          return (
            <div
              key={s.name}
              className="relative p-4 rounded border overflow-hidden bg-[#141419] border-[rgba(255,255,255,0.07)]"
            >
              {/* Session name */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[10px] font-bold text-white tracking-widest uppercase">{s.label}</span>
                <span className="text-[8px] font-bold uppercase px-2 py-0.5 border border-zinc-700 text-zinc-400 bg-zinc-900 rounded">
                  {s.trades} trades
                </span>
              </div>

              {/* P&L */}
              <div className="relative z-10 mb-3">
                <span className={`text-[16px] font-bold font-mono ${isProfitable ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                  {isProfitable ? "+" : "-"}${Math.abs(s.pnl).toFixed(2)}
                </span>
              </div>

              {/* Win Rate bar */}
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Win Rate</span>
                  <span className="text-[10px] font-bold font-mono text-white">
                    {s.winRate.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-1 rounded bg-black/40 overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{ width: `${s.winRate}%`, background: isProfitable ? "#20e0b2" : "#ff5c73" }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[8px] text-zinc-650 font-mono">
                  <span>{s.wins} W</span>
                  <span>{s.losses} L</span>
                </div>
              </div>

              {/* Volume bar at bottom */}
              <div
                className="absolute bottom-0 left-0 h-0.5 bg-zinc-700"
                style={{ width: `${barWidth}%`, opacity: 0.5 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

