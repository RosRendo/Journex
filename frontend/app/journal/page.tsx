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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            Trading Journal
          </h1>
          <p className="text-muted-foreground mt-1">
            Your professional trading history and detailed trade annotations
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refresh()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-secondary text-sm font-medium transition-all hover:scale-105 active:scale-95"
            title="Refresh trades"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-bold transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)] hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:scale-105 active:scale-95"
          >
            <Upload className="w-4 h-4" />
            {showUpload ? "Close Upload" : "Import CSV"}
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Trades", value: analytics?.totalTrades || 0, color: "text-foreground" },
          { label: "Win Rate", value: `${analytics?.winRate.toFixed(1) || 0}%`, color: "text-profit" },
          { label: "Total P&L", value: `$${analytics?.totalProfit.toFixed(2) || "0.00"}`, color: (analytics?.totalProfit || 0) >= 0 ? "text-profit" : "text-loss" },
          { label: "Profit Factor", value: analytics?.profitFactor.toFixed(2) || 0, color: "text-profit" },
          { label: "Avg Win", value: `$${analytics?.avgWin.toFixed(2) || "0.00"}`, color: "text-profit" },
        ].map((stat, i) => (
          <div key={i} className="p-5 bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl shadow-sm hover:shadow-md hover:border-border transition-all group">
            <div className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{stat.label}</div>
            <div className={`text-2xl font-bold mt-2 ${stat.color} tracking-tight`}>
              {stat.value}
            </div>
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
      <div className="flex gap-3 flex-wrap items-center bg-card/60 backdrop-blur-sm p-2 rounded-2xl border border-border/50">
        <div className="flex gap-2 items-center pl-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search symbol..."
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value)}
            className="w-32 lg:w-40 px-3 py-1.5 bg-transparent border-none focus:outline-none focus:ring-0 text-sm"
          />
        </div>
        <div className="h-6 w-px bg-border mx-2 hidden sm:block" />

        <div className="flex gap-1">
          {(["all", "today", "week", "month", "year"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDateFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${dateFilter === d
                ? "bg-primary text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
            >
              {d === "all" ? "All Time" : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-border mx-2 hidden lg:block" />
        <div className="flex gap-1">
          {(["all", "Long", "Short"] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setFilterDirection(dir)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterDirection === dir
                ? "bg-primary text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
            >
              {dir === "all" ? "All Dirs" : dir}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-border mx-2 hidden xl:block" />
        <div className="hidden xl:flex gap-1">
          {(["all", "W", "L", "E"] as const).map((out) => (
            <button
              key={out}
              onClick={() => setFilterOutcome(out)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterOutcome === out
                ? out === "W"
                  ? "bg-profit text-foreground shadow-sm"
                  : out === "L"
                    ? "bg-loss text-foreground shadow-sm"
                    : "bg-primary text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
            >
              {out === "all" ? "All Outcomes" : out === "W" ? "Wins" : out === "L" ? "Losses" : "Break Even"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center pr-2 gap-3">
          <span className="text-xs font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full hidden md:block">
            {filteredTrades.length} / {trades.length} trades
          </span>

          <div className="flex bg-secondary p-1 rounded-xl">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "calendar" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Calendar View"
            >
              <CalendarIcon className="w-4 h-4" />
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
        <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/50 backdrop-blur-md shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/50 border-b border-border/50">
                  <th className="px-5 py-4 text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Date
                  </th>
                  <th className="px-5 py-4 text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Symbol
                  </th>
                  <th className="px-5 py-4 text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Direction
                  </th>
                  <th className="px-5 py-4 text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Entry
                  </th>
                  <th className="px-5 py-4 text-left text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Lot Size
                  </th>
                  <th className="px-5 py-4 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    P&L
                  </th>
                  <th className="px-5 py-4 text-center text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                    Result
                  </th>
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
                  filteredTrades.map((trade: TradeData) => {
                    const hasJournal = !!localStorage.getItem(`journal_${trade.ticket || trade.id}`);
                    return (
                      <tr
                        key={trade.id}
                        onClick={() => setSelectedTrade(trade)}
                        className={`border-b border-border/30 hover:bg-secondary/60 cursor-pointer transition-all ${selectedTrade?.id === trade.id ? "bg-primary/5" : ""
                          }`}
                      >
                        <td className="px-5 py-4 text-sm font-mono whitespace-nowrap">
                          {new Date(trade.date).toLocaleDateString()}
                          <span className="text-muted-foreground ml-2 text-xs">
                            {new Date(trade.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold flex items-center gap-2">
                          {trade.pair}
                          {hasJournal && (
                            <span title="Has journal entry">
                              <FileText className="w-3.5 h-3.5 text-primary opacity-70" />
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide flex items-center w-max gap-1 ${trade.direction === "Long"
                              ? "bg-profit/10 text-profit border border-profit/20"
                              : "bg-loss/10 text-loss border border-loss/20"
                              }`}
                          >
                            {trade.direction === "Long" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {trade.direction}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-mono text-muted-foreground">
                          {trade.entry.toFixed(5)}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium">
                          {trade.lotSize?.toFixed(2) ?? "-"}
                        </td>
                        <td className="px-5 py-4 text-sm text-right font-bold font-mono">
                          <span
                            className={
                              trade.profit >= 0 ? "text-profit drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]" : "text-loss"
                            }
                          >
                            {trade.profit >= 0 ? "+" : ""}${trade.profit.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold shadow-sm ${trade.outcome === "W"
                              ? "bg-profit text-foreground border-b-2 border-green-700"
                              : trade.outcome === "L"
                                ? "bg-loss text-foreground border-b-2 border-red-700"
                                : "bg-muted text-muted-foreground border-b-2 border-border/50"
                              }`}
                          >
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
