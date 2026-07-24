import { useState, useMemo, useRef } from "react";
import { TradeData } from "@/hooks/useCsvTrades";
import { Filter, ChevronDown, ChevronUp, Image, Link, Upload, Check, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { getPairDigits } from "@/lib/format";
import { getBackendUrl } from "@/lib/utils";
import { getSession } from "@/lib/useSession";

interface RecentTradesTableProps {
  trades: TradeData[];
  loading?: boolean;
  onTradeUpdated?: () => void;
}

export function RecentTradesTable({ trades, loading, onTradeUpdated }: RecentTradesTableProps) {
  const [outcomeFilter, setOutcomeFilter] = useState<"All" | "W" | "L">("All");
  const [pairFilter, setPairFilter] = useState("All");

  const [sortBy, setSortBy] = useState<keyof TradeData>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Expanded review state
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

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
          <p className="text-[10px] text-[--text-tertiary] mt-1">Live execution ledger & trade review journal</p>
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
              paginatedTrades.flatMap((t, i) => {
                const ticketKey = t.ticket || String(t.id || i);
                const isExpanded = expandedTicket === ticketKey;

                return [
                  <tr key={ticketKey} className={`border-b border-[--border] hover:bg-white/[0.02] transition-colors group ${isExpanded ? 'bg-white/[0.01]' : ''}`}>
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
                    <td className="px-4 py-4 text-right">
                      <button 
                        onClick={() => setExpandedTicket(isExpanded ? null : ticketKey)}
                        className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={`${ticketKey}-expanded`} className="bg-black/35 border-b border-[--border]">
                      <td colSpan={8} className="px-6 py-5">
                        <TradeReviewPanel trade={t} onUpdated={onTradeUpdated} />
                      </td>
                    </tr>
                  )
                ];
              })
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

interface TradeReviewPanelProps {
  trade: TradeData;
  onUpdated?: () => void;
}

function TradeReviewPanel({ trade, onUpdated }: TradeReviewPanelProps) {
  const [notes, setNotes] = useState(trade.notes || "");
  const [emotion, setEmotion] = useState(trade.emotion || "");
  const [followedPlan, setFollowedPlan] = useState(trade.followedPlan ?? true);
  const [planDeviationReason, setPlanDeviationReason] = useState(trade.planDeviationReason || "");
  const [checklistPassed, setChecklistPassed] = useState(trade.checklistPassed ?? true);
  const [imageUrl, setImageUrl] = useState(trade.imageUrl || "");
  const [imageInput, setImageInput] = useState(trade.imageUrl || "");
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert TV URL if needed
  const handleUrlChange = (val: string) => {
    setImageInput(val);
    const cleaned = cleanTradingViewUrl(val);
    if (cleaned !== val) {
      setImageUrl(cleaned);
    } else {
      setImageUrl(val);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const session = await getSession();
      const token = (session?.user as any)?.apiToken;
      const res = await fetch(`${getBackendUrl()}/api/upload`, {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data?.success && data?.data?.url) {
        const fullUrl = `${getBackendUrl()}${data.data.url}`;
        setImageUrl(fullUrl);
        setImageInput(fullUrl);
      }
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSyncTrade = async () => {
    if (!trade.ticket) return;
    setSyncing(true);
    try {
      const session = await getSession();
      const token = (session?.user as any)?.apiToken;
      const res = await fetch(`${getBackendUrl()}/api/trades/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ days: 30 }),
      });
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      if (data?.success) {
        if (onUpdated) onUpdated();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to sync trade");
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!trade.id) {
      // Must be synced to DB first
      await handleSyncTrade();
      return;
    }

    setSaving(true);
    try {
      const session = await getSession();
      const token = (session?.user as any)?.apiToken;
      const payload = {
        notes,
        emotion,
        followedPlan,
        planDeviationReason: followedPlan ? "" : planDeviationReason,
        checklistPassed,
        imageUrl,
      };

      const res = await fetch(`${getBackendUrl()}/api/trades/${trade.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      if (data?.success) {
        if (onUpdated) onUpdated();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save journal details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-xl p-6 shadow-2xl animate-fade-in text-gray-200">
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Left Column: Form Fields */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>Journal Review</span>
              <span className="text-[10px] text-gray-500 font-mono">Ticket #{trade.ticket || trade.id}</span>
            </h3>
            {!trade.id && (
              <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/30 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Unsynced
              </span>
            )}
          </div>

          {!trade.id ? (
            <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-yellow-400">Trade not synced with Database</h4>
                <p className="text-[10px] text-gray-400 mt-1">This trade is stored locally in your MT5 terminal history. You must sync it to PostgreSQL before writing journal reviews.</p>
              </div>
              <button
                disabled={syncing}
                onClick={handleSyncTrade}
                className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-55 font-bold text-black text-xs px-3 py-1.5 rounded transition-all flex items-center gap-1 shrink-0"
              >
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Sync Trade
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">Discipline Checklists</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs bg-black/15 border border-white/5 rounded-lg p-2.5 hover:bg-white/[0.02] transition-colors">
                    <input
                      type="checkbox"
                      checked={followedPlan}
                      onChange={(e) => setFollowedPlan(e.target.checked)}
                      className="rounded border-white/10 text-[--accent] bg-black/45 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Followed Trading Plan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs bg-black/15 border border-white/5 rounded-lg p-2.5 hover:bg-white/[0.02] transition-colors">
                    <input
                      type="checkbox"
                      checked={checklistPassed}
                      onChange={(e) => setChecklistPassed(e.target.checked)}
                      className="rounded border-white/10 text-[--accent] bg-black/45 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Passed Pre-Trade Checklist</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">Trade Emotion</label>
                <select
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  className="w-full bg-black/25 border border-white/10 rounded-lg p-2.5 text-xs text-gray-300 focus:outline-none focus:border-[--accent] transition-colors"
                >
                  <option value="">Select Emotion...</option>
                  <option value="Calm">Calm & Objective</option>
                  <option value="Confident">Confident & Decisive</option>
                  <option value="Anxious">Anxious / FOMO</option>
                  <option value="Panicked">Panicked / Premature Close</option>
                  <option value="Greedy">Greedy / Sized Up</option>
                  <option value="Revenge">Revenge Trading</option>
                </select>
              </div>

              {!followedPlan && (
                <div className="md:col-span-2 animate-slide-down">
                  <label className="block text-[10px] uppercase font-bold text-red-400 tracking-wider mb-1.5">Plan Deviation Reason</label>
                  <textarea
                    rows={2}
                    value={planDeviationReason}
                    onChange={(e) => setPlanDeviationReason(e.target.value)}
                    placeholder="Why did you deviate from the plan? (e.g. FOMO, early exit, chase...)"
                    className="w-full bg-black/25 border border-red-500/20 focus:border-red-500 rounded-lg p-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none transition-colors resize-none"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5 font-mono">Trade Execution Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record market context, setup type, execution flaws, or review comments..."
                  className="w-full bg-black/25 border border-white/10 rounded-lg p-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[--accent] transition-colors resize-none"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-end pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto bg-gradient-to-r from-[--accent] to-cyan-500 text-black font-bold px-5 py-2 rounded-lg shadow-md hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Journal Review
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Screenshot upload & Preview */}
        {trade.id && (
          <div className="w-full xl:w-[320px] shrink-0 space-y-4">
            <div className="border-b border-white/5 pb-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-white">Execution Screenshot</h4>
            </div>

            {imageUrl ? (
              <div className="space-y-3">
                <div className="relative group/img rounded-lg overflow-hidden border border-white/10 bg-black/30 aspect-video flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt="Trade Execution Screenshot"
                    className="max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Open in new window"
                    >
                      <Link className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => {
                        setImageUrl("");
                        setImageInput("");
                      }}
                      className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 text-center font-mono truncate">{imageUrl}</div>
              </div>
            ) : (
              <div className="border border-dashed border-white/10 rounded-lg p-6 bg-black/10 flex flex-col items-center justify-center text-center space-y-4 aspect-video">
                <Image className="w-8 h-8 text-gray-600" />
                <div>
                  <p className="text-xs font-bold text-gray-300">No screenshot attached</p>
                  <p className="text-[10px] text-gray-500 mt-1">Upload a file or paste a TradingView link</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={imageInput}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="Paste TV or image link..."
                    className="w-full bg-black/25 border border-white/10 rounded-lg py-1.5 px-3 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[--accent] transition-colors"
                  />
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-55 px-3 rounded-lg text-xs font-medium text-gray-300 flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function cleanTradingViewUrl(url: string): string {
  if (!url) return "";
  const match = url.match(/(?:tradingview\.com\/x\/|images\.tradingview\.com\/x\/)([a-zA-Z0-9]+)/);
  if (match && match[1]) {
    return `https://images.tradingview.com/x/${match[1]}.png`;
  }
  return url;
}
