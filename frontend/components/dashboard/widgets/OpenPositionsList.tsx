import { useState, useMemo } from "react";
import { Position } from "@/hooks/usePositions";
import { Activity, XCircle, ArrowUpRight, ArrowDownRight, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { getPairDigits } from "@/lib/format";

interface OpenPositionsListProps {
  positions: Position[];
  loading?: boolean;
}

export function OpenPositionsList({ positions = [], loading }: OpenPositionsListProps) {
  const [filterStr, setFilterStr] = useState("");
  const [sortBy, setSortBy] = useState<keyof Position>("pnl");
  
  const filteredPositions = useMemo(() => {
    let result = positions;
    if (filterStr) {
       result = result.filter(p => p.pair.toLowerCase().includes(filterStr.toLowerCase()));
    }
    return result.sort((a, b) => {
       const vA = a[sortBy];
       const vB = b[sortBy];
       if (typeof vA === "number" && typeof vB === "number") return vB - vA; // Descending default
       if (typeof vA === "string" && typeof vB === "string") return vA.localeCompare(vB);
       return 0;
    });
  }, [positions, filterStr, sortBy]);

  const totalPnl = positions.reduce((acc, p) => acc + p.pnl, 0);

  return (
    <div className="bg-[#111118] border border-zinc-800/40 w-full flex flex-col h-full shadow-xl overflow-hidden animate-fade-in relative group">
      
      {/* Header */}
      <div className="px-5 py-3 border-b border-zinc-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10 bg-black/25">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
             <Activity className="w-3.5 h-3.5 text-emerald-400" />
             <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">Live Open Positions</h2>
          </div>
          <p className="text-[9px] text-zinc-500 flex items-center gap-1.5 font-mono">
             <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
             Synchronizing MT5 Bridge
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto font-mono">
           {positions.length > 0 && (
             <div className={`px-3 py-1 rounded-lg border text-xs font-bold ${totalPnl >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                <span className="text-[8px] font-bold uppercase tracking-widest mr-2 text-zinc-500">FLOAT</span>
                <span>{totalPnl >= 0 ? "+" : "-"}${Math.abs(totalPnl).toFixed(2)}</span>
             </div>
           )}
           <input
             type="text"
             placeholder="Filter pair..."
             value={filterStr}
             onChange={e => setFilterStr(e.target.value)}
             className="bg-black/35 border border-zinc-800/50 rounded-lg px-2.5 py-1 text-[10px] text-white placeholder:text-zinc-650 focus:outline-none focus:border-emerald-400 w-24 sm:w-28 font-mono"
           />
        </div>
      </div>

      {/* Table section */}
      <div className="overflow-x-auto relative z-10 flex-1">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-[#111118]/85 text-[8px] uppercase font-bold text-zinc-500 tracking-wider">
            <tr className="border-b border-zinc-800/40">
              <th className="px-4 py-2.5">Ticket</th>
              <th className="px-4 py-2.5">Pair</th>
              <th className="px-4 py-2.5">Direction</th>
              <th className="px-4 py-2.5">Vol</th>
              <th className="px-4 py-2.5">Entry</th>
              <th className="px-4 py-2.5">Current</th>
              <th className="px-4 py-2.5">SL / TP</th>
              <th className="px-4 py-2.5 text-right cursor-pointer hover:text-white transition-colors" onClick={() => setSortBy('pnl')}>
                P&L {sortBy === 'pnl' && "↓"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/40 font-medium text-zinc-300 font-mono">
            {loading && positions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                  <div className="flex items-center justify-center gap-2">
                     <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                     <p className="text-[9px] uppercase tracking-widest font-bold">Connecting to MT5 Bridge</p>
                  </div>
                </td>
              </tr>
            ) : filteredPositions.length === 0 ? (
              <tr>
                 <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center py-4">
                     <div className="w-10 h-10 rounded-full bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                     </div>
                     <p className="text-xs font-bold text-white mb-1 font-sans">No Open Positions</p>
                     <p className="text-[10px] text-zinc-500 font-sans">Your live account has no active trades.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPositions.map((p, i) => (
                <tr key={p.ticket || i} className="hover:bg-white/[0.01] border-b border-zinc-900/60 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-zinc-500 text-[10px]">#{p.ticket}</span>
                    <div className="text-[8px] text-zinc-600 mt-0.5 flex items-center gap-1">
                       <Clock className="w-2.5 h-2.5" />
                       {new Date(p.openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-white text-[11px]">#{p.pair}</td>
                  <td className="px-4 py-3">
                     <span className={`px-2 py-0.5 rounded font-bold uppercase text-[8px] tracking-wider border ${
                       p.direction === 'Long'
                         ? "bg-blue-950/20 text-blue-400 border-blue-900/30"
                         : "bg-purple-950/20 text-purple-400 border-purple-900/30"
                     }`}>
                       {p.direction}
                     </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-[10px]">{p.volume.toFixed(2)} Lots</td>
                  <td className="px-4 py-3 text-zinc-300">{Number(p.entry).toFixed(getPairDigits(p.pair))}</td>
                  <td className="px-4 py-3 text-white">
                     {Number(p.current).toFixed(getPairDigits(p.pair))}
                  </td>
                  <td className="px-4 py-3 text-[9px] text-zinc-500">
                     <div className="mb-0.5">SL: {p.sl > 0 ? p.sl.toFixed(getPairDigits(p.pair)) : "—"}</div>
                     <div>TP: {p.tp > 0 ? p.tp.toFixed(getPairDigits(p.pair)) : "—"}</div>
                  </td>
                  <td className={`px-4 py-3 text-right font-black text-xs ${p.pnl >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
                    {p.pnl >= 0 ? "+" : ""}${Math.abs(p.pnl).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
