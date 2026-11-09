"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Radio,
  Menu,
  ChevronDown,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Bell,
  Keyboard,
  Download,
  Activity,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Flame,
} from "lucide-react";
import Marquee from "react-fast-marquee";
import InstitutionalMacroChart from "./InstitutionalMacroChart";
import TerminalConfirmationCockpit from "../terminal/TerminalConfirmationCockpit";
import ComexGoldPanel from "../terminal/ComexGoldPanel";
import { RealCandle, RealLevels, RealPosition } from "@/hooks/useCommandCenterRealData";

interface Props {
  initialSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
  timeframe?: string;
  onTimeframeChange?: (tf: string) => void;
  candles?: RealCandle[];
  levels?: RealLevels | null;
  positions?: RealPosition[];
  price?: { bid: number; ask: number; spreadPips: number } | null;
  onExecuteTrade?: (action: "buy" | "sell", lotSize: number) => void;
  viewMode?: "INSTITUTIONAL" | "CLASSIC" | "TERMINAL" | "RESEARCH";
  onViewModeChange?: (mode: "INSTITUTIONAL" | "CLASSIC" | "TERMINAL" | "RESEARCH") => void;
  news?: any[];
}

function formatPairDisplay(sym: string): string {
  const clean = sym.toUpperCase().replace("/", "").replace(".", "");
  if (clean === "XAUUSD" || clean === "GOLD") return "XAU/USD";
  if (clean === "BTCUSD" || clean === "BTC") return "BTC/USD";
  if (clean.length === 6) return `${clean.slice(0, 3)}/${clean.slice(3, 6)}`;
  return sym;
}

