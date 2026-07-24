import { useState, useMemo } from "react";
import { Position } from "@/hooks/usePositions";
import { Activity, XCircle, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
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
    <div className="rounded-xl border border-[--border] bg-[--bg-card] w-full flex flex-col h-full shadow-lg overflow-hidden animate-fade-in relative group">
      {/* Background glow based on overall PnL */}
      {positions.length > 0 && (
         <div className={`absolute top-0 right-0 w-[300px] h-[300px] blur-[100px] rounded-full pointer-events-none transition-colors ${totalPnl >= 0 ? "bg-[--bull]/5 group-hover:bg-[--bull]/10" : "bg-[--bear]/5 group-hover:bg-[--bear]/10"}`} />
      )}

      {/* Header */}
      <div className="p-5 border-b border-[--border] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Activity className="w-4 h-4 text-[--accent]" />
             <h2 className="text-sm font-bold uppercase tracking-widest text-white">Live Terminals</h2>
          </div>
          <p className="text-[10px] text-[--text-tertiary] flex items-center gap-2">
             <span className="flex h-1.5 w-1.5 rounded-full bg-[--bull] animate-pulse" />
             Synchronizing MT5 Bridge
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
           {positions.length > 0 && (
             <div className={`px-4 py-1.5 rounded-lg border ${totalPnl >= 0 ? "bg-[--bull]/10 border-[--bull]/20 text-[--bull]" : "bg-[--bear]/10 border-[--bear]/20 text-[--bear]"}`}>
                <span className="text-[10px] font-bold uppercase tracking-widest mr-2">Float</span>
                <span className="text-sm font-mono font-bold">{totalPnl >= 0 ? "+" : "-"}${Math.abs(totalPnl).toFixed(2)}</span>
             </div>
           )}
           <input
             type="text"
             placeholder="Filter pair..."
             value={filterStr}
             onChange={e => setFilterStr(e.target.value)}
             className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[--accent] w-24 sm:w-32"
           />
        </div>
      </div>

      {/* Table section */}
      <div className="overflow-x-auto relative z-10 flex-1">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
            <tr className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              <th className="px-6 py-4">Ticket</th>
              <th className="px-6 py-4">Pair</th>
              <th className="px-6 py-4">Type/Vol</th>
              <th className="px-6 py-4">Entry</th>
              <th className="px-6 py-4">Current</th>
              <th className="px-6 py-4">SL / TP</th>
              <th className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => setSortBy('pnl')}>
                P&L {sortBy === 'pnl' && "↓"}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && positions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                     <Activity className="w-6 h-6 mb-3 animate-spin opacity-50" />
                     <p className="text-xs uppercase tracking-widest font-bold">Connecting to MT5 Bridge</p>
                  </div>
                </td>
              </tr>
            ) : filteredPositions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                     <div className="w-12 h-12 rounded-full border border-dashed border-gray-600 flex items-center justify-center mb-3">
                        <XCircle className="w-5 h-5 opacity-30" />
                     </div>
                     <p className="text-xs uppercase tracking-widest font-bold text-white mb-1">No Open Positions</p>
                     <p className="text-[10px]">Your configured MT5 account has no active trades.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPositions.map((p, i) => (
                <tr key={p.ticket || i} className="border-b border-[--border] hover:bg-white/[0.02] transition-colors group">
                  <td className={`px-6 py-4 border-l-4 ${p.pnl > 0 ? "border-l-[--bull]" : p.pnl < 0 ? "border-l-[--bear]" : "border-l-gray-600"}`}>
                    <span className="text-[11px] font-mono text-gray-500 group-hover:text-gray-300">#{p.ticket}</span>
                    <div className="text-[9px] text-gray-600 mt-0.5 flex items-center gap-1">
                       <Clock className="w-3 h-3" />
                       {new Date(p.openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-white text-xs">{p.pair}</td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                        {p.direction === 'Long' ? <ArrowUpRight className="w-4 h-4 text-[--bull]" /> : <ArrowDownRight className="w-4 h-4 text-[--bear]" />}
                        <div>
                           <div className={`text-[10px] font-bold uppercase ${p.direction === 'Long' ? "text-[--bull]" : "text-[--bear]"}`}>{p.direction}</div>
                           <div className="text-[10px] font-mono text-white/50">{p.volume.toFixed(2)} Lots</div>
                        </div>
                     </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-[12px] text-gray-300">{Number(p.entry).toFixed(getPairDigits(p.pair))}</td>
                  <td className="px-6 py-4 font-mono text-[12px] text-white">
                     {Number(p.current).toFixed(getPairDigits(p.pair))}
                  </td>
                  <td className="px-6 py-4 text-[10px] font-mono text-gray-400">
                     <div className="mb-0.5">SL: {p.sl > 0 ? p.sl.toFixed(getPairDigits(p.pair)) : "—"}</div>
                     <div>TP: {p.tp > 0 ? p.tp.toFixed(getPairDigits(p.pair)) : "—"}</div>
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-bold ${p.pnl >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
                    <div className="text-sm">
                      {p.pnl >= 0 ? "+" : "-"}${Math.abs(p.pnl).toFixed(2)}
                    </div>
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
