"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  Clock, 
  Layers, 
  Filter, 
  RefreshCw, 
  Terminal, 
  Play, 
  Pause, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/terminalApi";

export interface ConfluenceEvent {
  id: string;
  symbol: string;
  timestamp: string;
  time_formatted: string;
  time_ago: string;
  session: string;
  timeframe: string;
  factor: string;
  category: "imbalance" | "structure" | "smt" | "liquidity" | "session" | string;
  price_level: number;
  points: number;
  max_points: number;
  status: string;
  description: string;
  score_credit_text?: string;
  score_credit_badge?: string;
  server_confluence_text?: string;
}

export interface PairOverview {
  symbol: string;
  score: number;
  bias: string;
  grade: string;
  state_label: string;
  latest_time: string;
  active_factors: number;
  is_current?: boolean;
}

export interface ScannerTelemetry {
  status: string;
  scanner_engine: string;
  scan_cycle_id: string;
  server_timestamp: string;
  scan_interval_sec: number;
  total_credit_awarded: number;
  active_pair: string;
  logs: string[];
}

export interface ConfluenceLogData {
  success: boolean;
  symbol: string;
  confluence_score: number;
  max_score: number;
  grade: string;
  direction: "BUY" | "SELL" | string;
  regime: string;
  state: string;
  state_label: string;
  latest_confluence_time: string;
  first_confluence_time: string;
  summary: string;
  events: ConfluenceEvent[];
  pairs_overview: PairOverview[];
  scanner_telemetry?: ScannerTelemetry;
}

interface PairConfluenceLogProps {
  currentPair: string;
}

