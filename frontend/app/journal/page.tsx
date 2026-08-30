"use client";
import { useCsvTrades } from "@/hooks/useCsvTrades";
import type { TradeData } from "@/hooks/useCsvTrades";
import { useMemo, useState, useEffect, useRef } from "react";
import { getPairDigits } from "@/lib/format";
import CsvUploadComponent from "@/components/CsvUploadComponent";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search, Upload, RefreshCw, X, Image as ImageIcon, Tag,
  FileText, Clock, TrendingUp, TrendingDown, Trash2,
  List, Calendar as CalendarIcon, ChevronLeft, Camera, Download, ChevronRight, Play, Plus, BookOpen, Eye
} from "lucide-react";
import { useJournalData } from "@/hooks/useJournalData";
import JournalCalendar from "@/components/JournalCalendar";
import AutoScreenshotModal from "@/components/AutoScreenshotModal";
import { TradeReplayModal } from "@/components/journal/TradeReplayModal";
import { fetchWithAuth, getBackendUrl } from "@/lib/utils";
import { toast } from "sonner";

export default function JournalPage() {
  const router = useRouter();
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<string>("all");
  const { trades, analytics, loading, error, refresh } = useCsvTrades(
    selectedAccountNumber === "all" ? undefined : selectedAccountNumber
  );
  const [searchSymbol, setSearchSymbol] = useState("");
  const [filterDirection, setFilterDirection] = useState<"all" | "Long" | "Short">("all");
  const [filterOutcome, setFilterOutcome] = useState<"all" | "W" | "L" | "E">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "year">("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<TradeData | null>(null);
  const [replayTradeId, setReplayTradeId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ dateStr: string; trades: TradeData[] } | null>(null);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [strategies, setStrategies] = useState<string[]>([
    "Trend Following", "Breakout", "Reversal", "SMC",
    "Support / Resistance", "Supply / Demand", "News Trading",
  ]);
  const [availableLessons, setAvailableLessons] = useState<any[]>([]);
  const [emotions, setEmotions] = useState<string[]>([
    "Calm", "FOMO", "Revenge", "Anxious", "Greedy", "Frustrated"
  ]);

  useEffect(() => {
    fetchWithAuth(`${getBackendUrl()}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          if (data.data.strategies?.length) setStrategies(data.data.strategies);
          if (data.data.emotions?.length) setEmotions(data.data.emotions);
        }
      })
      .catch(console.error);

    fetchWithAuth(`${getBackendUrl()}/api/lessons`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.lessons) {
          setAvailableLessons(data.lessons);
        }
      })
      .catch(console.error);

    fetchWithAuth(`${getBackendUrl()}/api/accounts`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setDbAccounts(data.data);
        }
      })
      .catch(console.error);
  }, []);

  const handleAddStrategy = async () => {
    const newVal = prompt("Enter new Strategy name:");
    if (!newVal || !newVal.trim()) return;
    const updated = [...strategies, newVal.trim()];
    setStrategies(updated);
    await fetchWithAuth(`${getBackendUrl()}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategies: updated })
    });
  };

  const handleAddEmotion = async () => {
    const newVal = prompt("Enter new Emotional State:");
    if (!newVal || !newVal.trim()) return;
    const updated = [...emotions, newVal.trim()];
    setEmotions(updated);
    await fetchWithAuth(`${getBackendUrl()}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emotions: updated })
    });
  };

  const handleDeleteStrategy = async (strat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove the strategy "${strat}"?`)) return;
    const updated = strategies.filter(s => s !== strat);
    setStrategies(updated);
    await fetchWithAuth(`${getBackendUrl()}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategies: updated })
    });
  };

  const handleDeleteEmotion = async (emotion: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove the emotion "${emotion}"?`)) return;
    const updated = emotions.filter(eItem => eItem !== emotion);
    setEmotions(updated);
    await fetchWithAuth(`${getBackendUrl()}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emotions: updated })
    });
  };

  const tradeIdToUse = selectedTrade ? (selectedTrade.ticket || selectedTrade.id) : (selectedDay ? `day_${selectedDay.dateStr}` : undefined);
  const { entry, saveEntry } = useJournalData(tradeIdToUse?.toString());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTrades = useMemo(() => {
    let filtered = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (searchSymbol) filtered = filtered.filter((t) => t.pair.toUpperCase().includes(searchSymbol.toUpperCase()));
    if (filterDirection !== "all") filtered = filtered.filter((t) => t.direction === filterDirection);
    if (filterOutcome !== "all") filtered = filtered.filter((t) => t.outcome === filterOutcome);
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter((t) => {
        const d = new Date(t.date);
        if (dateFilter === "today") return d >= today;
        if (dateFilter === "week") {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          return d >= startOfWeek;
        }
        if (dateFilter === "month") return d >= new Date(now.getFullYear(), now.getMonth(), 1);
        if (dateFilter === "year") return d >= new Date(now.getFullYear(), 0, 1);
        return true;
      });
    }
    return filtered;
  }, [trades, searchSymbol, filterDirection, filterOutcome, dateFilter]);

  const syncUrlToLesson = async (url: string, showToast = true) => {
    if (!entry.linkedLessonId) return;
    const lesson = availableLessons.find(l => l.id === entry.linkedLessonId);
    if (!lesson) return;
    const newImages = [...(lesson.images || []), {
      id: Date.now().toString() + Math.random().toString(),
      url: url,
      note: `Journal Trade: ${selectedTrade?.pair || ''} ${selectedTrade?.direction || ''}`,
      uploadedAt: new Date().toISOString(),
      profit: selectedTrade?.profit,
      tradeDate: selectedTrade?.date,
      pair: selectedTrade?.pair,
      direction: selectedTrade?.direction,
      strategy: entry.strategy,
      emotion: entry.emotion
    }];
    try {
      await fetchWithAuth(`${getBackendUrl()}/api/lessons/${entry.linkedLessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: newImages })
      });
      setAvailableLessons(prev => prev.map(l => l.id === entry.linkedLessonId ? { ...l, images: newImages } : l));
      if (showToast) toast.success("Image added to Lesson!");
    } catch (e) {
      console.error(e);
    }
  };

  const uploadAndSyncImageFile = async (file: File) => {
    const toastId = toast.loading("Uploading image...");
    const formData = new FormData();
    formData.append("image", file);
    try {
      const uploadRes = await fetchWithAuth(`${getBackendUrl()}/api/upload`, {
        method: "POST",
        body: formData,
        headers: { "Accept": "application/json" }
      });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        const url = data.data.url;
        saveEntry({ images: [...(entry.images || []), url] });
        if (entry.linkedLessonId) {
          await syncUrlToLesson(url, false);
          toast.success("Image uploaded to Journal and Lesson!", { id: toastId });
        } else {
          toast.success("Image uploaded", { id: toastId });
        }
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error("Failed to upload image", err);
      toast.error("Failed to upload image", { id: toastId });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image is too large. Please use an image under 2MB.");
      return;
    }
    await uploadAndSyncImageFile(file);
  };

  const toggleStrategy = (strat: string) => {
    let current = entry.strategy ? entry.strategy.split(", ") : [];
    if (current.includes(strat)) current = current.filter((s) => s !== strat);
    else current.push(strat);
    saveEntry({ strategy: current.join(", ") });
  };

  const exportCSV = () => {
    if (!trades.length) return;
    const headers = ["Date", "Symbol", "Direction", "Entry", "Lot Size", "P&L", "Outcome"];
    const rows = filteredTrades.map(t => [
      `"${new Date(t.date).toLocaleString()}"`,
      t.pair, t.direction, t.entry.toFixed(getPairDigits(t.pair)),
      t.lotSize?.toFixed(2) ?? "0", t.profit.toFixed(2), t.outcome
    ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tradekiller_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);
  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTrades.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTrades, currentPage]);
  
  useEffect(() => { setCurrentPage(1); }, [filteredTrades]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-2 border-[#20e0b2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col pb-12 font-sans">
      
      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-20 bg-[#09090b]">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#f4f4f5]">Trading Journal</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-widest font-mono text-[#71717a]">Database Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[rgba(255,255,255,0.07)] rounded bg-[#141419]">
            <Search className="w-3 h-3 text-[#71717a]" />
            <input type="text" placeholder="Symbol..." value={searchSymbol} onChange={(e) => setSearchSymbol(e.target.value)}
              className="w-14 bg-transparent border-none focus:outline-none text-[10px] font-bold text-[#f4f4f5] placeholder-[#71717a] font-mono" />
          </div>
          <button onClick={() => refresh()} className="flex items-center gap-1 px-3 py-1.5 rounded border border-[rgba(255,255,255,0.07)] text-[9px] font-bold uppercase tracking-wider text-[#71717a] hover:text-[#f4f4f5] hover:border-[rgba(255,255,255,0.15)] transition-all font-mono">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-[#20e0b2] hover:bg-[#20e0b2] text-[#09090b] px-3 py-1.5 rounded transition-all font-mono">
            <Upload className="w-3 h-3" /> {showUpload ? "Close" : "Import CSV"}
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-1.5 rounded border border-[rgba(255,92,115,0.2)] text-[9px] font-bold uppercase tracking-wider text-[#ff5c73] hover:bg-[rgba(255,92,115,0.08)] transition-all font-mono">
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#101014]">
            <div className="p-5"><CsvUploadComponent /></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.07)] rounded-lg overflow-hidden">
        {[
          { label: "Total Trades", value: analytics?.totalTrades || 0, color: "text-[#f4f4f5]" },
          { label: "Win Rate", value: `${(analytics?.winRate || 0).toFixed(1)}%`, color: "text-[#f4f4f5]", hasGauge: true },
          { label: "Total P&L", value: `$${(analytics?.totalProfit || 0).toFixed(2)}`, color: (analytics?.totalProfit || 0) >= 0 ? "text-[#20e0b2]" : "text-[#ff5c73]" },
          { label: "Profit Factor", value: (analytics?.profitFactor || 0).toFixed(2), color: "text-[#f4f4f5]" },
          { label: "Avg Win", value: `$${(analytics?.avgWin || 0).toFixed(2)}`, color: "text-[#20e0b2]" },
        ].map((stat, i) => (
          <div key={i} className="bg-[#101014] px-4 py-3.5 flex justify-between items-center">
            <div>
              <div className="text-[9px] text-[#71717a] font-bold uppercase tracking-widest mb-1 font-mono">{stat.label}</div>
              <div className={`text-lg font-black font-mono tracking-tight ${stat.color}`}>{stat.value}</div>
            </div>
            {stat.hasGauge && (
              <div className="relative flex items-center justify-center shrink-0 w-8 h-8">
                <svg className="w-8 h-8 -rotate-90">
                  <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
                  <circle cx="16" cy="16" r="13" fill="none" stroke="#20e0b2" strokeWidth="2.5"
                    strokeDasharray={`${2 * Math.PI * 13}`}
                    strokeDashoffset={`${2 * Math.PI * 13 * (1 - (analytics?.winRate || 0) / 100)}`}
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-[#ff5c73]/10 border border-[#ff5c73]/20 text-[#ff5c73] text-xs font-bold font-mono rounded-lg flex items-center gap-2">
          <X className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Filters & View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#101014]/85 p-3.5 border border-[rgba(255,255,255,0.07)] rounded-xl">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-black/30 border border-[rgba(255,255,255,0.07)] rounded-lg">
            <Search className="w-3 h-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Symbol..."
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              className="w-16 bg-transparent border-none focus:outline-none text-[10px] font-bold text-white placeholder-zinc-600 font-mono"
            />
          </div>

          <select
            value={selectedAccountNumber}
            onChange={(e) => setSelectedAccountNumber(e.target.value)}
            className="bg-transparent text-[10px] font-bold text-zinc-400 border-none focus:outline-none cursor-pointer uppercase tracking-wider font-mono hover:text-white"
          >
            <option value="all" className="bg-zinc-950 font-sans">Account: All</option>
            {dbAccounts.map((acc) => (
              <option key={acc.id} value={acc.accountNumber} className="bg-zinc-950 font-sans">
                {acc.brokerName || acc.mt5Server} #{acc.accountNumber}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-transparent text-[10px] font-bold text-zinc-400 border-none focus:outline-none cursor-pointer uppercase tracking-wider font-mono hover:text-white"
          >
            <option value="all" className="bg-zinc-950 font-sans">Date: All Time</option>
            <option value="today" className="bg-zinc-950 font-sans">Today</option>
            <option value="week" className="bg-zinc-950 font-sans">This Week</option>
            <option value="month" className="bg-zinc-950 font-sans">This Month</option>
            <option value="year" className="bg-zinc-950 font-sans">This Year</option>
          </select>

          <select
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value as any)}
            className="bg-transparent text-[10px] font-bold text-zinc-400 border-none focus:outline-none cursor-pointer uppercase tracking-wider font-mono hover:text-white"
          >
            <option value="all" className="bg-zinc-950 font-sans">Side: Both</option>
            <option value="Long" className="bg-zinc-950 font-sans">LONG</option>
            <option value="Short" className="bg-zinc-950 font-sans">SHORT</option>
          </select>

          <select
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value as any)}
            className="bg-transparent text-[10px] font-bold text-zinc-400 border-none focus:outline-none cursor-pointer uppercase tracking-wider font-mono hover:text-white"
          >
            <option value="all" className="bg-zinc-950 font-sans">Outcome: All</option>
            <option value="W" className="bg-zinc-950 font-sans">WIN</option>
            <option value="L" className="bg-zinc-950 font-sans">LOSS</option>
            <option value="E" className="bg-zinc-950 font-sans">BE</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-all border ${viewMode === "list" ? "bg-white/10 text-white border-white/10" : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"}`}>
            <List className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode("calendar")} className={`p-1.5 rounded-lg transition-all border ${viewMode === "calendar" ? "bg-white/10 text-white border-white/10" : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"}`}>
            <CalendarIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row items-start gap-4">
        {/* Main Content Area */}
        <div className="flex-1 w-full">
          <AnimatePresence mode="wait">
            {viewMode === "list" ? (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-zinc-950/20 border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden">
                {paginatedTrades.length === 0 ? (
                  <div className="text-center py-20 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#101014]">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center bg-zinc-900 border border-[rgba(255,255,255,0.07)]">
                      <List className="w-6 h-6 opacity-50" />
                    </div>
                    <h3 className="text-sm font-bold mb-1 text-white">No Trades Found</h3>
                    <p className="text-xs text-zinc-500">Upload a CSV statement or adjust your filter presets.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-[#101014]/85 text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
                        <tr className="border-b border-[rgba(255,255,255,0.07)]">
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Side</th>
                          <th className="px-4 py-3">Symbol</th>
                          <th className="px-4 py-3">Open Date</th>
                          <th className="px-4 py-3">Entry</th>
                          <th className="px-4 py-3">Size</th>
                          <th className="px-4 py-3 text-right">Net Return</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/40 font-medium text-zinc-300 font-mono">
                        {paginatedTrades.map((trade, idx) => {
                          const isWin = trade.profit > 0;
                          const isSelected = selectedTrade?.id === trade.id;
                          return (
                            <tr
                              key={trade.id}
                              onClick={() => { setSelectedTrade(trade); setSelectedDay(null); }}
                              className={`hover:bg-white/[0.01] border-b border-[rgba(255,255,255,0.04)] transition-colors cursor-pointer ${
                                isSelected ? "bg-white/[0.03]" : ""
                              }`}
                            >
                              <td className="px-4 py-3">
                                {trade.profit > 0 ? (
                                  <span className="px-2 py-0.5 bg-[#20e0b2]/10 text-[#20e0b2] border border-[#20e0b2]/20 rounded font-bold uppercase tracking-widest text-[8px]">Win</span>
                                ) : trade.profit < 0 ? (
                                  <span className="px-2 py-0.5 bg-[#ff5c73]/10 text-[#ff5c73] border border-[#ff5c73]/20 rounded font-bold uppercase tracking-widest text-[8px]">Loss</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded font-bold uppercase tracking-widest text-[8px]">BE</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded font-bold uppercase text-[8px] tracking-wider border ${
                                  trade.direction === "Long"
                                    ? "bg-blue-950/20 text-blue-400 border-blue-900/30"
                                    : "bg-purple-950/20 text-purple-400 border-purple-900/30"
                                }`}>
                                  {trade.direction}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-bold text-white font-mono">
                                #{trade.pair}
                              </td>
                              <td className="px-4 py-3 text-[9px] text-zinc-500">
                                {new Date(trade.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 font-mono text-zinc-300">{trade.entry.toFixed(5)}</td>
                              <td className="px-4 py-3 font-mono text-zinc-450">{trade.lotSize || 0.1}</td>
                              <td className={`px-4 py-3 text-right font-mono font-black text-xs ${isWin ? "text-[--bull]" : "text-[--bear]"}`}>
                                {isWin ? "+" : ""}{trade.profit.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    {totalPages > 1 && (
                      <div className="p-3 bg-[#101014]/80 border-t border-[rgba(255,255,255,0.07)] flex items-center justify-between text-xs text-zinc-500 font-mono">
                        <div>
                          Showing <span className="text-zinc-300">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-zinc-300">{Math.min(currentPage * itemsPerPage, filteredTrades.length)}</span> of {filteredTrades.length} trades
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg border border-white/5 text-zinc-300 font-bold transition-all text-[10px]">
                            Prev
                          </button>
                          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg border border-white/5 text-zinc-300 font-bold transition-all text-[10px]">
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#101014] p-5">
                <JournalCalendar trades={filteredTrades} onDayClick={(dateStr, dayTrades) => { setSelectedTrade(null); setSelectedDay({ dateStr, trades: dayTrades }); }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Side Panel for Details */}
        <AnimatePresence>
          {(selectedTrade || selectedDay) && (
            <motion.div 
              key="sidebar"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
              className="w-full xl:w-96 flex-shrink-0 relative xl:sticky top-6 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#101014] max-h-[calc(100vh-48px)] overflow-y-auto custom-scrollbar"
            >
              <div className="p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] pb-2.5">
                  <div className="flex items-center gap-2">
                    {selectedTrade && selectedDay && (
                       <button onClick={() => setSelectedTrade(null)} className="p-1 -ml-1 rounded-full transition-colors hover:bg-white/10 text-zinc-400">
                         <ChevronLeft className="w-4 h-4" />
                       </button>
                     )}
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white font-mono">
                      {selectedTrade ? "Trade Details" : "Daily Review"}
                    </h3>
                  </div>
                  <button onClick={() => { setSelectedTrade(null); setSelectedDay(null); }} className="p-1 rounded-full transition-colors hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer relative z-50">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedTrade && (
                  <div className="p-3.5 rounded-lg border border-[rgba(255,255,255,0.07)] bg-black/25 flex flex-col gap-2 font-mono text-[11px]">
                     <div className="flex items-center justify-between">
                          <div>
                             <div className="text-xs font-bold text-white">#{selectedTrade.pair} • <span className={selectedTrade.direction === "Long" ? "text-blue-400" : "text-purple-400"}>{selectedTrade.direction}</span></div>
                             <div className="text-[9px] text-zinc-500 mt-0.5">{new Date(selectedTrade.date).toLocaleString()}</div>
                          </div>
                          <div className="text-right">
                             <div className={`text-sm font-black ${selectedTrade.profit > 0 ? "text-[--bull]" : "text-[--bear]"}`}>
                                {selectedTrade.profit > 0 ? "+" : ""}{selectedTrade.profit.toFixed(2)}
                             </div>
                          </div>
                     </div>
                     <button
                        onClick={() => setReplayTradeId(selectedTrade.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 mt-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 font-bold transition-all text-[10px] tracking-wider font-mono"
                     >
                        <Play className="w-3.5 h-3.5" /> REPLAY TRADE
                     </button>
                  </div>
                )}

                {selectedDay && !selectedTrade && (
                  <div className="space-y-3 font-mono">
                    <div className="p-3 rounded-lg border border-[rgba(255,255,255,0.07)] bg-black/25 text-[11px]">
                       <div className="text-xs font-bold text-white">{selectedDay.dateStr}</div>
                       <div className="text-[10px] text-zinc-500 mt-0.5">{selectedDay.trades.length} trades recorded</div>
                    </div>
                    {selectedDay.trades.length > 0 && (
                      <div className="space-y-1.5 mt-3">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Trades on this day</div>
                        {selectedDay.trades.slice(0, 3).map(trade => (
                          <div 
                            key={trade.id}
                            onClick={() => setSelectedTrade(trade)}
                            className="p-2.5 rounded-lg border border-zinc-805/40 bg-[#101014] flex items-center justify-between cursor-pointer hover:border-[#20e0b2]/30 transition-all group"
                          >
                            <div>
                               <div className="text-[11px] font-bold text-white flex items-center gap-2">
                                 #{trade.pair} 
                                 <span className={`text-[8px] px-1.5 py-0.5 rounded border ${trade.direction === "Long" ? "bg-blue-950/20 text-blue-400 border-blue-900/30" : "bg-purple-950/20 text-purple-400 border-purple-900/30"}`}>{trade.direction}</span>
                               </div>
                               <div className="text-[8px] text-zinc-550 mt-0.5">{new Date(trade.date).toLocaleTimeString()}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`text-xs font-black ${trade.profit > 0 ? "text-[--bull]" : "text-[--bear]"}`}>
                                 {trade.profit > 0 ? "+" : ""}{trade.profit.toFixed(2)}
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity text-zinc-555" />
                            </div>
                          </div>
                        ))}
                        
                        <button
                          onClick={() => router.push('/journal/day/' + selectedDay.dateStr)}
                          className="w-full mt-3 py-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          {selectedDay.trades.length > 3 ? `View all ${selectedDay.trades.length} trades` : "Open Full Daily Review"} <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest flex items-center justify-between text-zinc-500 font-mono">
                    <span className="flex items-center gap-1.5"><Tag size={12} /> Playbook Strategy</span>
                    <button onClick={handleAddStrategy} className="text-[#20e0b2] hover:text-emerald-300 flex items-center gap-0.5"><Plus size={10} /> Add</button>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {strategies.map(s => {
                       const active = entry.strategy?.includes(s);
                       return (
                         <button key={s} onClick={() => toggleStrategy(s)}
                           className="group relative px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border border-[rgba(255,255,255,0.07)] font-mono"
                           style={{ 
                             background: active ? "rgba(16,185,129,0.08)" : "transparent", 
                             borderColor: active ? "#10b981" : "rgba(63,63,70,0.4)", 
                             color: active ? "#10b981" : "#a1a1aa" 
                           }}>
                           {s}
                           <div 
                             onClick={(e) => handleDeleteStrategy(s, e)} 
                             className="absolute -top-1.5 -right-1.5 bg-[#ff5c73]/80 hover:bg-[#ff5c73] text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                           >
                             <X size={8} />
                           </div>
                         </button>
                       )
                    })}
                  </div>
                </div>

                {availableLessons.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 font-mono block">
                      Linked Lesson
                    </label>
                    <select 
                      value={entry.linkedLessonId || ""} 
                      onChange={(e) => saveEntry({ linkedLessonId: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full bg-black/25 border border-[rgba(255,255,255,0.07)] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#20e0b2] font-mono"
                    >
                      <option value="" className="bg-zinc-950">-- No Lesson Linked --</option>
                      {availableLessons.map(l => (
                        <option key={l.id} value={l.id} className="bg-zinc-950">
                          {l.concept ? `[${l.concept}] ` : ""}{l.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest flex items-center justify-between text-zinc-500 font-mono">
                    <span className="flex items-center gap-1.5"><TrendingUp size={12} /> Emotional State</span>
                    <button onClick={handleAddEmotion} className="text-[#20e0b2] hover:text-emerald-300 flex items-center gap-0.5"><Plus size={10} /> Add</button>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {emotions.map(e => {
                       const active = entry.emotion === e;
                       return (
                         <button key={e} onClick={() => saveEntry({ emotion: e })}
                           className="group relative flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-[rgba(255,255,255,0.07)] text-center font-mono"
                           style={{ 
                             background: active ? "rgba(255,255,255,0.08)" : "transparent", 
                             borderColor: active ? "#fff" : "rgba(63,63,70,0.4)", 
                             color: active ? "#fff" : "#a1a1aa" 
                           }}>
                           {e}
                           <div 
                             onClick={(ev) => handleDeleteEmotion(e, ev)} 
                             className="absolute -top-1.5 -right-1.5 bg-[#ff5c73]/80 hover:bg-[#ff5c73] text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                           >
                             <X size={8} />
                           </div>
                         </button>
                       )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-zinc-500 font-mono">
                    <FileText size={12} /> Notes & Analysis
                  </label>
                  <textarea
                    value={entry.reason || ""}
                    onChange={(e) => saveEntry({ reason: e.target.value })}
                    placeholder="Why did you take this setup? Did you follow your protocol?"
                    className="w-full h-28 p-3 rounded-lg text-xs resize-none focus:outline-none focus:border-[#20e0b2] transition-all font-sans"
                    style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(63,63,70,0.4)", color: "#f4f4f5" }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-zinc-500 font-mono">
                      <ImageIcon size={12} /> Chart Screenshots
                    </label>
                    <div className="flex gap-2 font-mono text-[9px] text-zinc-400">
                       <button onClick={() => setShowScreenshotModal(true)} className="flex items-center gap-0.5 hover:text-[#20e0b2] transition-colors">
                         <Camera size={11} /> Auto
                       </button>
                       <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-0.5 hover:text-[#20e0b2] transition-colors">
                         <Upload size={11} /> File
                       </button>
                       <button onClick={async () => {
                         const url = prompt("Paste TradingView or Image URL:");
                         if (url) {
                           saveEntry({ images: [...(entry.images || []), url] });
                           if (entry.linkedLessonId) {
                             await syncUrlToLesson(url);
                           }
                         }
                       }} className="flex items-center gap-0.5 hover:text-[#20e0b2] transition-colors">
                         <ImageIcon size={11} /> Link
                       </button>
                    </div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                  
                  {entry.images && entry.images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {entry.images.map((img, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden border border-[rgba(255,255,255,0.07)]" style={{ borderColor: "var(--border)" }}>
                          <img src={img} alt="Chart" className="w-full h-20 object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(img, "_blank")} />
                          <button onClick={() => {
                            const newImages = [...entry.images!];
                            newImages.splice(i, 1);
                            saveEntry({ images: newImages });
                          }} className="absolute top-1 right-1 p-1 bg-black/75 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3 h-3 text-[#ff5c73]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 rounded-lg border border-dashed border-[rgba(255,255,255,0.07)] text-center text-[10px] text-zinc-550">
                      No charts attached. Attach screenshots to review execution.
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TradeReplayModal 
        tradeId={replayTradeId} 
        onClose={() => setReplayTradeId(null)} 
      />

      {showScreenshotModal && (
        <AutoScreenshotModal
          trades={selectedTrade ? [selectedTrade as any] : selectedDay?.trades || []}
          onClose={() => setShowScreenshotModal(false)}
          onCapture={(base64Str) => {
            fetch(base64Str)
              .then(res => res.blob())
              .then(blob => {
                const file = new File([blob], "auto-screenshot.png", { type: "image/png" });
                uploadAndSyncImageFile(file);
              });
            setShowScreenshotModal(false);
          }}
        />
      )}
    </div>
  );
}


