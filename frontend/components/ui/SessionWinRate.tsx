"use client";
import { useMemo } from "react";
import { useCsvTrades } from "@/hooks/useCsvTrades";
import { Clock } from "lucide-react";

export function SessionWinRate({ pairFilter }: { pairFilter?: string }) {
  const { trades, loading } = useCsvTrades();

  const sessionStats = useMemo(() => {
    // 4 sessions: Sydney (22-07), Tokyo (00-09), London (08-17), New York (13-22) UTC
    const stats: Record<string, { total: number; wins: number; color: string; hours: string; isActive: boolean }> = {
      Sydney: { total: 0, wins: 0, color: "#10b981", hours: "22:00 - 07:00", isActive: false },
      Tokyo: { total: 0, wins: 0, color: "#0ea5e9", hours: "00:00 - 09:00", isActive: false },
      London: { total: 0, wins: 0, color: "#8b5cf6", hours: "08:00 - 17:00", isActive: false },
      NewYork: { total: 0, wins: 0, color: "#f59e0b", hours: "13:00 - 22:00", isActive: false }
    };

    if (!trades) return stats;

    const filteredTrades = pairFilter 
      ? trades.filter(t => t.pair.replace("/", "") === pairFilter.replace("/", ""))
      : trades;

    filteredTrades.forEach((t) => {
      // Assuming t.date or t.openTime is ISO string
      // Using closing date if openTime is missing, though openTime is preferred for session entry
      const timeStr = t.openTime || t.date;
      if (!timeStr) return;
      
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return;
      
      const h = d.getUTCHours();
      const isWin = t.profit > 0;

      if (h >= 22 || h < 7) { stats.Sydney.total++; if (isWin) stats.Sydney.wins++; }
      if (h >= 0 && h < 9) { stats.Tokyo.total++; if (isWin) stats.Tokyo.wins++; }
      if (h >= 8 && h < 17) { stats.London.total++; if (isWin) stats.London.wins++; }
      if (h >= 13 && h < 22) { stats.NewYork.total++; if (isWin) stats.NewYork.wins++; }
    });

    // Check active sessions
    const now = new Date();
    const curH = now.getUTCHours();
    if (curH >= 22 || curH < 7) stats.Sydney.isActive = true;
    if (curH >= 0 && curH < 9) stats.Tokyo.isActive = true;
    if (curH >= 8 && curH < 17) stats.London.isActive = true;
    if (curH >= 13 && curH < 22) stats.NewYork.isActive = true;

    return stats;
  }, [trades, pairFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 opacity-50">
        <div className="w-5 h-5 border-2 border-[--accent] border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-[10px] text-[--text-secondary]">Analyzing Journal...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {Object.entries(sessionStats).map(([name, stat]) => {
        const wr = stat.total > 0 ? (stat.wins / stat.total) * 100 : 0;
        const color = wr >= 60 ? "#00c896" : wr >= 50 ? "#f5a623" : "#ff4d6a";
        const hasData = stat.total >= 5;

        return (
          <div key={name} className="relative p-3 rounded-lg border transition-all"
            style={{ 
              background: stat.isActive ? "var(--bg-elevated)" : "var(--bg-card)",
              borderColor: stat.isActive ? stat.color : "var(--border)",
              boxShadow: stat.isActive ? `0 0 10px ${stat.color}15` : "none"
            }}>
            
            {stat.isActive && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: stat.color }} />
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: stat.color }}>Active</span>
              </div>
            )}

            <div className="flex items-center justify-between mb-2 pr-12">
              <div className="flex items-center gap-2">
                <Clock size={12} style={{ color: stat.isActive ? stat.color : "var(--text-tertiary)" }} />
                <span className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                  {name === "NewYork" ? "New York" : name}
                </span>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  {stat.hours} UTC
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 mt-2">
              {hasData ? (
                <>
                  {/* Progress Bar */}
                  <div className="flex-1 h-1.5 bg-[--bg-base] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${wr}%`, background: color }} />
                  </div>
                  {/* WR Value */}
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-bold font-mono tracking-tighter" style={{ color }}>
                      {wr.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-[--text-tertiary] font-mono">
                      ({stat.wins}/{stat.total})
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex-1 text-[10px] text-[--text-tertiary] text-center bg-[--bg-base] py-1 rounded">
                  Not enough data ({stat.total} trades)
                </div>
              )}
            </div>
          </div>
        );
      })}
      {pairFilter && (
        <p className="text-[10px] text-[--text-tertiary] text-center mt-2">
          Filtering journal for {pairFilter} only
        </p>
      )}
    </div>
  );
}