export default function PairConfluenceLog({ currentPair }: PairConfluenceLogProps) {
  const [selectedPair, setSelectedPair] = useState<string>(currentPair.toUpperCase());
  const [data, setData] = useState<ConfluenceLogData | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [autoScan, setAutoScan] = useState<boolean>(true);
  const [scanCountdown, setScanCountdown] = useState<number>(4);
  const [scanCount, setScanCount] = useState<number>(1);
  const [pingLatency, setPingLatency] = useState<number>(14);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showMatrix, setShowMatrix] = useState<boolean>(false);
  const [showTerminal, setShowTerminal] = useState<boolean>(true);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentPair) {
      setSelectedPair(currentPair.toUpperCase());
      setScanCount(1);
    }
  }, [currentPair]);

  const fetchLog = async (sym: string, isBackground: boolean = false) => {
    const startTime = performance.now();
    try {
      if (!isBackground) {
        setInitialLoading(true);
      } else {
        setIsScanning(true);
      }

      const res = await api.get(`/terminal/confluence-log?symbol=${sym}`);
      const duration = Math.round(performance.now() - startTime);
      setPingLatency(duration);

      if (res.data && res.data.success) {
        setData(res.data);
        setScanCount((prev) => prev + 1);

        if (res.data.scanner_telemetry?.logs && res.data.scanner_telemetry.logs.length > 0) {
          const incoming: string[] = res.data.scanner_telemetry.logs;
          setTerminalLogs((prev) => {
            const combined = [...prev, ...incoming];
            const deduped: string[] = [];
            const seen = new Set<string>();
            for (let i = combined.length - 1; i >= 0; i--) {
              const line = combined[i];
              if (!seen.has(line)) {
                seen.add(line);
                deduped.unshift(line);
              }
              if (deduped.length >= 20) break;
            }
            return deduped;
          });
        }
      }
    } catch (e) {
      console.warn("Failed to fetch confluence log:", e);
    } finally {
      if (!isBackground) {
        setInitialLoading(false);
      } else {
        setTimeout(() => setIsScanning(false), 300);
      }
    }
  };

  useEffect(() => {
    fetchLog(selectedPair, false);
    setScanCountdown(4);
  }, [selectedPair]);

  useEffect(() => {
    if (!autoScan) return;

    const timer = setInterval(() => {
      setScanCountdown((prev) => {
        if (prev <= 1) {
          fetchLog(selectedPair, true);
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoScan, selectedPair]);

  useEffect(() => {
    if (terminalBottomRef.current && showTerminal) {
      terminalBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs, showTerminal]);

  const filteredEvents = (data?.events || []).filter((ev) => {
    if (categoryFilter === "all") return true;
    return ev.category === categoryFilter;
  });

  return (
    <section className="bg-[#0e0e11] border border-white/10 rounded-xl p-5 font-mono text-[11px] shadow-lg">
      
      {/* ── TOP BAR: Header & Status ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-white/5 border border-white/10 text-zinc-300">
              <Layers className="w-3.5 h-3.5" />
            </span>
            <h3 className="text-xs font-bold tracking-wider uppercase text-zinc-100 flex items-center gap-2">
              Confluence Event Log &amp; Timeline
            </h3>
            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
              Live Server Telemetry
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">
            Real-time audit of confluence score credits awarded by the broker server for {selectedPair}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {data && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
              <span className="text-[9px] uppercase tracking-wider text-zinc-400">Total Server Credit:</span>
              <span className="text-xs font-bold font-mono text-zinc-100">
                {data.confluence_score}/100
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-zinc-200">
                {data.grade}
              </span>
            </div>
          )}

          <button
            onClick={() => setShowMatrix(!showMatrix)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors text-[9px] uppercase font-bold"
          >
            <Filter className="w-3 h-3" />
            {showMatrix ? "Hide Matrix" : "Compare Pairs"}
          </button>

          <button
            onClick={() => fetchLog(selectedPair, false)}
            className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Force scan now"
          >
            <RefreshCw className={`w-3 h-3 ${isScanning || initialLoading ? "animate-spin text-zinc-200" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── SCANNER CONTROLS STRIP (Calm, Muted, Typography-First) ── */}
      <div className="mb-4 p-2.5 rounded-lg border border-white/8 bg-[#121216] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          {/* Subtle status indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${autoScan ? "bg-emerald-400" : "bg-zinc-600"}`} />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-zinc-300">
              Scanner: {autoScan ? (isScanning ? "Scanning..." : "Active") : "Paused"}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2.5 text-[9px] text-zinc-400 border-l border-white/10 pl-3">
            <span>
              Next query in <strong className="text-zinc-200 font-mono">{autoScan ? `${scanCountdown}s` : "off"}</strong>
            </span>
            <span>&bull;</span>
            <span>Cycle #{scanCount} ({pingLatency}ms)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScan(!autoScan)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition-all"
          >
            {autoScan ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            {autoScan ? "Pause Polling" : "Resume Polling"}
          </button>

          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 text-[9px] uppercase font-bold transition-all"
          >
            <Terminal className="w-2.5 h-2.5 text-zinc-400" />
            Live Text Feed
            {showTerminal ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          </button>
        </div>
      </div>

      {/* ── REAL-TIME SERVER SCANNER TELEMETRY CONSOLE (Calm Dark Monochrome) ── */}
      {showTerminal && (
        <div className="mb-4 rounded-lg border border-white/10 bg-[#08080a] overflow-hidden">
          {/* Header */}
          <div className="bg-[#121216] px-3 py-1.5 border-b border-white/5 flex items-center justify-between text-[8.5px]">
            <span className="font-bold text-zinc-400 flex items-center gap-1.5">
              <Terminal className="w-2.5 h-2.5 text-zinc-400" />
              SERVER SCANNER TELEMETRY STREAM &bull; {selectedPair}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Auto-polling every 4s</span>
              <button
                onClick={() => setTerminalLogs([])}
                className="hover:text-zinc-200 text-zinc-500 p-0.5"
                title="Clear console"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Body: Clean, High Legibility, Calm */}
          <div className="p-3 max-h-44 overflow-y-auto font-mono text-[9.5px] space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
            {terminalLogs.length === 0 ? (
              <div className="text-zinc-500 italic">
                Awaiting server scan response for {selectedPair}...
              </div>
            ) : (
              terminalLogs.map((log, idx) => {
                const isCredit = log.includes("SERVER CREDIT") || log.includes("score credit");
                return (
                  <div
                    key={`${idx}-${log.substring(0, 15)}`}
                    className={`leading-relaxed flex items-start gap-1.5 ${
                      isCredit ? "text-zinc-200" : "text-zinc-400"
                    }`}
                  >
                    <span className="text-zinc-600 select-none">&gt;</span>
                    <span>
                      {log.replace("SERVER CREDIT:", "").trim()}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={terminalBottomRef} />
          </div>
        </div>
      )}

      {/* ── PAIR SELECTOR TABS ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-thin scrollbar-thumb-zinc-800">
        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 shrink-0 mr-1">
          Pair:
        </span>
        {(data?.pairs_overview || [
          { symbol: "XAUUSD", score: 93, bias: "BUY", grade: "A+", latest_time: "14:32 UTC" },
          { symbol: "EURUSD", score: 82, bias: "SELL", grade: "A", latest_time: "13:15 UTC" },
          { symbol: "GBPUSD", score: 84, bias: "BUY", grade: "A", latest_time: "12:50 UTC" },
          { symbol: "BTCUSD", score: 76, bias: "BUY", grade: "B+", latest_time: "10:40 UTC" },
          { symbol: "USDJPY", score: 86, bias: "SELL", grade: "A", latest_time: "09:20 UTC" },
        ]).map((p: any) => {
          const active = selectedPair === p.symbol;
          return (
            <button
              key={p.symbol}
              onClick={() => setSelectedPair(p.symbol)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                active
                  ? "bg-white/10 border-white/20 text-zinc-100 shadow-sm"
                  : "bg-transparent border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/10"
              }`}
            >
              <span className="font-bold">{p.symbol}</span>
              <span className="text-[9px] text-zinc-400">
                {p.score}pts
              </span>
            </button>
          );
        })}
      </div>

      {/* ── CROSS-PAIR COMPARISON (EXPANDABLE) ── */}
      {showMatrix && data?.pairs_overview && (
        <div className="mb-5 rounded-lg border border-white/10 bg-[#121216] p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[9px] text-zinc-400 uppercase font-bold">
            <span>Cross-Pair Confluence Matrix</span>
            <span className="text-zinc-500 font-normal">Broker UTC Synchronization</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[9.5px]">
              <thead>
                <tr className="text-zinc-400 border-b border-white/5">
                  <th className="pb-1.5 font-bold uppercase">Asset</th>
                  <th className="pb-1.5 font-bold uppercase">Bias</th>
                  <th className="pb-1.5 font-bold uppercase">Score</th>
                  <th className="pb-1.5 font-bold uppercase">State</th>
                  <th className="pb-1.5 font-bold uppercase">When Formed</th>
                  <th className="pb-1.5 font-bold uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {data.pairs_overview.map((row) => (
                  <tr key={row.symbol} className="hover:bg-white/5 transition-colors">
                    <td className="py-2 font-bold text-zinc-100 flex items-center gap-1.5">
                      {row.symbol}
                      {row.symbol === currentPair.toUpperCase() && (
                        <span className="text-[8px] px-1 rounded bg-white/10 text-zinc-300">Current</span>
                      )}
                    </td>
                    <td className="py-2 text-zinc-300 font-bold">{row.bias}</td>
                    <td className="py-2 font-bold font-mono text-zinc-200">
                      {row.score}/100 <span className="text-zinc-500 text-[8px]">({row.grade})</span>
                    </td>
                    <td className="py-2 text-zinc-400">{row.state_label}</td>
                    <td className="py-2 text-zinc-400">{row.latest_time}</td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/macro/${row.symbol}`}
                        className="text-[9px] text-zinc-300 hover:text-white underline flex items-center justify-end gap-0.5"
                      >
                        Open <ArrowUpRight className="w-2.5 h-2.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FILTER BUTTONS (Muted Neutral Pills) ── */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        <span className="text-[8.5px] uppercase font-bold text-zinc-400 mr-1">Filter:</span>
        {[
          { id: "all", label: "All Triggers" },
          { id: "imbalance", label: "FVG & Imbalances" },
          { id: "structure", label: "Market Structure (MSS)" },
          { id: "smt", label: "SMT Divergence" },
          { id: "liquidity", label: "Liquidity Sweeps" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setCategoryFilter(f.id)}
            className={`px-2.5 py-1 rounded text-[8.5px] font-bold uppercase transition-all ${
              categoryFilter === f.id
                ? "bg-white/15 text-zinc-100 border border-white/20"
                : "bg-transparent text-zinc-500 border border-white/5 hover:text-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── CHRONOLOGICAL CONFLUENCE TIMELINE (Typography & Text First) ── */}
      {initialLoading ? (
        <div className="py-10 text-center text-zinc-400 flex flex-col items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
          <span>Loading {selectedPair} Confluence Events...</span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-6 rounded-lg border border-dashed border-white/10 text-center text-zinc-500 text-[10px]">
          No confluence events matched this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((ev) => {
            return (
              <div 
                key={ev.id} 
                className="rounded-lg border border-white/8 bg-[#131317] p-4 hover:border-white/15 transition-colors space-y-2.5"
              >
                {/* 1. Header: Factor Title + Clean Score Credit Pill */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
                      {ev.category}
                    </span>
                    <h4 className="text-[12.5px] font-bold text-zinc-100">
                      {ev.factor}
                    </h4>
                  </div>

                  {/* Clean, high-legibility credit amount */}
                  <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-[10px]">
                    <span className="font-bold text-emerald-400">
                      +{ev.points} PTS CREDIT
                    </span>
                    <span className="text-zinc-500">/ {ev.max_points} max</span>
                  </div>
                </div>

                {/* 2. Metadata Strip (Clean text with middle dots) */}
                <div className="flex flex-wrap items-center gap-2 text-[9.5px] text-zinc-400">
                  <span className="flex items-center gap-1 text-zinc-300">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {ev.time_formatted} ({ev.time_ago})
                  </span>
                  <span className="text-zinc-600">&bull;</span>
                  <span>{ev.session}</span>
                  <span className="text-zinc-600">&bull;</span>
                  <span className="text-zinc-300 font-bold">{ev.timeframe}</span>
                  {ev.price_level > 0 && (
                    <>
                      <span className="text-zinc-600">&bull;</span>
                      <span>Level: <strong className="text-zinc-200">{ev.price_level.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</strong></span>
                    </>
                  )}
                  <span className="text-zinc-600">&bull;</span>
                  <span className="text-zinc-400">{ev.status}</span>
                </div>

                {/* 3. The exact Confluence Text from Server (High Contrast, Easy to Read) */}
                <div className="border-l-2 border-emerald-500/60 bg-white/[0.02] px-3 py-2 rounded-r text-[10.5px] text-zinc-200 font-mono leading-relaxed">
                  <span className="text-zinc-400 font-normal">SERVER CONFLUENCE: </span>
                  <strong className="text-zinc-100">
                    {ev.server_confluence_text || `${ev.symbol} +${ev.points} score credit from server: ${ev.factor}`}
                  </strong>
                </div>

                {/* 4. Plain Description */}
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  {ev.description}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[8.5px] text-zinc-500">
        <span>Confluence records continuously polled from broker server engine.</span>
        <span>Active: <strong className="text-zinc-300">{selectedPair}</strong></span>
      </div>
    </section>
  );
}
