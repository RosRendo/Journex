import { useState, useMemo } from "react";
import { TradeData } from "@/hooks/useCsvTrades";
import { MoreHorizontal, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { getPairDigits } from "@/lib/format";

interface RecentTradesTableProps {
  trades: TradeData[];
  loading?: boolean;
}

export function RecentTradesTable({ trades, loading }: RecentTradesTableProps) {
  const [outcomeFilter, setOutcomeFilter] = useState<"All" | "W" | "L">("All");
  const [pairFilter, setPairFilter] = useState("All");

  const [sortBy, setSortBy] = useState<keyof TradeData>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const rowsPerPage = 12;

  const pairs = useMemo(() => ["All", ...Array.from(new Set(trades.map(t => t.pair)))], [trades]);

  const filteredAndSortedTrades = useMemo(() => {
    let result = [...trades];

    // Filter by outcome
    if (outcomeFilter !== "All") {
      result = result.filter(t => t.outcome === outcomeFilter);
    }

    // Filter by pair
    if (pairFilter !== "All") {
      result = result.filter(t => t.pair === pairFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === "date") {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      const stringA = String(aVal);
      const stringB = String(bVal);
      return sortOrder === "asc" ? stringA.localeCompare(stringB) : stringB.localeCompare(stringA);
    });

    return result;
  }, [trades, outcomeFilter, pairFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedTrades.length / rowsPerPage);
  const paginatedTrades = filteredAndSortedTrades.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const toggleSort = (col: keyof TradeData) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };

  const SortIcon = ({ col }: { col: keyof TradeData }) => {
    if (sortBy !== col) return null;
    return sortOrder === "asc" ? <ChevronUp className="w-3 h-3 ml-1 inline" /> : <ChevronDown className="w-3 h-3 ml-1 inline" />;
  };

  if (loading && trades.length === 0) {
    return (
      <div className="rounded-xl border border-[--border] bg-[--bg-card] w-full animate-pulse p-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-10 bg-white/5 rounded-md mb-2"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[--border] bg-[--bg-card] w-full flex flex-col h-full overflow-hidden shadow-lg animate-fade-in">
      {/* Header and Controls */}
      <div className="p-5 border-b border-[--border] flex flex-col sm:flex-row items-center justify-between gap-4" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">Recent Realized Trades</h2>
          <p className="text-[10px] text-[--text-tertiary] mt-1">Live execution ledger</p>
        </div>
        
        <div className="flex gap-3 text-xs">
          <select 
            value={outcomeFilter} 
            onChange={e => setOutcomeFilter(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-gray-300 focus:outline-none focus:border-[--accent]"
          >
            <option value="All">All Outcomes</option>
            <option value="W">Winning Trades</option>
            <option value="L">Losing Trades</option>
          </select>
          <select 
            value={pairFilter} 
            onChange={e => setPairFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-gray-300 focus:outline-none focus:border-[--accent]"
          >
            {pairs.map(p => <option key={p} value={p}>{p === "All" ? "All Pairs" : p}</option>)}
          </select>
        </div>
      </div>

      {/* Table section */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
            <tr className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("date")}>
                Close Date <SortIcon col="date" />
              </th>
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("pair")}>
                Pair <SortIcon col="pair" />
              </th>
              <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("direction")}>
                Direction <SortIcon col="direction" />
              </th>
              <th className="px-6 py-4">Entry</th>
              <th className="px-6 py-4">Exit</th>
              <th className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => toggleSort("profit")}>
                P&L <SortIcon col="profit" />
              </th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-4 py-4 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedTrades.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <Filter className="w-6 h-6 mb-2 opacity-50" />
                    <p>No trades found matching criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTrades.map((t, i) => (
                <tr key={t.id || i} className="border-b border-[--border] hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-gray-400 font-mono text-[11px]">
                    {new Date(t.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 font-bold text-white bg-clip-text">
                    {t.pair}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${t.direction === 'Long' ? 'text-[--bull] border-[--bull]/30 bg-[--bull]/10' : 'text-[--bear] border-[--bear]/30 bg-[--bear]/10'}`}>
                      {t.direction}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-[12px] text-gray-300">{Number(t.entry).toFixed(getPairDigits(t.pair))}</td>
                  <td className="px-6 py-4 font-mono text-[12px] text-gray-300">{t.closePrice ? Number(t.closePrice).toFixed(getPairDigits(t.pair)) : "—"}</td>
                  <td className={`px-6 py-4 text-right font-mono font-bold ${t.profit >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
                    {t.profit >= 0 ? "+" : "-"}${Math.abs(t.profit).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {t.outcome === 'W' ? (
                       <span className="px-2 py-0.5 bg-[--bull]/20 text-[--bull] rounded text-[10px] font-bold">Win</span>
                    ) : t.outcome === 'L' ? (
                       <span className="px-2 py-0.5 bg-[--bear]/20 text-[--bear] rounded text-[10px] font-bold">Loss</span>
                    ) : (
                       <span className="px-2 py-0.5 bg-gray-600/30 text-gray-400 rounded text-[10px] font-bold">BE</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer / Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-[--border] flex items-center justify-between text-xs text-gray-400">
          <div>
            Showing <span className="text-white font-bold">{(page - 1) * rowsPerPage + 1}</span> to <span className="text-white font-bold">{Math.min(page * rowsPerPage, filteredAndSortedTrades.length)}</span> of {filteredAndSortedTrades.length}
          </div>
          <div className="flex gap-1">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded border border-white/10"
            >
              Prev
            </button>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded border border-white/10"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
