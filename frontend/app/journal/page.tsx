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
  List, Calendar as CalendarIcon, ChevronLeft, Camera, Download, ChevronRight, Play, Plus, BookOpen
} from "lucide-react";
import { useJournalData } from "@/hooks/useJournalData";
import JournalCalendar from "@/components/JournalCalendar";
import AutoScreenshotModal from "@/components/AutoScreenshotModal";
import { TradeReplayModal } from "@/components/journal/TradeReplayModal";
import { fetchWithAuth, getBackendUrl } from "@/lib/utils";
import { toast } from "sonner";
export default function JournalPage() {
  const router = useRouter();
  const { trades, analytics, loading, error, refresh } = useCsvTrades();
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
        <div className="w-10 h-10 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative h-full max-w-[1600px] mx-auto pb-20">
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide mb-3" style={{ background: "rgba(0, 212, 161, 0.1)", border: "1px solid rgba(0, 212, 161, 0.2)", color: "var(--accent)" }}>
            <FileText size={14} />
            TRADE ARCHIVE
          </div>
          <h1 className="text-[36px] font-black tracking-tight" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
            Trading <span style={{ color: "var(--accent)" }}>Journal</span>
          </h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text-tertiary)" }}>
            Your professional trading history and detailed trade annotations
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:scale-105 shadow-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)", backdropFilter: "blur(10px)" }}>
            <RefreshCw className="w-4 h-4" style={{ color: "var(--accent)" }} /> Refresh
          </button>
          <button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:scale-105 shadow-lg" style={{ background: "var(--accent)", color: "#000" }}>
            <Upload className="w-4 h-4" /> {showUpload ? "Close" : "Import CSV"}
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:scale-105 shadow-lg text-white" style={{ background: "var(--bear)" }}>
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-3xl shadow-2xl backdrop-blur-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="p-6"><CsvUploadComponent /></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Trades", value: analytics?.totalTrades || 0, color: "var(--text-primary)" },
          { label: "Win Rate", value: `${(analytics?.winRate || 0).toFixed(1)}%`, color: (analytics?.winRate || 0) >= 50 ? "var(--bull)" : "var(--bear)" },
          { label: "Total P&L", value: `$${(analytics?.totalProfit || 0).toFixed(2)}`, color: (analytics?.totalProfit || 0) >= 0 ? "var(--bull)" : "var(--bear)" },
          { label: "Profit Factor", value: (analytics?.profitFactor || 0).toFixed(2), color: (analytics?.profitFactor || 0) >= 1 ? "var(--bull)" : "var(--bear)" },
          { label: "Avg Win", value: `$${(analytics?.avgWin || 0).toFixed(2)}`, color: "var(--bull)" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
               className="p-5 rounded-2xl border backdrop-blur-md shadow-lg relative overflow-hidden" 
               style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] blur-[50px] pointer-events-none rounded-full" style={{ background: stat.color }} />
            <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-tertiary)" }}>{stat.label}</div>
            <div className="text-[28px] font-black font-mono tracking-tight" style={{ color: stat.color }}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl text-[14px] font-bold flex items-center gap-2 backdrop-blur-md" style={{ background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.3)", color: "var(--bear)" }}>
          <X className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Filters & View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl backdrop-blur-xl shadow-lg border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex gap-2 items-center pl-3">
            <Search className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            <input
              type="text" placeholder="Search symbol..." value={searchSymbol} onChange={(e) => setSearchSymbol(e.target.value)}
              className="w-32 lg:w-40 px-2 py-1.5 bg-transparent border-none focus:outline-none text-[13px] font-bold"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <div className="h-6 w-px hidden md:block" style={{ background: "var(--border-strong)" }} />
          <div className="flex gap-1">
            {(["all", "today", "week", "month", "year"] as const).map((d) => (
              <button key={d} onClick={() => setDateFilter(d)}
                className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all"
                style={{ background: dateFilter === d ? "var(--accent)" : "transparent", color: dateFilter === d ? "#000" : "var(--text-tertiary)" }}>
                {d === "all" ? "All Time" : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <div className="h-6 w-px hidden lg:block" style={{ background: "var(--border-strong)" }} />
          <div className="flex gap-1">
            {(["all", "Long", "Short"] as const).map((dir) => (
              <button key={dir} onClick={() => setFilterDirection(dir)}
                className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all"
                style={{ background: filterDirection === dir ? (dir === "Long" ? "var(--bull)" : dir === "Short" ? "var(--bear)" : "var(--accent)") : "transparent", color: filterDirection === dir ? (dir === "all" ? "#000" : "#fff") : "var(--text-tertiary)" }}>
                {dir === "all" ? "All Dirs" : dir}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1 pr-1">
          <button onClick={() => setViewMode("list")} className="p-2.5 rounded-xl transition-all" style={{ background: viewMode === "list" ? "var(--bg-elevated)" : "transparent", color: viewMode === "list" ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("calendar")} className="p-2.5 rounded-xl transition-all" style={{ background: viewMode === "calendar" ? "var(--bg-elevated)" : "transparent", color: viewMode === "calendar" ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            <CalendarIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-start gap-6">
        {/* Main Content Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {viewMode === "list" ? (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {paginatedTrades.length === 0 ? (
                  <div className="text-center py-20 rounded-3xl border backdrop-blur-xl" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "var(--bg-elevated)" }}>
                      <List className="w-8 h-8 opacity-50" />
                    </div>
                    <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>No Trades Found</h3>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Upload a CSV or change your filters.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedTrades.map((trade, idx) => {
                      const isWin = trade.profit > 0;
                      const isSelected = selectedTrade?.id === trade.id;
                      return (
                        <motion.div
                          key={trade.id}
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                          onClick={() => { setSelectedTrade(trade); setSelectedDay(null); }}
                          className="group p-5 rounded-2xl border transition-all cursor-pointer backdrop-blur-md relative overflow-hidden"
                          style={{
                            background: isSelected ? "var(--bg-elevated)" : "var(--bg-card)",
                            borderColor: isSelected ? "var(--accent)" : "var(--border)",
                            boxShadow: isSelected ? "0 0 20px rgba(0, 212, 161, 0.1)" : "none"
                          }}
                        >
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity" style={{ background: isWin ? "var(--bull)" : "var(--bear)" }} />
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                            <div className="flex items-center gap-5">
                              <div className="w-1.5 h-12 rounded-full" style={{ background: isWin ? "var(--bull)" : "var(--bear)" }} />
                              <div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-[16px]" style={{ color: "var(--text-primary)" }}>{trade.pair}</span>
                                  <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest" style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                                    {trade.direction}
                                  </span>
                                </div>
                                <div className="text-[12px] font-mono mt-1.5 flex items-center gap-2" style={{ color: "var(--text-tertiary)" }}>
                                  <Clock className="w-3 h-3" /> {new Date(trade.date).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-8 sm:gap-12 pl-6 sm:pl-0">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-tertiary)" }}>Entry</div>
                                <div className="font-mono font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>{trade.entry.toFixed(getPairDigits(trade.pair))}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-tertiary)" }}>P&L</div>
                                <div className="font-mono font-black text-[18px] tracking-tight" style={{ color: isWin ? "var(--bull)" : "var(--bear)" }}>
                                  {isWin ? "+" : ""}{trade.profit.toFixed(2)}
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" style={{ color: "var(--text-tertiary)" }} />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-4 pt-6">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-xl disabled:opacity-50" style={{ background: "var(--bg-elevated)" }}>
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-bold font-mono">{currentPage} / {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-xl disabled:opacity-50" style={{ background: "var(--bg-elevated)" }}>
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl border backdrop-blur-xl p-6 shadow-2xl" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
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
              initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
              className="w-[400px] shrink-0 rounded-3xl border backdrop-blur-2xl shadow-2xl sticky top-6 max-h-[calc(100vh-48px)] overflow-y-auto custom-scrollbar"
              style={{ background: "rgba(20,20,20,0.8)", borderColor: "var(--border)" }}
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedTrade && selectedDay && (
                       <button onClick={() => setSelectedTrade(null)} className="p-1.5 -ml-2 rounded-full transition-colors hover:bg-white/10">
                         <ChevronLeft className="w-5 h-5" style={{ color: "var(--text-tertiary)" }} />
                       </button>
                    )}
                    <h3 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display, Syne, sans-serif)" }}>
                      {selectedTrade ? "Trade Details" : "Daily Review"}
                    </h3>
                  </div>
                  <button onClick={() => { setSelectedTrade(null); setSelectedDay(null); }} className="p-2 rounded-full transition-colors hover:bg-white/10 cursor-pointer relative z-50">
                    <X className="w-5 h-5" style={{ color: "var(--text-tertiary)" }} />
                  </button>
                </div>

                {selectedTrade && (
                  <div className="p-4 rounded-2xl border flex flex-col gap-2" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-strong)" }}>
                     <div className="flex items-center justify-between">
                         <div>
                            <div className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>{selectedTrade.pair} • {selectedTrade.direction}</div>
                            <div className="text-xs font-mono mt-1" style={{ color: "var(--text-tertiary)" }}>{new Date(selectedTrade.date).toLocaleString()}</div>
                         </div>
                         <div className="text-right">
                            <div className="text-xl font-black font-mono" style={{ color: selectedTrade.profit > 0 ? "var(--bull)" : "var(--bear)" }}>
                               {selectedTrade.profit > 0 ? "+" : ""}{selectedTrade.profit.toFixed(2)}
                            </div>
                         </div>
                     </div>
                     <button
                        onClick={() => setReplayTradeId(selectedTrade.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 mt-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 font-bold transition-all text-xs tracking-wider"
                     >
                        <Play className="w-4 h-4" /> REPLAY TRADE
                     </button>
                  </div>
                )}

                {selectedDay && !selectedTrade && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border-strong)" }}>
                       <div className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>{selectedDay.dateStr}</div>
                       <div className="text-xs font-mono mt-1" style={{ color: "var(--text-tertiary)" }}>{selectedDay.trades.length} trades recorded</div>
                    </div>
                    {selectedDay.trades.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-tertiary)" }}>Trades on this day</div>
                        {selectedDay.trades.slice(0, 3).map(trade => (
                          <div 
                            key={trade.id}
                            onClick={() => setSelectedTrade(trade)}
                            className="p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:border-[var(--accent)] transition-all group"
                            style={{ background: "var(--bg-card)", borderColor: "var(--border-strong)" }}
                          >
                            <div>
                               <div className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                                 {trade.pair} 
                                 <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5" style={{ color: "var(--text-secondary)" }}>{trade.direction}</span>
                               </div>
                               <div className="text-[10px] font-mono mt-1" style={{ color: "var(--text-tertiary)" }}>{new Date(trade.date).toLocaleTimeString()}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="font-mono text-sm font-bold" style={{ color: trade.profit > 0 ? "var(--bull)" : "var(--bear)" }}>
                                 {trade.profit > 0 ? "+" : ""}{trade.profit.toFixed(2)}
                              </div>
                              <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-tertiary)" }} />
                            </div>
                          </div>
                        ))}
                        
                        <button
                          onClick={() => router.push('/journal/day/' + selectedDay.dateStr)}
                          className="w-full mt-4 py-3 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer relative z-50"
                        >
                          {selectedDay.trades.length > 3 ? `View all ${selectedDay.trades.length} trades` : "Open Full Daily Review"} <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest flex items-center justify-between" style={{ color: "var(--text-tertiary)" }}>
                    <span className="flex items-center gap-2"><Tag size={12} /> Playbook Strategy</span>
                    <button onClick={handleAddStrategy} className="text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus size={10} /> Add New</button>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {strategies.map(s => {
                       const active = entry.strategy?.includes(s);
                       return (
                         <button key={s} onClick={() => toggleStrategy(s)}
                           className="group relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all border hover:scale-105"
                           style={{ 
                             background: active ? "rgba(0,212,161,0.1)" : "transparent", 
                             borderColor: active ? "var(--accent)" : "var(--border)", 
                             color: active ? "var(--accent)" : "var(--text-secondary)" 
                           }}>
                           {s}
                           <div 
                             onClick={(e) => handleDeleteStrategy(s, e)} 
                             className="absolute -top-1.5 -right-1.5 bg-red-500/80 hover:bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                           >
                             <X size={10} />
                           </div>
                         </button>
                       )
                    })}
                  </div>
                </div>

                {availableLessons.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest flex items-center justify-between" style={{ color: "var(--text-tertiary)" }}>
                      <span className="flex items-center gap-2"><BookOpen size={12} /> Linked Lesson</span>
                    </label>
                    <div className="flex flex-col gap-2">
                      <select 
                        value={entry.linkedLessonId || ""} 
                        onChange={(e) => saveEntry({ linkedLessonId: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500/50"
                      >
                        <option value="">-- No Lesson Linked --</option>
                        {availableLessons.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.concept ? `[${l.concept}] ` : ""}{l.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest flex items-center justify-between" style={{ color: "var(--text-tertiary)" }}>
                    <span className="flex items-center gap-2"><TrendingUp size={12} /> Emotional State</span>
                    <button onClick={handleAddEmotion} className="text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus size={10} /> Add New</button>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {emotions.map(e => {
                       const active = entry.emotion === e;
                       return (
                         <button key={e} onClick={() => saveEntry({ emotion: e })}
                           className="group relative flex-1 py-2 rounded-lg text-xs font-bold transition-all border text-center"
                           style={{ 
                             background: active ? "rgba(255,255,255,0.1)" : "transparent", 
                             borderColor: active ? "var(--text-primary)" : "var(--border)", 
                             color: active ? "#fff" : "var(--text-secondary)" 
                           }}>
                           {e}
                           <div 
                             onClick={(ev) => handleDeleteEmotion(e, ev)} 
                             className="absolute -top-1.5 -right-1.5 bg-red-500/80 hover:bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                           >
                             <X size={10} />
                           </div>
                         </button>
                       )
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--text-tertiary)" }}>
                    <FileText size={12} /> Notes & Analysis
                  </label>
                  <textarea
                    value={entry.reason || ""}
                    onChange={(e) => saveEntry({ reason: e.target.value })}
                    placeholder="Why did you take this setup? Did you follow your protocol?"
                    className="w-full h-32 p-4 rounded-xl text-sm resize-none focus:outline-none transition-all"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--text-tertiary)" }}>
                      <ImageIcon size={12} /> Chart Screenshots
                    </label>
                    <div className="flex gap-2">
                       <button onClick={() => setShowScreenshotModal(true)} className="text-xs font-bold flex items-center gap-1 hover:text-[var(--accent)] transition-colors" style={{ color: "var(--text-secondary)" }}>
                         <Camera size={12} /> Auto
                       </button>
                       <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold flex items-center gap-1 hover:text-[var(--accent)] transition-colors" style={{ color: "var(--text-secondary)" }}>
                         <Upload size={12} /> Manual
                       </button>
                       <button onClick={async () => {
                         const url = prompt("Paste TradingView or Image URL:");
                         if (url) {
                           saveEntry({ images: [...(entry.images || []), url] });
                           if (entry.linkedLessonId) {
                             await syncUrlToLesson(url);
                           }
                         }
                       }} className="text-xs font-bold flex items-center gap-1 hover:text-[var(--accent)] transition-colors" style={{ color: "var(--text-secondary)" }}>
                         <ImageIcon size={12} /> Link
                       </button>
                    </div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                  
                  {entry.images && entry.images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {entry.images.map((img, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                          <img src={img} alt="Chart" className="w-full h-24 object-cover cursor-pointer hover:scale-110 transition-transform" onClick={() => window.open(img, "_blank")} />
                          <button onClick={() => {
                            const newImages = [...entry.images!];
                            newImages.splice(i, 1);
                            saveEntry({ images: newImages });
                          }} className="absolute top-1 right-1 p-1.5 bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl border border-dashed text-center text-xs font-bold" style={{ borderColor: "var(--border-strong)", color: "var(--text-tertiary)" }}>
                      No charts attached. Connect TradingView or upload manually.
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
