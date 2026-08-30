import { useMemo } from "react";
import { PieChart as PieChartIcon } from "lucide-react";
import { useCsvTrades } from "@/hooks/useCsvTrades";

interface StrategyStat {
  name: string;
  pnl: number;
  trades: number;
  winRate: number;
}

interface StrategyPerformanceProps {
  data?: StrategyStat[];
  loading?: boolean;
  accountNumber?: string;
}

export function StrategyPerformance({ data: externalData, loading: externalLoading, accountNumber }: StrategyPerformanceProps = {}) {
  const { trades, loading: tradesLoading } = useCsvTrades(accountNumber);

  const data = useMemo(() => {
    if (externalData) return externalData;
    const map = new Map<string, { pnl: number; trades: number; wins: number }>();
    for (const t of trades) {
      const key = t.pair;
      if (!map.has(key)) map.set(key, { pnl: 0, trades: 0, wins: 0 });
      const s = map.get(key)!;
      s.pnl += t.profit;
      s.trades++;
      if (t.profit > 0) s.wins++;
    }
    return Array.from(map.entries())
      .map(([name, s]) => ({ name, pnl: s.pnl, trades: s.trades, winRate: (s.wins / s.trades) * 100 }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 8);
  }, [externalData, trades]);

  const loading = externalLoading ?? tradesLoading;

  const maxPnlAbs = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map(d => Math.abs(d.pnl)));
  }, [data]);

  if (loading && data.length === 0) {
    return (
      <div className="rounded-xl border border-[--border] bg-[--bg-card] p-4 h-[350px] animate-pulse">
        <div className="h-6 w-1/3 bg-white/5 rounded mb-6"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="mb-4">
            <div className="h-4 w-1/4 bg-white/5 rounded mb-2"></div>
            <div className="h-6 w-full bg-white/5 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[--border] bg-[--bg-card] p-6 h-full min-h-[300px] flex flex-col animate-fade-in relative group overflow-hidden">
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-white/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-white/10 transition-colors" />

      <div className="flex items-center gap-2 mb-6 relative z-10">
        <PieChartIcon className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Strategy Performance</h2>
      </div>

      <div className="flex-1 w-full relative z-10 flex flex-col gap-5 overflow-y-auto pr-2 custom-scrollbar">
        {data.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">
            {/* Premium Wireframe Empty State */}
            <div className="w-full max-w-[240px] mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0d] to-transparent z-10" />
              <div className="space-y-2 opacity-20">
                <div className="w-full h-2 bg-[#20e0b2] rounded-full w-[80%]" />
                <div className="w-full h-2 bg-[#20e0b2] rounded-full w-[60%]" />
                <div className="w-full h-2 bg-[#ff5c73] rounded-full w-[45%]" />
                <div className="w-full h-2 bg-[#20e0b2] rounded-full w-[90%]" />
              </div>
            </div>
            <PieChartIcon className="w-6 h-6 mb-3 text-gray-500" />
            <p className="text-xs uppercase tracking-widest font-bold text-gray-300">No Edge Data</p>
            <p className="text-[10px] mt-2 text-gray-500 max-w-[220px] leading-relaxed">
              Connect your MT5 account and log trades to visualize your most profitable strategies.
            </p>
          </div>
        ) : (
          data.slice(0, 8).map((strat, i) => {
            const widthPct = Math.max(2, (Math.abs(strat.pnl) / maxPnlAbs) * 100);
            const isProfit = strat.pnl >= 0;

            const gradient = isProfit 
              ? "linear-gradient(90deg, rgba(0,220,130,0.8) 0%, rgba(0,255,150,1) 100%)" 
              : "linear-gradient(90deg, rgba(239,68,68,0.8) 0%, rgba(255,100,100,1) 100%)";
            
            const shadow = isProfit
              ? "drop-shadow(0 0 8px rgba(0,220,130,0.5))"
              : "drop-shadow(0 0 8px rgba(239,68,68,0.5))";

            return (
              <div key={strat.name || i} className="group/bar relative">
                <div className="flex justify-between items-end mb-2">
                   <div className="text-[11px] font-bold text-gray-300 tracking-wide">{strat.name}</div>
                   <div className="text-[10px] font-mono text-gray-500 flex items-center">
                     <span className={`font-bold ${isProfit ? "text-[--bull]" : "text-[--bear]"}`}>
                       {isProfit ? '+' : '-'}${Math.abs(strat.pnl).toFixed(2)}
                     </span>
                     <span className="mx-2 opacity-30">|</span>
                     <span className="text-gray-400">{strat.winRate.toFixed(1)}% WR</span>
                     <span className="mx-2 opacity-30">|</span>
                     <span className="text-gray-400">{strat.trades} T</span>
                   </div>
                </div>
                {/* Horizontal bar container */}
                <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out relative"
                    style={{ 
                      width: `${widthPct}%`, 
                      background: gradient,
                      filter: shadow
                    }}
                  >
                    {/* Glossy overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-full" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[--border] flex items-center justify-center gap-6 relative z-10 text-[9px] font-black uppercase tracking-widest text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[--bull]" /> POSITIVE EXPECTANCY
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[--bear]" /> NEGATIVE EXPECTANCY
          </div>
        </div>
      )}

      {/* Internal CSS for scrollbar hiding */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