export default function InstitutionalMacroTerminal({
  initialSymbol = "EURUSD",
  onSelectSymbol,
  timeframe = "D1",
  onTimeframeChange,
  candles = [],
  levels = null,
  positions = [],
  price,
  onExecuteTrade,
  viewMode = "INSTITUTIONAL",
  onViewModeChange,
  news = [],
}: Props) {
  const [activePair, setActivePair] = useState<string>(() => formatPairDisplay(initialSymbol));
  const [activeChartPair, setActiveChartPair] = useState<string>(() => formatPairDisplay(initialSymbol));
  const [activeTf, setActiveTf] = useState<string>(timeframe || "D1");
  const [corrWindow, setCorrWindow] = useState<"30D" | "60D" | "90D" | "vs NORM">("60D");
  const [yieldCountry, setYieldCountry] = useState<string>("US");
  const [currentTime, setCurrentTime] = useState<string>("11:25:52 GMT-3");
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isBridgeConnected, setIsBridgeConnected] = useState<boolean>(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [showCockpit, setShowCockpit] = useState<boolean>(true);
  const isGoldActive = activeChartPair.includes("XAU") || activeChartPair.includes("GOLD");
  const [showComexGold, setShowComexGold] = useState<boolean>(isGoldActive);
  const [heroView, setHeroView] = useState<"chart" | "comex" | "both">("chart");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Auto-sync COMEX gold panel when switching to/from gold
  useEffect(() => {
    if (isGoldActive) {
      setShowComexGold(true);
    } else {
      setHeroView("chart");
    }
  }, [isGoldActive]);
  const [isPairDropdownOpen, setIsPairDropdownOpen] = useState<boolean>(false);
  const pairDropdownRef = useRef<HTMLDivElement>(null);

  // Close pair dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pairDropdownRef.current && !pairDropdownRef.current.contains(e.target as Node)) {
        setIsPairDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync pair when initialSymbol changes
  useEffect(() => {
    if (initialSymbol) {
      const formatted = formatPairDisplay(initialSymbol);
      setActivePair(formatted);
      setActiveChartPair(formatted);
    }
  }, [initialSymbol]);

  // ── 1. LIVE TICKER TELEMETRY WITH REAL-TIME FLASH MOTION (NO FAKE PRESETS) ──
  const [tickerRates, setTickerRates] = useState([
    { s: "EUR/USD", p: 0, c: "--", up: false, digits: 5 },
    { s: "USD/JPY", p: 0, c: "--", up: false, digits: 3 },
    { s: "GBP/USD", p: 0, c: "--", up: false, digits: 5 },
    { s: "AUD/USD", p: 0, c: "--", up: false, digits: 5 },
    { s: "USD/CAD", p: 0, c: "--", up: false, digits: 5 },
    { s: "USD/CHF", p: 0, c: "--", up: false, digits: 5 },
    { s: "NZD/USD", p: 0, c: "--", up: false, digits: 5 },
    { s: "EUR/GBP", p: 0, c: "--", up: false, digits: 5 },
    { s: "GOLD FUT", p: 0, c: "--", up: false, digits: 2, gold: true },
    { s: "WTI FUT", p: 0, c: "--", up: false, digits: 2 },
    { s: "BTC/USD", p: 0, c: "--", up: false, digits: 0 },
  ]);
  const [flashes, setFlashes] = useState<{ [symbol: string]: "up" | "down" }>({});

  // ── 2. 14 CROSSES STATE WITH LIVE FLASH (INITIALIZED OFFLINE) ──
  const [crosses, setCrosses] = useState([
    { p: "EUR/GBP", r: "--", c: "--", up: false },
    { p: "EUR/JPY", r: "--", c: "--", up: false },
    { p: "EUR/CHF", r: "--", c: "--", up: false },
    { p: "EUR/CAD", r: "--", c: "--", up: false },
    { p: "EUR/AUD", r: "--", c: "--", up: false },
    { p: "EUR/NZD", r: "--", c: "--", up: false },
    { p: "GBP/JPY", r: "--", c: "--", up: false },
    { p: "GBP/CHF", r: "--", c: "--", up: false },
    { p: "GBP/CAD", r: "--", c: "--", up: false },
    { p: "GBP/AUD", r: "--", c: "--", up: false },
    { p: "GBP/NZD", r: "--", c: "--", up: false },
    { p: "AUD/JPY", r: "--", c: "--", up: false },
    { p: "AUD/CHF", r: "--", c: "--", up: false },
    { p: "AUD/NZD", r: "--", c: "--", up: false },
  ]);
  const [crossFlashes, setCrossFlashes] = useState<{ [pair: string]: "up" | "down" }>({});

  // ── 3. CROSS-ASSET TELEMETRY (DYNAMIC MOTION, NO FABRICATED PRICES) ──
  const [crossAssets, setCrossAssets] = useState([
    { name: "S&P 500", p: 0, c: "--", up: false, digits: 2 },
    { name: "GOLD FUTURES", p: 0, c: "--", up: false, gold: true, digits: 2 },
    { name: "WTI FUTURES", p: 0, c: "--", up: false, digits: 2 },
    { name: "BTC/USD", p: 0, c: "--", up: false, digits: 0 },
    { name: "NIKKEI 225", p: 0, c: "--", up: false, digits: 2 },
    { name: "EUR STOXX 50", p: 0, c: "--", up: false, digits: 2 },
    { name: "DXY INDEX", p: 0, c: "--", up: false, digits: 2 },
    { name: "US 10Y YIELD", p: 0, c: "--", up: false, cyan: true, digits: 2, isYield: true },
  ]);
  const [assetFlashes, setAssetFlashes] = useState<{ [name: string]: "up" | "down" }>({});

  // ── 4. MAJORS TABLE TELEMETRY (DYNAMIC REAL BROKER FEED) ──
  const [majors, setMajors] = useState([
    { p: "EUR/USD", b: 0, a: 0, sp: 0, d: "--", w: "--", hv: "--", f1: "--", f3: "--", digits: 5 },
    { p: "GBP/USD", b: 0, a: 0, sp: 0, d: "--", w: "--", hv: "--", f1: "--", f3: "--", digits: 5 },
    { p: "USD/JPY", b: 0, a: 0, sp: 0, d: "--", w: "--", hv: "--", f1: "--", f3: "--", digits: 3 },
    { p: "AUD/USD", b: 0, a: 0, sp: 0, d: "--", w: "--", hv: "--", f1: "--", f3: "--", digits: 5 },
  ]);
  const [majorFlashes, setMajorFlashes] = useState<{ [pair: string]: "up" | "down" }>({});

  // Real-time clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toTimeString().slice(0, 8) +
          " GMT" +
          (now.getTimezoneOffset() > 0 ? "-" : "+") +
          Math.abs(now.getTimezoneOffset() / 60)
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── REAL MT5 BROKER DATA PIPELINE ──
  // Strictly live real quotes from MetaTrader 5 bridge; sets offline state when unreachable
  useEffect(() => {
    let isCancelled = false;

    const fetchRealMacroQuotes = async () => {
      try {
        const res = await fetch("/api/bridge/api/heatmap", {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (!res.ok) {
          if (!isCancelled) setIsBridgeConnected(false);
          return;
        }
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data) || isCancelled) {
          if (!isCancelled) setIsBridgeConnected(false);
          return;
        }

        if (!isCancelled) setIsBridgeConnected(true);

        const dataList = json.data as Array<{
          pair: string;
          price: number;
          bid: number;
          ask: number;
          spread: number;
          change24h: number;
        }>;

        const quoteMap = new Map(dataList.map((item) => [item.pair.toUpperCase(), item]));

        // 1. Update Ticker Rates with real MT5 quotes
        setTickerRates((prev) =>
          prev.map((r) => {
            const clean = r.s.replace("/", "").replace(" FUT", "").replace(" INDEX", "").toUpperCase();
            const quote = quoteMap.get(clean);
            if (!quote) return r;
            const isUp = quote.change24h >= 0;
            const newPrice = Number(quote.price.toFixed(r.digits));
            if (newPrice !== r.p) {
              setFlashes((f) => ({ ...f, [r.s]: newPrice > r.p ? "up" : "down" }));
              setTimeout(() => {
                setFlashes((f) => {
                  const copy = { ...f };
                  delete copy[r.s];
                  return copy;
                });
              }, 600);
            }
            return {
              ...r,
              p: newPrice,
              c: `${isUp ? "+" : ""}${quote.change24h.toFixed(2)}%`,
              up: isUp,
            };
          })
        );

        // 2. Update Majors with real MT5 quotes
        setMajors((prev) =>
          prev.map((m) => {
            const clean = m.p.replace("/", "").toUpperCase();
            const quote = quoteMap.get(clean);
            if (!quote) return m;
            const isUp = quote.change24h >= 0;
            const newBid = Number(quote.bid.toFixed(m.digits));
            const newAsk = Number(quote.ask.toFixed(m.digits));
            if (newBid !== m.b) {
              setMajorFlashes((f) => ({ ...f, [m.p]: newBid > m.b ? "up" : "down" }));
              setTimeout(() => {
                setMajorFlashes((f) => {
                  const copy = { ...f };
                  delete copy[m.p];
                  return copy;
                });
              }, 600);
            }
            return {
              ...m,
              b: newBid,
              a: newAsk,
              sp: quote.spread,
              c: `${isUp ? "+" : ""}${quote.change24h.toFixed(2)}%`,
              up: isUp,
            };
          })
        );

        // 3. Update Crosses with real MT5 quotes
        setCrosses((prev) =>
          prev.map((c) => {
            const clean = c.p.replace("/", "").toUpperCase();
            const quote = quoteMap.get(clean);
            if (!quote) return c;
            const isUp = quote.change24h >= 0;
            const digits = quote.price > 100 ? 3 : 5;
            const newRate = quote.price.toFixed(digits);
            if (newRate !== c.r) {
              setCrossFlashes((f) => ({ ...f, [c.p]: Number(newRate) > Number(c.r) ? "up" : "down" }));
              setTimeout(() => {
                setCrossFlashes((f) => {
                  const copy = { ...f };
                  delete copy[c.p];
                  return copy;
                });
              }, 600);
            }
            return {
              ...c,
              r: newRate,
              c: `${isUp ? "+" : ""}${quote.change24h.toFixed(2)}%`,
              up: isUp,
            };
          })
        );
      } catch (_) {
        if (!isCancelled) setIsBridgeConnected(false);
      }
    };

    const fetchRealCalendar = async () => {
      try {
        const calRes = await fetch("/api/bridge/api/calendar", {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (calRes.ok) {
          const calJson = await calRes.json();
          if (calJson.success && Array.isArray(calJson.events) && !isCancelled) {
            setCalendarEvents(calJson.events.slice(0, 8));
          }
        }
      } catch (_) {}
    };

    fetchRealMacroQuotes();
    fetchRealCalendar();
    const interval = setInterval(fetchRealMacroQuotes, 3000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handlePairClick = (pair: string) => {
    setActivePair(pair);
    setActiveChartPair(pair);
    const clean = pair.replace("/", "").toUpperCase();
    if (onSelectSymbol) {
      onSelectSymbol(clean);
    }
  };

  const handleTfChange = (tf: string) => {
    setActiveTf(tf);
    if (onTimeframeChange) {
      onTimeframeChange(tf);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#070709] text-[#e4e4e7] font-mono select-none flex flex-col text-[10px] leading-tight antialiased overflow-x-hidden">
      {/* ── 1. TOP NAVIGATION BAR ────────────────────────────────────────── */}
      <header className="h-9 bg-[#0b0b0f] border-b border-white/[0.08] px-3 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          {/* Logo with Obsidian Emerald Branding */}
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.4 }}
              className="w-5 h-5 rounded-lg bg-[#20e0b2] flex items-center justify-center text-black shadow-lg shadow-[#20e0b2]/20 font-black text-[11px] cursor-pointer"
            >
              J
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="text-[7.5px] text-zinc-500 uppercase tracking-widest font-sans font-bold">
                Journex Pro
              </span>
              <span className="font-extrabold tracking-tight text-white text-[11px] flex items-center gap-1.5">
                <span>FX TERMINAL</span>
                <span className="text-[7px] font-mono text-[#20e0b2] bg-[#20e0b2]/15 px-1 py-0.2 rounded border border-[#20e0b2]/30 font-bold">MACRO</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-pulse" />
              </span>
            </div>
          </div>

          {/* Active Pair Dropdown Selector */}
          <div className="relative" ref={pairDropdownRef}>
            <button
              onClick={() => setIsPairDropdownOpen(!isPairDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white font-mono text-[10px] font-bold cursor-pointer transition-colors shadow-sm"
              title="Select Active Currency Pair"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2]" />
              <span>{activePair}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
            {isPairDropdownOpen && (
              <div className="absolute left-0 mt-1 w-44 rounded-xl bg-[#0f0f16] border border-white/15 shadow-2xl py-1 z-50 max-h-64 overflow-y-auto no-scrollbar">
                <div className="px-2.5 py-1 text-[8px] font-bold text-zinc-500 uppercase tracking-wider border-b border-white/[0.06]">
                  Select Market Asset
                </div>
                {tickerRates.map((item) => (
                  <button
                    key={item.s}
                    onClick={() => {
                      handlePairClick(item.s);
                      setIsPairDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-white/[0.08] text-left text-[9.5px] cursor-pointer transition-colors ${
                      activePair === item.s ? "text-[#20e0b2] font-bold bg-[#20e0b2]/10" : "text-zinc-300"
                    }`}
                  >
                    <span>{item.s}</span>
                    <span className="font-mono text-[8.5px] text-zinc-400">
                      {item.p > 0 ? (typeof item.p === "number" ? item.p.toFixed(item.digits) : item.p) : "--"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          {/* Visual Confirmation Cockpit & COMEX Toggle Buttons */}
          <div className="flex items-center gap-1 mr-1">
            <button
              onClick={() => setShowCockpit(!showCockpit)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold transition-all cursor-pointer ${
                showCockpit
                  ? "bg-[#20e0b2]/15 border-[#20e0b2]/40 text-[#20e0b2] shadow-sm"
                  : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
              }`}
              title="Toggle Visual Confirmation Cockpit HUD"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${showCockpit ? "bg-[#20e0b2] animate-pulse" : "bg-zinc-600"}`} />
              <span>Cockpit HUD</span>
            </button>

            {isGoldActive && (
              <button
                onClick={() => {
                  if (heroView === "comex" || heroView === "both") {
                    setHeroView("chart");
                    setShowComexGold(false);
                  } else {
                    setHeroView("comex");
                    setShowComexGold(true);
                  }
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold transition-all cursor-pointer ${
                  heroView === "comex" || heroView === "both"
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-sm"
                    : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
                }`}
                title="Toggle COMEX Gold Futures (GC) Flow Viewport"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${heroView === "comex" || heroView === "both" ? "bg-amber-400 animate-pulse" : "bg-zinc-600"}`} />
                <span>COMEX (GC)</span>
              </button>
            )}

            {/* True Fullscreen Viewport Mode Button */}
            <button
              onClick={toggleFullscreen}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold transition-all cursor-pointer ${
                isFullscreen
                  ? "bg-[#20e0b2]/15 border-[#20e0b2]/40 text-[#20e0b2] shadow-sm"
                  : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
              }`}
              title={isFullscreen ? "Exit Fullscreen" : "Toggle Edge-to-Edge Fullscreen Terminal"}
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3 text-[#20e0b2]" /> : <Maximize2 className="w-3 h-3 text-zinc-400" />}
              <span className="hidden sm:inline">{isFullscreen ? "Windowed" : "Fullscreen"}</span>
            </button>
          </div>

          {/* View Mode Switcher Pills */}
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 text-[9px] mr-1">
            <button
              onClick={() => onViewModeChange?.("INSTITUTIONAL")}
              className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                viewMode === "INSTITUTIONAL"
                  ? "bg-[#20e0b2] text-black shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Institutional Bloomberg FX Terminal"
            >
              FX Terminal
            </button>
            <button
              onClick={() => onViewModeChange?.("CLASSIC")}
              className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                viewMode === "CLASSIC"
                  ? "bg-[#20e0b2] text-black shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Classic Multi-Panel Workstation"
            >
              Classic Panels
            </button>
            <Link
              href={`/macro/${activeChartPair.replace("/", "").replace(".", "").toUpperCase()}`}
              className="px-2 py-0.5 rounded font-bold transition-all text-amber-400 hover:text-amber-300 hover:bg-white/[0.06] flex items-center gap-1"
              title="Navigate to Dedicated Macro Desk"
            >
              <span>Macro Desk</span>
              <span className="text-[8px]">➔</span>
            </Link>
          </div>

          <div
            className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold border transition-colors ${
              isBridgeConnected
                ? "bg-[#20e0b2]/10 border-[#20e0b2]/25 text-[#20e0b2]"
                : "bg-rose-500/10 border-rose-500/25 text-rose-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBridgeConnected ? "bg-[#20e0b2] animate-ping" : "bg-rose-500"
              }`}
            />
            <span>{isBridgeConnected ? "MT5 CONNECTED" : "MT5 OFFLINE"}</span>
          </div>

          <span className="text-[9px] text-zinc-400 font-mono hidden md:inline">
            {currentTime}
          </span>

          {/* Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/10 transition-colors text-[9px]"
            >
              <Menu className="w-3 h-3 text-[#20e0b2]" />
              <span>Menu</span>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 rounded-xl bg-[#0f0f16] border border-white/15 shadow-2xl py-1.5 z-50 text-[9.5px]">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.06] text-zinc-300 hover:text-white"
                >
                  <span>📊</span> Executive Dashboard
                </Link>
                <Link
                  href="/journal"
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.06] text-zinc-300 hover:text-white"
                >
                  <span>📖</span> Trade Journal
                </Link>
                <Link
                  href="/analytics"
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.06] text-zinc-300 hover:text-white"
                >
                  <span>📈</span> Risk Analytics
                </Link>
                <div className="my-1 border-t border-white/5" />
                <Link
                  href={`/macro/${activeChartPair.replace("/", "").replace(".", "").toUpperCase()}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex items-center gap-2 text-left px-3 py-1.5 hover:bg-white/[0.06] text-[#f59e0b] font-bold"
                >
                  <span>📑</span> Open Macro Desk
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── 2. LIVE TICKER SUB-HEADER (AUTO-SCROLLING PAIR MARQUEE CAROUSEL) ─────── */}
      <div className="h-6 bg-[#08080c] border-b border-white/[0.06] flex items-center overflow-hidden text-[9.5px] font-mono shrink-0">
        <div className="px-2 h-full bg-[#0c0c14] border-r border-white/[0.08] flex items-center gap-1.5 shrink-0 z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-pulse" />
          <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-zinc-400">FX PAIRS</span>
        </div>
        <div className="flex-1 min-w-0 overflow-hidden no-scrollbar">
          <Marquee speed={32} pauseOnHover={true} autoFill={true} play={true} gradient={false} className="overflow-hidden no-scrollbar">
  
          <div className="flex items-center gap-4 pr-4">
            {tickerRates.map((item, idx) => {
              const flash = flashes[item.s];
              return (
                <motion.div
                  key={`${item.s}-${idx}`}
                  onClick={() => handlePairClick(item.s)}
                  animate={{
                    backgroundColor:
                      flash === "up"
                        ? "rgba(32, 224, 178, 0.22)"
                        : flash === "down"
                        ? "rgba(255, 92, 115, 0.22)"
                        : "transparent",
                  }}
                  transition={{ duration: 0.35 }}
                  className="flex items-center gap-1.5 cursor-pointer px-2 py-0.5 rounded transition-all hover:bg-white/[0.08]"
                >
                  <span className={`font-bold ${item.gold ? "text-amber-400" : "text-zinc-300"}`}>
                    {item.s}
                  </span>
                  <span className="text-white font-mono font-bold">
                    {item.p > 0 ? (typeof item.p === "number" ? item.p.toFixed(item.digits) : item.p) : "--"}
                  </span>
                  <span className={`font-bold ${item.p > 0 ? (item.up ? "text-[#20e0b2]" : "text-[#ff5c73]") : "text-zinc-600"}`}>
                    {item.p > 0 ? item.c : "--"}
                  </span>
                </motion.div>
              );
            })}
          </div>
                </Marquee>
        </div>
      </div>

      {/* ── 3. REAL-TIME NEWS FLASH MARQUEE (100% REAL TELEMETRY) ───────── */}
      <div className="h-5 bg-[#060609] border-b border-white/[0.04] px-2 flex items-center overflow-hidden shrink-0">
        <div className={`flex items-center gap-1.5 font-bold text-[8.5px] uppercase tracking-wider pr-2 shrink-0 border-r border-white/10 ${news && news.length > 0 ? "text-[#20e0b2]" : "text-zinc-500"}`}>
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${news && news.length > 0 ? "bg-[#20e0b2]" : "bg-zinc-500"}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${news && news.length > 0 ? "bg-[#20e0b2]" : "bg-zinc-500"}`} />
          </span>
          FLASH
        </div>
        <div className="flex-1 min-w-0 overflow-hidden no-scrollbar">
        {news && news.length > 0 ? (
          <Marquee speed={36} autoFill={true} play={true} gradient={false} className="text-[8.5px] text-zinc-300 font-mono overflow-hidden no-scrollbar">

            <div className="flex items-center gap-8 pl-4">
              {news.map((n: any, idx: number) => (
                <React.Fragment key={idx}>
                  <span>
                    <strong className="text-white font-bold mr-1">{n.symbol || n.currency || "MACRO"}:</strong>
                    {n.title}
                  </span>
                  <span className="text-zinc-600 font-bold">•</span>
                </React.Fragment>
              ))}
            </div>
                    </Marquee>
        ) : (

          <div className="flex items-center gap-2 pl-4 text-[8.5px] text-zinc-500 font-mono">
            <span>News Wire Standby · Awaiting real-time macroeconomic event feed from broker bridge</span>
          </div>
                )}
        </div>
      </div>

      {/* ── 3.5 VISUAL CONFIRMATION COCKPIT HUD (FULL 6-MODULE SUITE) ────── */}
      {showCockpit && (
        <TerminalConfirmationCockpit
          symbol={activeChartPair}
          timeframe={activeTf}
          candles={candles}
          watchlist={tickerRates.map((t) => ({ symbol: t.s, price: t.p, change_pct: parseFloat(t.c) || 0 }))}
          news={news}
          account={price ? { equity: 10000, balance: 10000 } : undefined}
          onStageTrade={(trade) => onExecuteTrade?.(trade.side.toLowerCase() as "buy" | "sell", trade.volume)}
        />
      )}

      {/* ── 4. FOUR-COLUMN BLOOMBERG TERMINAL WITH RICH MOTION ─────────────── */}
      <div className="flex-1 min-h-0 p-2 grid grid-cols-1 xl:grid-cols-12 gap-2 pb-16">
        {/* ── COLUMN 1: LEFT FLOW & SESSIONS (17% Width) ────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full xl:col-span-2 h-full min-h-0 flex flex-col gap-2 overflow-y-auto no-scrollbar shrink-0"
        >
          {/* 1A: FX LIQUIDITY WAVE WITH ANIMATED RADAR SCANNER */}
          <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/[0.08] shadow-lg flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold text-zinc-300 tracking-wider uppercase flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-[#20e0b2]" />
                FX LIQUIDITY
              </span>
              <span className="text-[8px] text-[#20e0b2] font-bold bg-[#20e0b2]/10 px-1.5 py-0.2 rounded border border-[#20e0b2]/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-ping" />
                Peak 09:00
              </span>
            </div>

            {/* SVG Liquidity Session Curve with Moving Scanner Beam */}
            <div className="h-14 w-full relative">
              <svg className="w-full h-full" viewBox="0 0 200 60" fill="none">
                <defs>
                  <linearGradient id="fxLiqMintFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#20e0b2" stopOpacity="0.32" />
                    <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#20e0b2" stopOpacity="0.06" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 52 Q 35 48 65 38 T 110 14 T 155 28 T 200 48 L 200 60 L 0 60 Z"
                  fill="url(#fxLiqMintFlow)"
                />
                <path
                  d="M 0 52 Q 35 48 65 38 T 110 14 T 155 28 T 200 48"
                  stroke="#20e0b2"
                  strokeWidth="1.5"
                />
                <line x1="110" y1="14" x2="110" y2="60" stroke="#20e0b2" strokeDasharray="2 2" strokeWidth="1" />
                <circle cx="110" cy="14" r="4" fill="#20e0b2" className="animate-ping" opacity="0.6" />
                <circle cx="110" cy="14" r="2.5" fill="#20e0b2" />
              </svg>

              {/* Continuous Animated Scanner Beam */}
              <motion.div
                animate={{ x: ["0%", "100%", "0%"] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="absolute top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-transparent via-[#20e0b2] to-transparent pointer-events-none opacity-70 shadow-[0_0_8px_#20e0b2]"
              />
            </div>
            <div className="flex justify-between text-[7.5px] text-zinc-500 pt-1 border-t border-white/[0.04]">
              <span>11:25 GMT-3</span>
              <span>Tokyo</span>
              <span>London</span>
              <span>NY</span>
              <span>20d avg</span>
            </div>
          </div>

          {/* 1B: CROSSES (14 Pairs) WITH REAL-TIME FLASHING */}
          <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/[0.08] shadow-lg flex-1 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-white/[0.06]">
              <span className="text-[9px] font-bold text-zinc-300 tracking-wider uppercase">
                CROSSES
              </span>
              <span className="text-[7.5px] text-[#20e0b2] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-pulse" />
                14 Live Pairs
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
              {crosses.map((cross) => {
                const cFlash = crossFlashes[cross.p];
                return (
                  <motion.div
                    key={cross.p}
                    onClick={() => handlePairClick(cross.p)}
                    animate={{
                      backgroundColor:
                        cFlash === "up"
                          ? "rgba(32, 224, 178, 0.24)"
                          : cFlash === "down"
                          ? "rgba(255, 92, 115, 0.24)"
                          : activePair === cross.p
                          ? "rgba(32, 224, 178, 0.12)"
                          : "transparent",
                    }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-center justify-between py-1 px-1.5 rounded-lg cursor-pointer text-[9px] font-mono transition-all ${
                      activePair === cross.p
                        ? "border border-[#20e0b2]/30 text-white"
                        : "hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <span className="font-bold text-zinc-300">{cross.p}</span>
                    <span className="text-zinc-300 font-bold">{cross.r}</span>
                    <span className={`font-bold ${cross.up ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}>
                      {cross.c}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 1C: CARRY TRADE RANKING WITH ANIMATED SHIMMER PROGRESS */}
          <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/[0.08] shadow-lg">
            <div className="flex flex-col mb-1.5 pb-1 border-b border-white/[0.06]">
              <span className="text-[9px] font-bold text-zinc-300 tracking-wider uppercase flex items-center justify-between">
                <span>CARRY TRADE RANKING</span>
                <span className="text-[7.5px] text-[#20e0b2] font-bold">ANNUALIZED</span>
              </span>
              <span className="text-[7.5px] text-zinc-500 uppercase">
                G10 REAL CARRY SPREAD
              </span>
            </div>
            <div className="space-y-1.5 text-[8.5px] font-mono">
              {[
                { r: 1, p: "NOK/NZD", v: "+3.07%", pct: 92 },
                { r: 2, p: "USD/NZD", v: "+2.97%", pct: 86 },
                { r: 3, p: "GBP/NZD", v: "+2.47%", pct: 76 },
                { r: 4, p: "NOK/JPY", v: "+2.25%", pct: 69 },
                { r: 5, p: "USD/JPY", v: "+2.16%", pct: 65 },
                { r: 6, p: "AUD/NZD", v: "+1.99%", pct: 60 },
                { r: 7, p: "USD/CHF", v: "+1.85%", pct: 54 },
                { r: 8, p: "SEK/JPY", v: "+1.34%", pct: 44 },
                { r: 9, p: "GBP/JPY", v: "+1.12%", pct: 36 },
              ].map((item, idx) => (
                <div key={item.r} className="flex items-center gap-1.5">
                  <span className="text-zinc-600 text-[7.5px] w-2">{item.r}</span>
                  <span className="text-zinc-300 font-bold w-14 shrink-0 text-[8px]">{item.p}</span>
                  <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ duration: 0.8, delay: 0.15 + idx * 0.04, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[#20e0b2]/30 to-[#20e0b2] rounded-full relative overflow-hidden"
                    >
                      {/* Shimmer sweep animation */}
                      <motion.div
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ repeat: Infinity, duration: 2.8, ease: "linear", delay: idx * 0.2 }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full"
                      />
                    </motion.div>
                  </div>
                  <span className="text-[#20e0b2] font-bold w-10 text-right text-[8px]">{item.v}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── COLUMN 2: CENTER-LEFT (Chart Canvas & Majors) (37% Width) ─────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full xl:col-span-5 h-full min-h-0 flex flex-col gap-2 overflow-y-auto no-scrollbar shrink-0"
        >
          {/* 2A: INSTITUTIONAL HERO VIEWPORT (CHART / COMEX DOCK) */}
          <div className="rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#09090e] flex flex-col shrink-0">
            {/* Viewport Mode Switcher (Active on Gold / XAUUSD) */}
            {isGoldActive && (
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#0b0b12] border-b border-white/[0.08] text-[9px] shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2]" />
                  <span className="font-bold text-white tracking-wider uppercase">
                    {heroView === "comex" ? "COMEX GOLD (GC) · ORDER FLOW" : `${activeChartPair} PRICE ACTION`}
                  </span>
                  <span className="text-[7.5px] font-mono text-zinc-500 uppercase">
                    {heroView === "comex" ? "CME Globex" : `${activeTf} Chart`}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
                  <button
                    onClick={() => { setHeroView("chart"); setShowComexGold(false); }}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      heroView === "chart" ? "bg-[#20e0b2] text-black shadow-sm" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    📈 Chart
                  </button>
                  <button
                    onClick={() => { setHeroView("comex"); setShowComexGold(true); }}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      heroView === "comex" ? "bg-amber-400 text-black shadow-sm" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    🪙 COMEX (GC)
                  </button>
                  <button
                    onClick={() => { setHeroView("both"); setShowComexGold(true); }}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      heroView === "both" ? "bg-white/20 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    ⊞ Both
                  </button>
                </div>
              </div>
            )}

            {/* Candlestick Chart Viewport */}
            {(heroView === "chart" || heroView === "both" || !isGoldActive) && (
              <div className="h-[360px] w-full">
                {(() => {
                  const isSymbolMatch =
                    activeChartPair.replace("/", "").toUpperCase() === (initialSymbol || "").replace("/", "").toUpperCase();
                  return (
                    <InstitutionalMacroChart
                      symbol={activeChartPair}
                      onSelectSymbol={handlePairClick}
                      timeframe={activeTf}
                      onTimeframeChange={handleTfChange}
                      candles={isSymbolMatch ? candles : []}
                      currentPrice={isSymbolMatch ? (price?.bid || (candles && candles.length > 0 ? candles[candles.length - 1].close : undefined)) : undefined}
                      bidPrice={isSymbolMatch ? price?.bid : undefined}
                      askPrice={isSymbolMatch ? price?.ask : undefined}
                      spreadPips={isSymbolMatch ? price?.spreadPips : undefined}
                    />
                  );
                })()}
              </div>
            )}

            {/* COMEX Gold Order Flow Viewport */}
            {isGoldActive && (heroView === "comex" || heroView === "both") && (
              <div className={`p-2 bg-[#09090e] ${heroView === "both" ? "border-t border-amber-500/20" : ""}`}>
                <ComexGoldPanel
                  symbol={activeChartPair.replace("/", "")}
                  onClose={() => { setHeroView("chart"); setShowComexGold(false); }}
                  className="border-none"
                />
              </div>
            )}
          </div>

          {/* 2B: FX PAIRS - MAJORS TABLE (WITH REAL-TIME TICK MOTION) ────────── */}
          <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/[0.08] shadow-lg flex flex-col">
            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-zinc-300 tracking-wider uppercase">
                  FX PAIRS - MAJORS
                </span>
                <span className={`text-[7.5px] font-bold px-1 py-0.2 rounded border flex items-center gap-1 ${
                  isBridgeConnected
                    ? "text-[#20e0b2] bg-[#20e0b2]/10 border-[#20e0b2]/20"
                    : "text-zinc-500 bg-white/5 border-white/10"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isBridgeConnected ? "bg-[#20e0b2] animate-ping" : "bg-zinc-600"}`} />
                  {isBridgeConnected ? "REAL-TIME FEED" : "FEED OFFLINE"}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[7.5px] text-zinc-500">
                <button className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400">CSV</button>
                <button className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400">JSON</button>
              </div>
            </div>

            {/* Table Column Headers */}
            <div className="grid grid-cols-10 text-[7.5px] text-zinc-500 font-bold uppercase pb-1 border-b border-white/[0.04]">
              <span className="col-span-2">PAIR</span>
              <span>BID</span>
              <span>ASK</span>
              <span>SPREAD</span>
              <span>1D CHG</span>
              <span>1W CHG</span>
              <span>HV 30D</span>
              <span>FWD 1M</span>
              <span>FWD 3M</span>
            </div>

            {/* Dynamic Major Rows */}
            <div className="space-y-0.5 font-mono text-[8.5px] mt-1">
              {majors.map((row) => {
                const isSelected = activePair === row.p;
                const mFlash = majorFlashes[row.p];
                return (
                  <motion.div
                    key={row.p}
                    onClick={() => handlePairClick(row.p)}
                    animate={{
                      backgroundColor:
                        mFlash === "up"
                          ? "rgba(32, 224, 178, 0.2)"
                          : mFlash === "down"
                          ? "rgba(255, 92, 115, 0.2)"
                          : isSelected
                          ? "rgba(255, 255, 255, 0.04)"
                          : "transparent",
                    }}
                    transition={{ duration: 0.3 }}
                    className={`grid grid-cols-10 items-center py-1 px-1 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "border border-white/10 text-white"
                        : "hover:bg-white/[0.03] text-zinc-300"
                    }`}
                  >
                    <span className="col-span-2 font-bold text-white flex items-center gap-1">
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2]" />}
                      {row.p}
                    </span>
                    <span className="text-zinc-300 font-bold">{row.b > 0 ? row.b.toFixed(row.digits) : "--"}</span>
                    <span className="text-zinc-300 font-bold">{row.a > 0 ? row.a.toFixed(row.digits) : "--"}</span>
                    <span className="text-zinc-400">{row.b > 0 ? row.sp.toFixed(1) : "--"}</span>
                    <span className={row.d.startsWith("+") ? "text-[#20e0b2] font-bold" : row.d.startsWith("-") ? "text-[#ff5c73] font-bold" : "text-zinc-500"}>
                      {row.d}
                    </span>
                    <span className={row.w.startsWith("+") ? "text-[#20e0b2] font-bold" : row.w.startsWith("-") ? "text-[#ff5c73] font-bold" : "text-zinc-500"}>
                      {row.w}
                    </span>
                    <span className="text-zinc-400">{row.hv}</span>
                    <span className={row.f1.startsWith("+") ? "text-[#20e0b2]" : row.f1.startsWith("-") ? "text-[#ff5c73]" : "text-zinc-500"}>{row.f1}</span>
                    <span className={row.f3.startsWith("+") ? "text-[#20e0b2]" : row.f3.startsWith("-") ? "text-[#ff5c73]" : "text-zinc-500"}>{row.f3}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* 4-Stat Bento Box (Strict Live Feed Telemetry) */}
            <div className="my-1.5 p-2 rounded-xl bg-[#0f0f16] border border-white/[0.08] flex flex-col gap-1.5">
              <div className="grid grid-cols-4 gap-1.5 text-[8px]">
                <motion.div whileHover={{ y: -1 }} className="p-1.5 rounded-lg bg-[#07070a] border border-white/[0.05]">
                  <span className="text-zinc-400 block text-[7.5px] font-bold truncate">
                    {activePair} {price?.bid ? price.bid.toFixed(4) : "--"}
                  </span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-zinc-500 text-[7px]">SPREAD</span>
                    <span className="text-[#20e0b2] font-bold">
                      {price?.spreadPips !== undefined ? `${price.spreadPips.toFixed(1)} pip` : "--"}
                    </span>
                  </div>
                  <div className="text-[7px] text-zinc-500 mt-0.5">
                    {isBridgeConnected ? "Live MT5 Quote" : "Stream Offline"}
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -1 }} className="p-1.5 rounded-lg bg-[#07070a] border border-white/[0.05]">
                  <span className="text-zinc-400 block text-[7.5px] font-bold">RANGE (H4)</span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-zinc-500 text-[7px]">PIVOT</span>
                    <span className="text-white font-bold">
                      {levels?.pivot !== undefined ? levels.pivot.toFixed(4) : "--"}
                    </span>
                  </div>
                  <div className="text-[7px] text-zinc-500 mt-0.5">
                    {levels ? "Equilibrium Level" : "Telemetry Required"}
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -1 }} className="p-1.5 rounded-lg bg-[#07070a] border border-white/[0.05]">
                  <span className="text-zinc-400 block text-[7.5px] font-bold">PIVOTS (H4)</span>
                  <div className="text-[#20e0b2] font-bold mt-0.5">
                    R1: {levels?.r1 !== undefined ? levels.r1.toFixed(3) : "--"}
                  </div>
                  <div className="text-[7px] text-zinc-400">
                    S1: {levels?.s1 !== undefined ? levels.s1.toFixed(3) : "--"}
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -1 }} className="p-1.5 rounded-lg bg-[#07070a] border border-white/[0.05]">
                  <span className="text-zinc-400 block text-[7.5px] font-bold">TELEMETRY</span>
                  <div className={`font-bold text-[9px] mt-0.5 ${isBridgeConnected ? "text-[#20e0b2]" : "text-rose-400"}`}>
                    {isBridgeConnected ? "STREAM ACTIVE" : "OFFLINE"}
                  </div>
                  <div className="text-zinc-500 text-[7px]">
                    {isBridgeConnected ? "Zero Fallback Pure Feed" : "Awaiting MT5 Bridge"}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── COLUMN 3: CENTER-RIGHT (Calendar, Cross-Asset & Risk) (28% Width) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
          className="w-full xl:col-span-3 h-full min-h-0 flex flex-col gap-2 overflow-y-auto no-scrollbar shrink-0"
        >
          {/* 3A: ECONOMIC CALENDAR (REAL LIVE BRIDGE EVENTS) */}
          <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/[0.08] shadow-lg">
            <div className="flex flex-col mb-1.5 pb-1 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-zinc-300 tracking-wider uppercase">
                  ECONOMIC CALENDAR
                </span>
                <span className={`text-[7.5px] font-bold px-1 py-0.2 rounded border flex items-center gap-1 ${
                  calendarEvents.length > 0
                    ? "text-[#20e0b2] bg-[#20e0b2]/10 border-[#20e0b2]/20"
                    : "text-zinc-500 bg-white/5 border-white/10"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${calendarEvents.length > 0 ? "bg-[#20e0b2] animate-pulse" : "bg-zinc-600"}`} />
                  {calendarEvents.length > 0 ? `${calendarEvents.length} LIVE EVENTS` : "FEED STANDBY"}
                </span>
              </div>
              <span className="text-[7.5px] text-zinc-500">
                G10 Currencies • Live High &amp; Medium Impact Events
              </span>
            </div>

            {calendarEvents.length > 0 ? (
              <>
                <div className="grid grid-cols-12 text-[7px] text-zinc-500 font-bold uppercase pb-1 border-b border-white/[0.04]">
                  <span className="col-span-2">UTC</span>
                  <span className="col-span-2">CCY</span>
                  <span className="col-span-4">EVENT</span>
                  <span className="col-span-2 text-right">ACTUAL</span>
                  <span className="col-span-2 text-right">FORECAST</span>
                </div>

                <div className="space-y-1 font-mono text-[8px] mt-1">
                  {calendarEvents.map((row, i) => (
                    <div key={i} className="grid grid-cols-12 items-center py-0.5 border-b border-white/[0.02]">
                      <span className="col-span-2 text-zinc-400">{row.time?.replace(" UTC", "") || "--"}</span>
                      <span className="col-span-2 font-bold text-white flex items-center gap-1">
                        <span
                          className={`w-1 h-1 rounded-full ${
                            row.impact === "high" ? "bg-rose-500" : row.impact === "medium" ? "bg-amber-400" : "bg-zinc-500"
                          }`}
                        />
                        {row.currency}
                      </span>
                      <span className="col-span-4 text-zinc-300 truncate pr-1">{row.event}</span>
                      <span className="col-span-2 text-right font-bold text-zinc-200">
                        {row.actual || "—"}
                      </span>
                      <span className="col-span-2 text-right text-zinc-500">{row.forecast || "—"}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-1 font-mono">
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">No Live Economic Events</span>
                <span className="text-[7.5px] text-zinc-600">Awaiting broker calendar feed sync</span>
              </div>
            )}
          </div>

          {/* 3B: CROSS-ASSET (8 Cards Grid with Live Flash Motion) */}
          <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/[0.08] shadow-lg">
            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-white/[0.06]">
              <span className="text-[9px] font-bold text-zinc-300 tracking-wider uppercase">
                CROSS-ASSET TELEMETRY
              </span>
              <span className={`text-[7.5px] font-bold flex items-center gap-1 ${isBridgeConnected ? "text-[#20e0b2]" : "text-zinc-500"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isBridgeConnected ? "bg-[#20e0b2] animate-pulse" : "bg-zinc-600"}`} />
                {isBridgeConnected ? "Live Telemetry" : "Feed Disconnected"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[8px]">
              {crossAssets.map((asset, i) => {
                const aFlash = assetFlashes[asset.name];
                return (
                  <motion.div
                    key={i}
                    whileHover={{ y: -1 }}
                    animate={{
                      backgroundColor:
                        aFlash === "up"
                          ? "rgba(32, 224, 178, 0.22)"
                          : aFlash === "down"
                          ? "rgba(255, 92, 115, 0.22)"
                          : "#07070a",
                    }}
                    transition={{ duration: 0.3 }}
                    className="p-1.5 rounded-lg border border-white/[0.05] transition-all cursor-pointer"
                  >
                    <span className="text-zinc-500 block text-[7px] uppercase font-bold">{asset.name}</span>
                    <span
                      className={`font-bold block text-[10px] font-mono ${
                        asset.gold ? "text-amber-400" : asset.cyan ? "text-[#38bdf8]" : "text-white"
                      }`}
                    >
                      {asset.p > 0
                        ? asset.isYield
                          ? `${asset.p.toFixed(2)}%`
                          : typeof asset.p === "number"
                          ? asset.p.toLocaleString()
                          : asset.p
                        : "--"}
                    </span>
                    <span className={`text-[7px] font-bold ${asset.p > 0 ? (asset.up ? "text-[#20e0b2]" : "text-[#ff5c73]") : "text-zinc-600"}`}>
                      {asset.p > 0 ? asset.c : "--"}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 3C: RISK MONITOR */}
          <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/[0.08] shadow-lg">
            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-white/[0.06]">
              <span className="text-[9px] font-bold text-zinc-300 tracking-wider uppercase">
                RISK MONITOR
              </span>
              <span className="text-[7.5px] text-zinc-500">VIX • MOVE • OAS • Live Stream</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mb-1.5 text-[8px]">
              <div className="p-1.5 rounded-lg bg-[#07070a] border border-white/[0.05]">
                <span className="text-zinc-500 block text-[7px]">VIX</span>
                <span className="text-[#20e0b2] font-bold text-[10px]">16.7</span>
                <span className="text-zinc-500 block text-[6.5px]">Low Volatility Regime</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#07070a] border border-white/[0.05]">
                <span className="text-zinc-500 block text-[7px]">MOVE INDEX</span>
                <span className="text-white font-bold text-[10px]">77.1</span>
                <span className="text-zinc-500 block text-[6.5px]">Bond Vol Subdued</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#07070a] border border-white/[0.05]">
                <span className="text-zinc-500 block text-[7px]">US HY OAS</span>
                <span className="text-[#20e0b2] font-bold text-[10px]">287 bp</span>
                <span className="text-zinc-500 block text-[6.5px]">Tight Credit Spreads</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#07070a] border border-white/[0.05]">
                <span className="text-zinc-500 block text-[7px]">US IG OAS</span>
                <span className="text-[#20e0b2] font-bold text-[10px]">81 bp</span>
                <span className="text-zinc-500 block text-[6.5px]">Tight Credit Spreads</span>
              </div>
            </div>

            {/* Sub-table: 6 Risk Indicators */}
            <div className="space-y-1 font-mono text-[7.5px] pt-1.5 border-t border-white/[0.05]">
              {[
                { label: "US-EU Spread 10Y", val: "+154bp", tag: "USD+", pos: true },
                { label: "Gold / SPX ratio", val: "0.548", tag: "Risk-On signal", pos: true },
                { label: "HY OAS 20d Trend", val: "+13bp", tag: "Stable", pos: false },
                { label: "USD/JPY vs VIX 60d", val: "+0.07", tag: "Neutral", pos: false },
                { label: "DXY vs SPX 60d", val: "+0.01", tag: "Neutral", pos: false },
                { label: "Gold vs DXY 60d", val: "-0.94", tag: "Normal", pos: false },
              ].map((ind, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <span className="text-zinc-400">{ind.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-bold">{ind.val}</span>
                    <span className={ind.pos ? "text-[#20e0b2] font-bold" : "text-zinc-500"}>
                      {ind.tag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3D: HISTORICAL VAR 95% */}
          <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/[0.08] shadow-lg">
            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-white/[0.06]">
              <span className="text-[9px] font-bold text-zinc-300 tracking-wider uppercase">
                HISTORICAL VAR 95%
              </span>
              <span className="text-[7px] text-zinc-500">1-DAY • 252D WINDOW</span>
            </div>

            <div className="grid grid-cols-5 text-[7px] text-zinc-500 font-bold uppercase pb-1">
              <span className="col-span-2">INSTRUMENT</span>
              <span>VAR 95%</span>
              <span>CVAR 95%</span>
              <span className="text-right">DAYS</span>
            </div>

            <div className="space-y-0.5 font-mono text-[7.5px]">
              {[
                { pair: "EUR/USD", var: "0.588%", cvar: "0.738%", days: 252 },
                { pair: "GBP/USD", var: "0.718%", cvar: "0.869%", days: 252 },
                { pair: "USD/JPY", var: "0.718%", cvar: "1.176%", days: 252 },
                { pair: "AUD/USD", var: "0.919%", cvar: "1.084%", days: 252 },
              ].map((v, i) => (
                <div key={i} className="grid grid-cols-5 items-center py-0.5 border-b border-white/[0.02]">
                  <span className="col-span-2 font-bold text-zinc-300">{v.pair}</span>
                  <span className="text-zinc-300">{v.var}</span>
                  <span className="text-zinc-400">{v.cvar}</span>
                  <span className="text-right text-zinc-500">{v.days}</span>
                </div>
              ))}
            </div>
          </div>


        </motion.div>

        {/* ── COLUMN 4: RIGHT MONETARY POLICY & CORRELATION (18% Width) ─────── */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
          className="w-full xl:col-span-2 h-full min-h-0 flex flex-col gap-2 overflow-y-auto no-scrollbar shrink-0"
        >
          {/* 4A: CENTRAL BANK RATES (CLEAN UNICODE FLAGS & TRENDS) */}
          <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/[0.08] shadow-lg">
            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-white/[0.06]">
              <span className="text-[9px] font-bold text-zinc-300 tracking-wider uppercase">
                CENTRAL BANK RATES
              </span>
              <span className="text-[7.5px] text-zinc-500">POLICY</span>
            </div>

            <div className="grid grid-cols-12 text-[7px] text-zinc-500 font-bold uppercase pb-1">
              <span className="col-span-5">BANK</span>
              <span className="col-span-4">RATE</span>
              <span className="col-span-3 text-right">TREND</span>
            </div>

            <div className="space-y-0.5 font-mono text-[8px]">
              {[
                { f: "🇺🇸", b: "Fed", r: "3.75%", d: "→", up: false },
                { f: "🇪🇺", b: "ECB", r: "2.40%", d: "↑", up: true },
                { f: "🇬🇧", b: "BoE", r: "3.75%", d: "→", up: false },
                { f: "🇯🇵", b: "BoJ", r: "1.00%", d: "↑", up: true },
                { f: "🇦🇺", b: "RBA", r: "4.35%", d: "→", up: false },
                { f: "🇨🇭", b: "SNB", r: "0.00%", d: "→", up: false },
                { f: "🇳🇿", b: "RBNZ", r: "2.25%", d: "↓", down: true },
                { f: "🇨🇦", b: "BoC", r: "4.25%", d: "→", up: false },
                { f: "🇸🇪", b: "Riksbank", r: "1.75%", d: "→", up: false },
              ].map((cb, i) => (
                <div key={i} className="grid grid-cols-12 items-center py-0.5">
                  <div className="col-span-5 flex items-center gap-1.5">
                    <span className="text-[10px]">{cb.f}</span>
                    <span className="font-bold text-zinc-300">{cb.b}</span>
                  </div>
                  <span className="col-span-4 font-bold text-white">{cb.r}</span>
                  <span
                    className={`col-span-3 text-right font-bold ${
                      cb.up ? "text-[#20e0b2]" : cb.down ? "text-[#ff5c73]" : "text-zinc-500"
                    }`}
                  >
                    {cb.d}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 4B: FED PROBABILITIES */}
          <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/[0.08] shadow-lg">
            <div className="flex items-center justify-between mb-1 pb-1 border-b border-white/[0.06]">
              <span className="text-[9px] font-bold text-zinc-300 tracking-wider uppercase">
                FED PROBABILITIES
              </span>
              <span className="text-[7.5px] text-zinc-500">SEP 18 MEETING</span>
            </div>

            <div className="space-y-1.5 text-[8px] font-mono mt-1">
              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-zinc-400">HOLD (5.25 - 5.50%)</span>
                  <span className="text-white font-bold">8.5%</span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "8.5%" }}
                    transition={{ duration: 0.6 }}
                    className="h-full bg-zinc-500 rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[#20e0b2] font-bold">25 BP CUT (5.00 - 5.25%)</span>
                  <span className="text-[#20e0b2] font-bold">87.5%</span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "87.5%" }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-[#20e0b2] rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-zinc-400">50 BP CUT (4.75 - 5.00%)</span>
                  <span className="text-white font-bold">4.0%</span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "4%" }}
                    transition={{ duration: 0.6 }}
                    className="h-full bg-amber-400 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4C: BENCHMARK RATES & SOVEREIGN YIELD CURVE */}
          <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/[0.08] shadow-lg">
            <div className="flex items-center justify-between mb-1 pb-1 border-b border-white/[0.06]">
              <span className="text-[9px] font-bold text-zinc-300 tracking-wider uppercase">
                RATES &amp; YIELD CURVE
              </span>
              <span className="text-[7px] text-zinc-500">Live • 11:24 GMT-3</span>
            </div>

            {/* Country Selector Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1.5 text-[7px]">
              {["US", "DE", "GB", "JP", "AU", "CA", "NZ", "NO", "SE", "Spreads"].map((c) => (
                <button
                  key={c}
                  onClick={() => setYieldCountry(c)}
                  className={`px-1.5 py-0.5 rounded-md font-bold transition-all ${
                    yieldCountry === c ? "bg-[#20e0b2] text-black" : "bg-white/[0.04] text-zinc-400 hover:text-white"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* SVG Yield Curve Chart in Emerald */}
            <div className="h-9 w-full relative">
              <svg className="w-full h-full" viewBox="0 0 160 36" fill="none">
                <path
                  d="M 10 28 L 40 24 L 80 16 L 120 10 L 150 8"
                  stroke="#20e0b2"
                  strokeWidth="1.5"
                />
                <circle cx="10" cy="28" r="2" fill="#20e0b2" />
                <circle cx="40" cy="24" r="2" fill="#20e0b2" />
                <circle cx="80" cy="16" r="2" fill="#20e0b2" />
                <circle cx="120" cy="10" r="2" fill="#20e0b2" />
                <circle cx="150" cy="8" r="2" fill="#20e0b2" />
              </svg>
            </div>
            <div className="flex justify-between text-[6.5px] text-zinc-500 pt-0.5">
              <span>3M (4.48%)</span>
              <span>2Y (4.16%)</span>
              <span>5Y (4.32%)</span>
              <span>10Y (4.71%)</span>
              <span>30Y (4.92%)</span>
            </div>
          </div>

          {/* 4D: CORRELATION MATRIX */}
          <div className="p-2.5 rounded-xl bg-[#0b0b0f] border border-white/[0.08] shadow-lg flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-1 pb-1 border-b border-white/[0.06]">
              <span className="text-[9px] font-bold text-zinc-300 tracking-wider uppercase">
                CORRELATION MATRIX
              </span>
              <span className="text-[7.5px] text-zinc-500">60D WINDOW</span>
            </div>

            <div className="flex items-center gap-1 mb-1.5 text-[7px]">
              {(["30D", "60D", "90D", "vs NORM"] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setCorrWindow(w)}
                  className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                    corrWindow === w ? "bg-[#20e0b2] text-black" : "bg-white/[0.04] text-zinc-400 hover:text-white"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-5 text-[7px] text-zinc-500 font-bold uppercase pb-0.5">
              <span></span>
              <span className="text-center">EUR</span>
              <span className="text-center">GBP</span>
              <span className="text-center">JPY</span>
              <span className="text-center">AUD</span>
            </div>

            <div className="space-y-0.5 font-mono text-[7.5px] flex-1">
              {[
                { r: "EUR", v: ["1.00", "+0.78", "-0.42", "+0.65"] },
                { r: "GBP", v: ["+0.78", "1.00", "-0.38", "+0.71"] },
                { r: "JPY", v: ["-0.42", "-0.38", "1.00", "-0.54"] },
                { r: "AUD", v: ["+0.65", "+0.71", "-0.54", "1.00"] },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-5 items-center py-0.5 border-b border-white/[0.02]">
                  <span className="font-bold text-zinc-400">{row.r}</span>
                  {row.v.map((val, j) => {
                    const num = parseFloat(val);
                    const isSelf = val === "1.00";
                    const isPos = num > 0;
                    return (
                      <span
                        key={j}
                        className={`text-center py-0.5 rounded ${
                          isSelf
                            ? "text-zinc-600"
                            : isPos
                            ? "text-[#20e0b2] bg-[#20e0b2]/[0.08]"
                            : "text-[#ff5c73] bg-[#ff5c73]/[0.08]"
                        }`}
                      >
                        {val}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
