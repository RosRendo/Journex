"use client";
import { useMemo } from "react";
import { TradeData } from "@/hooks/useCsvTrades";

interface Props {
  trades: TradeData[];
}

const SESSION_WINDOWS = [
  { name: "Asia", label: "🌏 Asia", startUTC: 0, endUTC: 8, color: "#818cf8" },
  { name: "London", label: "🏛️ London", startUTC: 7, endUTC: 16, color: "#34d399" },
  { name: "New York", label: "🗽 New York", startUTC: 13, endUTC: 22, color: "#f59e0b" },
];

function getSessionForTrade(trade: TradeData): string {
  const hour = new Date(trade.date).getUTCHours();
  // Assign to the session with the most overlap; NY takes priority near open
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
      <div className="w-full bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg p-5 flex items-center justify-center min-h-[160px]">
        <p className="text-gray-500 text-sm">Import trades to see session performance</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg p-5">
      <div className="mb-5">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white">Session Performance</h3>
        <p className="text-[10px] text-gray-400 mt-0.5">P&L breakdown by trading session (UTC)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sessionStats.map((s) => {
          const isProfitable = s.pnl >= 0;
          const barWidth = s.trades > 0 ? Math.min(100, (s.trades / trades.length) * 100 * 3) : 0;

          return (
            <div
              key={s.name}
              className="relative p-4 rounded-xl border overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: `${s.color}25` }}
            >
              {/* Ambient glow */}
              <div
                className="absolute top-0 right-0 w-20 h-20 rounded-full blur-[30px] pointer-events-none"
                style={{ background: `${s.color}20` }}
              />

              {/* Session name */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[11px] font-bold text-white">{s.label}</span>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: `${s.color}20`, color: s.color }}
                >
                  {s.trades} trades
                </span>
              </div>

              {/* P&L */}
              <div className="relative z-10 mb-3">
                <span
                  className={`text-2xl font-bold font-mono ${isProfitable ? "text-[#00dc82]" : "text-red-400"}`}
                >
                  {isProfitable ? "+" : "-"}${Math.abs(s.pnl).toFixed(2)}
                </span>
              </div>

              {/* Win Rate bar */}
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Win Rate</span>
                  <span className="text-[11px] font-bold font-mono" style={{ color: s.color }}>
                    {s.winRate.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${s.winRate}%`, background: s.color }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[9px] text-gray-500 font-mono">
                  <span>{s.wins}W</span>
                  <span>{s.losses}L</span>
                </div>
              </div>

              {/* Volume bar at bottom */}
              <div
                className="absolute bottom-0 left-0 h-0.5"
                style={{ width: `${barWidth}%`, background: s.color, opacity: 0.4 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
