import { useMemo } from "react";
import { PieChart as PieChartIcon } from "lucide-react";

interface StrategyStat {
  name: string;
  pnl: number;
  trades: number;
  winRate: number;
}

interface StrategyPerformanceProps {
  data: StrategyStat[];
  loading?: boolean;
}

export function StrategyPerformance({ data, loading }: StrategyPerformanceProps) {
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
    <div className="rounded-xl border border-[--border] bg-[--bg-card] p-6 h-full flex flex-col shadow-lg animate-fade-in relative group overflow-hidden">
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-white/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-white/10 transition-colors" />

      <div className="flex items-center gap-2 mb-6 relative z-10">
        <PieChartIcon className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Strategy Performance</h2>
      </div>

      <div className="flex-1 w-full relative z-10 flex flex-col gap-5 overflow-y-auto pr-2 custom-scrollbar">
        {data.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-center">
            <PieChartIcon className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-xs uppercase tracking-widest font-bold">No Strategy Data</p>
            <p className="text-[10px] mt-2 max-w-[200px]">Log trades to see your statistical edge breakdown.</p>
          </div>
        ) : (
          data.slice(0, 8).map((strat, i) => {
            const widthPct = Math.max(2, (Math.abs(strat.pnl) / maxPnlAbs) * 100);
            const isProfit = strat.pnl >= 0;

            return (
              <div key={strat.name || i} className="group/bar">
                <div className="flex justify-between items-end mb-1.5">
                   <div className="text-[11px] font-bold text-gray-300">{strat.name}</div>
                   <div className="text-[10px] font-mono text-gray-500">
                     <span className={isProfit ? "text-[--bull]" : "text-[--bear]"}>
                       {isProfit ? '+' : '-'}${Math.abs(strat.pnl).toFixed(2)}
                     </span>
                     <span className="mx-2">|</span>
                     {strat.winRate.toFixed(1)}% WR
                     <span className="mx-2">|</span>
                     {strat.trades} T
                   </div>
                </div>
                {/* Horizontal bar container */}
                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${widthPct}%`, 
                      background: isProfit ? "linear-gradient(90deg, var(--bull) 0%, #00b570 100%)" : "linear-gradient(90deg, var(--bear) 0%, #dc2626 100%)",
                      opacity: 0.85
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-center gap-6 relative z-10 text-[10px] font-bold uppercase tracking-wider text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[--bull] opacity-80" /> Winner
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[--bear] opacity-80" /> Loser
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
