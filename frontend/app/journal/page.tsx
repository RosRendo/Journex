"use client";
import { useCsvTrades } from "@/hooks/useCsvTrades";
import type { TradeData } from "@/hooks/useCsvTrades";
import { useMemo, useState, useEffect, useRef } from "react";
import CsvUploadComponent from "@/components/CsvUploadComponent";
import {
  Search,
  Upload,
  RefreshCw,
  X,
  Image as ImageIcon,
  Tag,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  Trash2,
  Save,
  List,
  Calendar as CalendarIcon,
  ChevronLeft,
  Camera,
  Download,
  ChevronRight,
} from "lucide-react";
import { useJournalData } from "@/hooks/useJournalData";
import JournalCalendar from "@/components/JournalCalendar";
import AutoScreenshotModal from "@/components/AutoScreenshotModal";

// Reusable tag component
const TagPill = ({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selected
      ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(59,130,246,0.3)]"
      : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
      }`}
  >
    {label}
  </button>
);

const STRATEGIES = [
  "Trend Following",
  "Breakout",
  "Reversal",
  "SMC",
  "Support / Resistance",
  "Supply / Demand",
  "News Trading",
];

export default function JournalPage() {
  const { trades, analytics, loading, error, refresh } = useCsvTrades();
  const [searchSymbol, setSearchSymbol] = useState("");
  const [filterDirection, setFilterDirection] = useState<"all" | "Long" | "Short">("all");
  const [filterOutcome, setFilterOutcome] = useState<"all" | "W" | "L" | "E">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "year">("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<TradeData | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ dateStr: string; trades: TradeData[] } | null>(null);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // For the side panel
  const tradeIdToUse = selectedTrade ? (selectedTrade.ticket || selectedTrade.id) : (selectedDay ? `day_${selectedDay.dateStr}` : undefined);
  const { entry, saveEntry } = useJournalData(tradeIdToUse?.toString());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sort and filter trades
  const filteredTrades = useMemo(() => {
    let filtered = [...trades].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (searchSymbol) {
      filtered = filtered.filter((t) =>
        t.pair.toUpperCase().includes(searchSymbol.toUpperCase())
      );
    }

    if (filterDirection !== "all") {
      filtered = filtered.filter((t) => t.direction === filterDirection);
    }

    if (filterOutcome !== "all") {
      filtered = filtered.filter((t) => t.outcome === filterOutcome);
    }

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
        if (dateFilter === "month") {
          return d >= new Date(now.getFullYear(), now.getMonth(), 1);
        }
        if (dateFilter === "year") {
          return d >= new Date(now.getFullYear(), 0, 1);
        }
        return true;
      });
    }

    return filtered;
  }, [trades, searchSymbol, filterDirection, filterOutcome]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please use an image under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target?.result as string;
      saveEntry({ images: [...(entry.images || []), base64Str] });
    };
    reader.readAsDataURL(file);
  };

  const toggleStrategy = (strat: string) => {
    // We can store a single strategy or multiple by toggling. Let's do comma separated.
    let current = entry.strategy ? entry.strategy.split(", ") : [];
    if (current.includes(strat)) {
      current = current.filter((s) => s !== strat);
    } else {
      current.push(strat);
    }
    saveEntry({ strategy: current.join(", ") });
  };

  const exportCSV = () => {
    if (!trades.length) return;
    const headers = ["Date", "Symbol", "Direction", "Entry", "Lot Size", "P&L", "Outcome"];
    const rows = filteredTrades.map(t => [
      `"${new Date(t.date).toLocaleString()}"`,
      t.pair,
      t.direction,
      t.entry.toFixed(5),
      t.lotSize?.toFixed(2) ?? "0",
      t.profit.toFixed(2),
      t.outcome
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

  // Pagination logic
  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);
  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTrades.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTrades, currentPage]);
  
  // Reset pagination if filters change
  useEffect(() => { setCurrentPage(1); }, [filteredTrades]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-bold" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
            Trading Journal
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Your professional trading history and detailed trade annotations
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refresh()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold transition-all"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold transition-all"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            <Upload className="w-3.5 h-3.5" />
            {showUpload ? "Close" : "Import CSV"}
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold transition-all text-white hover:opacity-90"
            style={{ background: "var(--bear)" }}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* CSV Upload Panel */}
      {showUpload && (
        <div className="border border-border/50 rounded-2xl overflow-hidden shadow-2xl bg-card/50 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <CsvUploadComponent />
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Trades", value: analytics?.totalTrades || 0, color: "var(--text-primary)" },
          { label: "Win Rate", value: `${(analytics?.winRate || 0).toFixed(1)}%`, color: (analytics?.winRate || 0) >= 50 ? "var(--bull)" : "var(--bear)" },
          { label: "Total P&L", value: `$${(analytics?.totalProfit || 0).toFixed(2)}`, color: (analytics?.totalProfit || 0) >= 0 ? "var(--bull)" : "var(--bear)" },
          { label: "Profit Factor", value: (analytics?.profitFactor || 0).toFixed(2), color: (analytics?.profitFactor || 0) >= 1 ? "var(--bull)" : "var(--bear)" },
          { label: "Avg Win", value: `$${(analytics?.avgWin || 0).toFixed(2)}`, color: "var(--bull)" },
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-tertiary)" }}>{stat.label}</div>
            <div className="text-[22px] font-bold font-mono" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-loss/10 border border-loss/30 rounded-xl text-loss text-sm font-medium flex items-center gap-2">
          <X className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center p-2 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex gap-2 items-center pl-2">
          <Search className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value)}
            className="w-32 lg:w-40 px-3 py-1.5 bg-transparent border-none focus:outline-none focus:ring-0 text-[12px]"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div className="h-5 w-px hidden sm:block" style={{ background: "var(--border)" }} />

        <div className="flex gap-1">
          {(["all", "today", "week", "month", "year"] as const).map((d) => (
            <button key={d} onClick={() => setDateFilter(d)}
              className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={{ background: dateFilter === d ? "var(--accent)" : "transparent", color: dateFilter === d ? "#000" : "var(--text-tertiary)" }}>
              {d === "all" ? "All Time" : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        <div className="h-5 w-px hidden lg:block" style={{ background: "var(--border)" }} />
        <div className="flex gap-1">
          {(["all", "Long", "Short"] as const).map((dir) => (
            <button key={dir} onClick={() => setFilterDirection(dir)}
              className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={{ background: filterDirection === dir ? (dir === "Long" ? "var(--bull)" : dir === "Short" ? "var(--bear)" : "var(--accent)") : "transparent", color: filterDirection === dir ? (dir === "all" ? "#000" : "#fff") : "var(--text-tertiary)" }}>
              {dir === "all" ? "All Dirs" : dir}
            </button>
          ))}
        </div>

        <div className="h-5 w-px hidden xl:block" style={{ background: "var(--border)" }} />
        <div className="hidden xl:flex gap-1">
          {(["all", "W", "L", "E"] as const).map((out) => (
            <button key={out} onClick={() => setFilterOutcome(out)}
              className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={{ background: filterOutcome === out ? (out === "W" ? "var(--bull)" : out === "L" ? "var(--bear)" : "var(--accent)") : "transparent", color: filterOutcome === out ? (out === "all" ? "#000" : "#fff") : "var(--text-tertiary)" }}>
              {out === "all" ? "All" : out === "W" ? "Wins" : out === "L" ? "Losses" : "BE"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center pr-2 gap-3">
          <span className="text-[11px] font-mono hidden md:block" style={{ color: "var(--text-tertiary)" }}>
            {filteredTrades.length}/{trades.length}
          </span>
          <div className="flex p-0.5 rounded-lg gap-0.5" style={{ background: "var(--bg-elevated)" }}>
            <button onClick={() => setViewMode("list")}
              className="p-1.5 rounded-md transition-all"
              style={{ background: viewMode === "list" ? "var(--bg-card)" : "transparent", color: viewMode === "list" ? "var(--text-primary)" : "var(--text-tertiary)" }}>
              <List className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode("calendar")}
              className="p-1.5 rounded-md transition-all"
              style={{ background: viewMode === "calendar" ? "var(--bg-card)" : "transparent", color: viewMode === "calendar" ? "var(--text-primary)" : "var(--text-tertiary)" }}>
              <CalendarIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Trades Table & Calendar */}
      {viewMode === "calendar" ? (
        <JournalCalendar trades={filteredTrades} onDayClick={(dateStr, trades) => {
          setSelectedTrade(null);
          setSelectedDay({ dateStr, trades });
        }} />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
                  {["Date", "Symbol", "Direction", "Entry", "Lot Size", "P&L", "Result"].map((col, ci) => (
                    <th key={col} className={`px-5 py-3 text-[9px] uppercase tracking-widest font-bold ${ci === 5 ? "text-right" : ci === 6 ? "text-center" : "text-left"}`}
                      style={{ color: "var(--text-tertiary)" }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center text-muted-foreground font-medium"
                    >
                      {trades.length === 0
                        ? "No trades yet. Click \"Import CSV\" to upload your broker export."
                        : "No trades match your filters."}
                    </td>
                  </tr>
                ) : (
                  paginatedTrades.map((trade: TradeData) => {
                    const hasJournal = !!localStorage.getItem(`journal_${trade.ticket || trade.id}`);
                    return (
                      <tr key={trade.id} onClick={() => setSelectedTrade(trade)}
                        className="cursor-pointer transition-all"
                        style={{ borderBottom: "1px solid var(--border)", background: selectedTrade?.id === trade.id ? "rgba(0,212,161,0.05)" : "transparent" }}
                        onMouseEnter={(e) => { if (selectedTrade?.id !== trade.id) (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                        onMouseLeave={(e) => { if (selectedTrade?.id !== trade.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <td className="px-5 py-3.5 text-[11px] font-mono whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                          {new Date(trade.date).toLocaleDateString()}
                          <span className="ml-2 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                            {new Date(trade.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                          <span className="flex items-center gap-1.5">
                            {trade.pair}
                            {hasJournal && <FileText className="w-3 h-3" style={{ color: "var(--accent)" }} />}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center w-max gap-1"
                            style={{ background: trade.direction === "Long" ? "rgba(0,200,150,0.1)" : "rgba(255,77,106,0.1)", color: trade.direction === "Long" ? "var(--bull)" : "var(--bear)", border: `1px solid ${trade.direction === "Long" ? "rgba(0,200,150,0.25)" : "rgba(255,77,106,0.25)"}` }}>
                            {trade.direction === "Long" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {trade.direction}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono" style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{trade.entry.toFixed(5)}</td>
                        <td className="px-5 py-3.5 font-mono" style={{ color: "var(--text-secondary)", fontSize: 12 }}>{trade.lotSize?.toFixed(2) ?? "-"}</td>
                        <td className="px-5 py-3.5 text-right font-bold font-mono" style={{ color: trade.profit >= 0 ? "var(--bull)" : "var(--bear)", fontSize: 12 }}>
                          {trade.profit >= 0 ? "+" : ""}${trade.profit.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase"
                            style={{ background: trade.outcome === "W" ? "rgba(0,200,150,0.15)" : trade.outcome === "L" ? "rgba(255,77,106,0.15)" : "rgba(255,255,255,0.06)", color: trade.outcome === "W" ? "var(--bull)" : trade.outcome === "L" ? "var(--bear)" : "var(--text-tertiary)" }}>
                            {trade.outcome === "W" ? "WIN" : trade.outcome === "L" ? "LOSS" : "BE"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
              <span className="text-[11px] font-bold text-[--text-tertiary]">
                Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredTrades.length)} of {filteredTrades.length} trades
              </span>
              <div className="flex gap-2">
                 <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded bg-[--bg-card] border border-[--border] text-[11px] font-bold disabled:opacity-50 hover:bg-[--accent]/10 text-[--text-secondary] flex items-center gap-1">
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                 </button>
                 <span className="px-3 py-1.5 flex items-center text-[12px] font-bold text-[--text-primary] font-mono">
                    {currentPage} / {totalPages}
                 </span>
                 <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded bg-[--bg-card] border border-[--border] text-[11px] font-bold disabled:opacity-50 hover:bg-[--accent]/10 text-[--text-secondary] flex items-center gap-1">
                    Next <ChevronRight className="w-3.5 h-3.5" />
                 </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trade Journal Side Panel Overlay */}
      {(selectedTrade || selectedDay) && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => {
              setSelectedTrade(null);
              setSelectedDay(null);
            }}
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg bg-card h-full border-l border-border/50 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex flex-col border-b border-border/50 bg-secondary/30">
              {selectedTrade && selectedDay && (
                <button
                  onClick={() => setSelectedTrade(null)}
                  className="w-full text-left px-6 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to Daily Overview
                </button>
              )}
              <div className="flex items-center justify-between p-6 pt-4">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    {selectedTrade ? selectedTrade.pair : "Daily Journal"}
                    {selectedTrade && (
                      <span className={`text-base px-2 py-0.5 rounded-md ${selectedTrade.direction === "Long" ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"}`}>
                        {selectedTrade.direction}
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedTrade ? new Date(selectedTrade.date).toLocaleString() : selectedDay?.dateStr}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedTrade(null);
                    setSelectedDay(null);
                  }}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">

              {/* Quick Stats Banner */}
              {selectedTrade ? (
                <div className={`p-4 rounded-xl flex items-center justify-between text-foreground font-bold tracking-wide shadow-inner ${selectedTrade.profit >= 0 ? "bg-gradient-to-r from-green-600 to-profit" : "bg-gradient-to-r from-red-600 to-loss"}`}>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase opacity-80 font-semibold text-foreground/80">Result</span>
                    <span className="text-xl">{selectedTrade.outcome === "W" ? "WIN" : selectedTrade.outcome === "L" ? "LOSS" : "BREAK EVEN"}</span>
                  </div>
                  <div className="text-right flex flex-col text-foreground">
                    <span className="text-xs uppercase opacity-80 font-semibold text-foreground/80">Profit / Loss</span>
                    <span className="text-2xl">${selectedTrade.profit.toFixed(2)}</span>
                  </div>
                </div>
              ) : selectedDay ? (
                <div className={`p-4 rounded-xl flex items-center justify-between text-foreground font-bold tracking-wide shadow-inner ${(selectedDay.trades.reduce((sum, t) => sum + t.profit, 0) || 0) >= 0 ? "bg-gradient-to-r from-green-600 to-profit" : "bg-gradient-to-r from-red-600 to-loss"}`}>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase opacity-80 font-semibold text-foreground/80">Total Trades</span>
                    <span className="text-xl">{selectedDay.trades.length}</span>
                  </div>
                  <div className="text-right flex flex-col text-foreground">
                    <span className="text-xs uppercase opacity-80 font-semibold text-foreground/80">Net Daily P&L</span>
                    <span className="text-2xl">${(selectedDay.trades.reduce((sum, t) => sum + t.profit, 0) || 0).toFixed(2)}</span>
                  </div>
                </div>
              ) : null}

              {/* Day Trades List (Only in Day mode) */}
              {!selectedTrade && selectedDay && selectedDay.trades.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-lg border-b border-border/50 pb-2">
                    <List className="w-5 h-5 text-primary" />
                    Trades from {selectedDay.dateStr}
                    <span className="text-xs font-normal text-muted-foreground ml-2">(Click to journal individually)</span>
                    <button
                      onClick={() => setShowScreenshotModal(true)}
                      className="ml-auto text-xs flex items-center gap-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 px-3 py-1.5 rounded-lg font-bold transition-all"
                    >
                      <Camera className="w-3 h-3" /> Auto-Capture Day
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {selectedDay.trades.map((trade) => {
                      const hasJournal = !!localStorage.getItem(`journal_${trade.ticket || trade.id}`);
                      return (
                        <div
                          key={trade.id}
                          onClick={() => setSelectedTrade(trade)}
                          className={`flex items-center justify-between p-3 rounded-xl border border-border/50 cursor-pointer transition-all ${trade.profit >= 0 ? "bg-profit/5 hover:bg-profit/10" : "bg-loss/5 hover:bg-loss/10"}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold w-12 text-center ${trade.direction === "Long" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"}`}>
                              {trade.direction}
                            </span>
                            <span className="font-bold text-sm">{trade.pair}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {hasJournal && (
                              <span title="Has Journal">
                                <FileText className="w-3.5 h-3.5 text-primary" />
                              </span>
                            )}
                            <span className={`font-mono text-sm font-bold ${trade.profit >= 0 ? "text-profit" : "text-loss"}`}>
                              {trade.profit >= 0 ? "+" : ""}${trade.profit.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Strategies Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-semibold text-lg border-b border-border/50 pb-2">
                  <Tag className="w-5 h-5 text-primary" />
                  Strategies Used
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {STRATEGIES.map((strat) => {
                    const currentStrats = entry.strategy ? entry.strategy.split(", ") : [];
                    const isSelected = currentStrats.includes(strat);
                    return (
                      <TagPill
                        key={strat}
                        label={strat}
                        selected={isSelected}
                        onClick={() => toggleStrategy(strat)}
                      />
                    );
                  })}
                </div>
                <div className="pt-2">
                  <input
                    type="text"
                    placeholder="Or type a custom strategy (e.g., Pullback)..."
                    value={entry.strategy || ""}
                    onChange={(e) => saveEntry({ strategy: e.target.value })}
                    className="w-full bg-secondary/50 border border-border/50 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Reason & Lessons Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-semibold text-lg border-b border-border/50 pb-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Reason & Edge
                </div>
                <textarea
                  placeholder={selectedTrade ? "Why did you take this trade? What did you do well? What could you improve?" : "How was today's trading? Did you follow your rules? What's your overall feel for the day?"}
                  value={entry.reason || ""}
                  onChange={(e) => saveEntry({ reason: e.target.value })}
                  rows={5}
                  className="w-full bg-secondary/30 border border-border/50 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none font-medium leading-relaxed"
                />
              </div>

              {/* Emotion & Plan Compliance Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-semibold text-lg border-b border-border/50 pb-2">
                  <span>🧠</span> Mind State &amp; Discipline
                </div>

                {/* Emotion Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Emotional State</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "😌 Calm", value: "Calm", active: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.4)", text: "#22c55e" },
                      { label: "💪 Confident", value: "Confident", active: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.4)", text: "#3b82f6" },
                      { label: "😰 Anxious", value: "Anxious", active: "rgba(234,179,8,0.15)", border: "rgba(234,179,8,0.4)", text: "#eab308" },
                      { label: "😱 Panicked", value: "Panicked", active: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)", text: "#ef4444" },
                      { label: "🤑 Greedy", value: "Greedy", active: "rgba(249,115,22,0.15)", border: "rgba(249,115,22,0.4)", text: "#f97316" },
                      { label: "🔥 Revenge", value: "Revenge", active: "rgba(220,38,38,0.2)", border: "rgba(220,38,38,0.5)", text: "#dc2626" },
                    ].map((em) => (
                      <button
                        key={em.value}
                        onClick={() => saveEntry({ emotion: entry.emotion === em.value ? undefined : em.value })}
                        className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                        style={{
                          background: entry.emotion === em.value ? em.active : "transparent",
                          border: `1px solid ${entry.emotion === em.value ? em.border : "var(--border)"}`,
                          color: entry.emotion === em.value ? em.text : "var(--text-tertiary)",
                        }}
                      >
                        {em.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Followed Plan */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Did you follow your plan?</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => saveEntry({ followedPlan: true, planDeviationReason: "" })}
                      className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: entry.followedPlan === true ? "rgba(34,197,94,0.2)" : "transparent",
                        border: `1px solid ${entry.followedPlan === true ? "rgba(34,197,94,0.5)" : "var(--border)"}`,
                        color: entry.followedPlan === true ? "#22c55e" : "var(--text-tertiary)",
                      }}
                    >
                      ✓ Yes
                    </button>
                    <button
                      onClick={() => saveEntry({ followedPlan: false })}
                      className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: entry.followedPlan === false ? "rgba(239,68,68,0.2)" : "transparent",
                        border: `1px solid ${entry.followedPlan === false ? "rgba(239,68,68,0.5)" : "var(--border)"}`,
                        color: entry.followedPlan === false ? "#ef4444" : "var(--text-tertiary)",
                      }}
                    >
                      ✗ No — I deviated
                    </button>
                  </div>
                  {entry.followedPlan === false && (
                    <textarea
                      placeholder="Why did you deviate? Be honest — this data will save you money later."
                      value={entry.planDeviationReason || ""}
                      onChange={(e) => saveEntry({ planDeviationReason: e.target.value })}
                      rows={3}
                      className="w-full rounded-xl p-3 text-sm resize-none focus:outline-none transition-all"
                      style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--text-primary)" }}
                    />
                  )}
                </div>
              </div>

              {/* Pictures / Screenshots */}
              <div className="space-y-4 pb-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2 font-semibold text-lg">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    Chart Screenshots
                  </div>
                  <div className="flex gap-2">
                    {selectedTrade && (
                      <button
                        onClick={() => setShowScreenshotModal(true)}
                        className="text-xs flex items-center gap-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 px-3 py-1.5 rounded-lg font-bold transition-all shadow-[0_0_10px_rgba(139,92,246,0.1)] hover:shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Auto-Capture MT5
                      </button>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg font-bold transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload
                    </button>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>

                {(!entry.images || entry.images.length === 0) ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border/60 rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/30 hover:border-primary/50 transition-all cursor-pointer group"
                  >
                    <div className="bg-secondary p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6 opacity-60 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-medium">Click to upload strategy screenshots, or use Auto-Capture</p>
                    <p className="text-xs opacity-60 mt-1">(Max 2MB per image)</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {entry.images.map((img, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-border/50 shadow-md">
                        <img src={img} alt={`Trade screenshot ${idx + 1}`} className="w-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => {
                              const newImages = [...entry.images];
                              newImages.splice(idx, 1);
                              saveEntry({ images: newImages });
                            }}
                            className="bg-red-500/90 text-foreground p-3 rounded-full hover:bg-red-600 hover:scale-110 transition-all"
                            title="Delete screenshot"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/50 bg-secondary/20 flex justify-end">
              <button
                onClick={() => {
                  setSelectedTrade(null);
                  setSelectedDay(null);
                }}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-primary/20 hover:shadow-primary/40 active:scale-95"
              >
                <Save className="w-4 h-4" />
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Screenshot Modal — single trade */}
      {showScreenshotModal && selectedTrade && (
        <AutoScreenshotModal
          trades={[{
            pair: selectedTrade.pair,
            date: selectedTrade.date,
            openTime: selectedTrade.openTime,
            entry: selectedTrade.entry,
            closePrice: selectedTrade.closePrice,
            direction: selectedTrade.direction,
          }]}
          title={`Chart — ${selectedTrade.pair} (${selectedTrade.direction})`}
          onCapture={(base64) => {
            saveEntry({ images: [...(entry.images || []), base64] });
          }}
          onClose={() => setShowScreenshotModal(false)}
        />
      )}

      {/* Auto Screenshot Modal — full day (calendar) */}
      {showScreenshotModal && !selectedTrade && selectedDay && (
        <AutoScreenshotModal
          trades={selectedDay.trades.map(t => ({
            pair: t.pair,
            date: t.date,
            openTime: t.openTime,
            entry: t.entry,
            closePrice: t.closePrice,
            direction: t.direction,
          }))}
          title={`Day Capture — ${selectedDay.dateStr}`}
          onCapture={(base64) => {
            saveEntry({ images: [...(entry.images || []), base64] });
          }}
          onClose={() => setShowScreenshotModal(false)}
        />
      )}
    </div>
  );
}
