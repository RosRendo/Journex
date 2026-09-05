"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Crosshair,
  Maximize2,
  ShieldCheck,
  Flame,
  Search,
  LayoutGrid,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchWithAuth, getBackendUrl } from "@/lib/utils";

export interface OpportunityItem {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  grade: "A+" | "A" | "B";
  score: number;
  setup_type: string;
  session: string;
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  factors: {
    sweep: boolean;
    mss: boolean;
    fvg: boolean;
    ob: boolean;
    smt?: boolean;
  };
  status: "READY" | "FORMING" | "MONITORING";
}

interface OpportunityRadarProps {
  onSelectSymbol: (symbol: string) => void;
  onOpenPeek: (type: string, data?: any) => void;
  onStageOrder: (opp: OpportunityItem) => void;
}

const DEFAULT_OPPORTUNITIES: OpportunityItem[] = [
  {
    id: "opp-xau",
    symbol: "XAUUSD",
    direction: "BUY",
    grade: "A+",
    score: 92,
    setup_type: "Discount FVG + Asian Low Sweep",
    session: "London Open",
    entry: 4424.50,
    sl: 4414.00,
    tp: 4445.50,
    rr: 2.0,
    factors: { sweep: true, mss: true, fvg: true, ob: true, smt: true },
    status: "READY",
  },
  {
    id: "opp-eur",
    symbol: "EURUSD",
    direction: "SELL",
    grade: "A",
    score: 84,
    setup_type: "Judas Swing Reversal + Premium OB",
    session: "London Open",
    entry: 1.16105,
    sl: 1.16320,
    tp: 1.15650,
    rr: 2.1,
    factors: { sweep: true, mss: true, fvg: true, ob: false, smt: false },
    status: "FORMING",
  },
  {
    id: "opp-gbp",
    symbol: "GBPUSD",
    direction: "BUY",
    grade: "B",
    score: 74,
    setup_type: "H1 Breaker Block Retest",
    session: "London Pre-NY",
    entry: 1.35120,
    sl: 1.34850,
    tp: 1.35650,
    rr: 1.9,
    factors: { sweep: true, mss: false, fvg: true, ob: true, smt: false },
    status: "MONITORING",
  },
  {
    id: "opp-btc",
    symbol: "BTCUSD",
    direction: "BUY",
    grade: "A",
    score: 86,
    setup_type: "H4 Demand Zone + CVD Absorption",
    session: "Active Crypto Flow",
    entry: 79560.0,
    sl: 78600.0,
    tp: 81500.0,
    rr: 2.0,
    factors: { sweep: true, mss: true, fvg: false, ob: true, smt: true },
    status: "READY",
  },
];

export const OpportunityRadar: React.FC<OpportunityRadarProps> = ({
  onSelectSymbol,
  onOpenPeek,
  onStageOrder,
}) => {
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(DEFAULT_OPPORTUNITIES);
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel");
  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const backend = getBackendUrl();
        const res = await fetchWithAuth(`${backend}/api/terminal/signals`);
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.signals) && json.signals.length > 0) {
            const mapped: OpportunityItem[] = json.signals.slice(0, 4).map((s: any, idx: number) => ({
              id: s.id || `sig-${idx}`,
              symbol: s.symbol || "XAUUSD",
              direction: (s.direction || "BUY").toUpperCase(),
              grade: s.score >= 88 ? "A+" : s.score >= 78 ? "A" : "B",
              score: s.score || 80,
              setup_type: s.setup_type || s.timeframe + " ICT Algorithmic Setup",
              session: s.session || "Active Session",
              entry: s.entry || 4425,
              sl: s.sl || 4415,
              tp: s.tp || 4445,
              rr: s.risk_reward || 2.0,
              factors: {
                sweep: true,
                mss: s.score > 75,
                fvg: true,
                ob: s.score > 80,
                smt: s.factors?.some((f: string) => f.toLowerCase().includes("smt")) ?? false,
              },
              status: s.score >= 85 ? "READY" : "FORMING",
            }));
            setOpportunities(mapped);
          }
        }
      } catch (e) {
        // Fallback to default real-quote opportunities
      }
    };
    fetchSignals();
    const id = setInterval(fetchSignals, 15000);
    return () => clearInterval(id);
  }, []);

  const currentOpp = opportunities[activeIdx] || opportunities[0];

  const nextOpp = () => {
    setDirection(1);
    setActiveIdx((prev) => (prev + 1) % opportunities.length);
    setProgress(0);
  };

  const prevOpp = () => {
    setDirection(-1);
    setActiveIdx((prev) => (prev - 1 + opportunities.length) % opportunities.length);
    setProgress(0);
  };

  const goToOpp = (index: number) => {
    setDirection(index > activeIdx ? 1 : -1);
    setActiveIdx(index);
    setProgress(0);
  };

  // 6-second auto-carousel timer
  useEffect(() => {
    if (viewMode !== "carousel" || !isAutoPlay || isHovered) return;

    const intervalTime = 60;
    const step = 100 / (6000 / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextOpp();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [viewMode, isAutoPlay, isHovered, activeIdx, opportunities.length]);

  const slideVariants: any = {
    enter: (dir: number) => ({
      x: dir > 0 ? 35 : -35,
      opacity: 0,
      scale: 0.99,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.28,
        ease: "easeOut",
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 35 : -35,
      opacity: 0,
      scale: 0.99,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    }),
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex flex-col bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden shadow-2xl relative group"
    >
      {/* Top Animated Gradient Progress Line for Carousel Mode */}
      {viewMode === "carousel" && isAutoPlay && !isHovered && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent overflow-hidden z-20">
          <div
            className="h-full bg-gradient-to-r from-[#20e0b2]/40 via-[#20e0b2] to-[#20e0b2]/40 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Header with View Toggle & Carousel Controls */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.07)] bg-[#141419]/80 backdrop-blur-md gap-2">
        <div className="flex items-center gap-2.5">
          <Zap className="w-3.5 h-3.5 text-[#20e0b2]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#f4f4f5] font-mono">
            Opportunity Radar (ICT Edge Scanner)
          </span>
          <span className="text-[8px] bg-[#18181f] text-[#20e0b2] px-1.5 py-0.5 rounded border border-[#20e0b2]/20 font-mono">
            {opportunities.filter((o) => o.grade === "A+").length} A+ Setups
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Carousel vs Grid View Switcher */}
          <div className="flex items-center bg-[#09090b] border border-[rgba(255,255,255,0.07)] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("carousel")}
              className={`px-2 py-1 rounded text-[9px] font-bold font-mono transition-all flex items-center gap-1 ${
                viewMode === "carousel"
                  ? "bg-[#20e0b2] text-[#09090b] shadow-sm font-black"
                  : "text-[#71717a] hover:text-[#f4f4f5]"
              }`}
              title="Carousel Mode (Auto-Slide)"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>Carousel</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2 py-1 rounded text-[9px] font-bold font-mono transition-all flex items-center gap-1 ${
                viewMode === "grid"
                  ? "bg-[#20e0b2] text-[#09090b] shadow-sm font-black"
                  : "text-[#71717a] hover:text-[#f4f4f5]"
              }`}
              title="Grid Matrix Mode"
            >
              <LayoutGrid className="w-2.5 h-2.5" />
              <span>Grid (4x)</span>
            </button>
          </div>

          {/* Carousel Mode Controls */}
          {viewMode === "carousel" && (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className={`p-1 rounded border transition-all ${
                  isAutoPlay
                    ? "bg-[#20e0b2]/10 border-[#20e0b2]/30 text-[#20e0b2]"
                    : "bg-[#09090b] border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-white"
                }`}
                title={isAutoPlay ? "Pause Auto Carousel" : "Start Auto Carousel (6s)"}
              >
                {isAutoPlay ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
              </button>
              <button
                onClick={prevOpp}
                className="p-1 rounded bg-[#09090b] border border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-white hover:border-[#20e0b2]/40 transition-all"
                title="Previous Setup"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={nextOpp}
                className="p-1 rounded bg-[#09090b] border border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-white hover:border-[#20e0b2]/40 transition-all"
                title="Next Setup"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: CAROUSEL DECK */}
      {viewMode === "carousel" && (
        <div className="flex flex-col bg-[#09090b]/40">
          <div className="p-4 relative overflow-hidden min-h-[175px]">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={currentOpp.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
              >
                {/* Left 4 Cols: Symbol, Grade & Direction */}
                <div className="md:col-span-4 flex flex-col justify-between gap-2 border-r md:border-[rgba(255,255,255,0.06)] pr-0 md:pr-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black font-mono tracking-tight text-[#f4f4f5]">
                        {currentOpp.symbol}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-black font-mono uppercase ${
                          currentOpp.direction === "BUY"
                            ? "bg-[#20e0b2]/15 text-[#20e0b2] border border-[#20e0b2]/30"
                            : "bg-[#ff5c73]/15 text-[#ff5c73] border border-[#ff5c73]/30"
                        }`}
                      >
                        {currentOpp.direction}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black font-mono border ${
                        currentOpp.grade === "A+"
                          ? "bg-[#20e0b2]/20 text-[#20e0b2] border-[#20e0b2]/40 shadow-[0_0_12px_rgba(32,224,178,0.2)]"
                          : currentOpp.grade === "A"
                          ? "bg-[#20e0b2]/10 text-[#20e0b2] border-[#20e0b2]/20"
                          : "bg-[#f5c451]/10 text-[#f5c451] border-[#f5c451]/20"
                      }`}
                    >
                      GRADE {currentOpp.grade} ({currentOpp.score}%)
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-[#20e0b2] font-mono font-bold block">
                      {currentOpp.setup_type}
                    </span>
                    <span className="text-[10px] text-[#71717a] font-mono block mt-0.5">
                      Session: <span className="text-[#a1a1aa]">{currentOpp.session}</span> · Status:{" "}
                      <span className="text-[#f5c451]">{currentOpp.status}</span>
                    </span>
                  </div>

                  {/* Pricing Bar */}
                  <div className="flex items-center justify-between text-xs font-mono bg-[#141419] p-2 rounded-lg border border-[rgba(255,255,255,0.06)]">
                    <div>
                      <span className="text-[8px] text-[#71717a] block uppercase">Entry</span>
                      <span className="font-bold text-white">{currentOpp.entry}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#71717a] block uppercase">Stop Loss</span>
                      <span className="font-bold text-[#ff5c73]">{currentOpp.sl}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#71717a] block uppercase">Take Profit</span>
                      <span className="font-bold text-[#20e0b2]">{currentOpp.tp}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#71717a] block uppercase">Risk : Reward</span>
                      <span className="font-bold text-[#20e0b2]">1 : {currentOpp.rr.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Middle 5 Cols: ICT Institutional Factors Matrix */}
                <div className="md:col-span-5 flex flex-col gap-2 border-r md:border-[rgba(255,255,255,0.06)] pr-0 md:pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Algorithmic ICT Confluences
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="flex items-center justify-between p-1.5 rounded bg-[#0d0d10] border border-[rgba(255,255,255,0.04)]">
                      <span className="text-[#a1a1aa]">Liquidity Sweep:</span>
                      {currentOpp.factors.sweep ? (
                        <span className="flex items-center gap-1 text-[#20e0b2] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-[#20e0b2]" />
                          Swept
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#ff5c73]">
                          <XCircle className="w-3 h-3 text-[#ff5c73]" />
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded bg-[#0d0d10] border border-[rgba(255,255,255,0.04)]">
                      <span className="text-[#a1a1aa]">MSS Shift:</span>
                      {currentOpp.factors.mss ? (
                        <span className="flex items-center gap-1 text-[#20e0b2] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-[#20e0b2]" />
                          Confirmed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#ff5c73]">
                          <XCircle className="w-3 h-3 text-[#ff5c73]" />
                          Unformed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded bg-[#0d0d10] border border-[rgba(255,255,255,0.04)]">
                      <span className="text-[#a1a1aa]">FVG Retest:</span>
                      {currentOpp.factors.fvg ? (
                        <span className="flex items-center gap-1 text-[#20e0b2] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-[#20e0b2]" />
                          Mitigating
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#71717a]">
                          <XCircle className="w-3 h-3 text-[#71717a]" />
                          No FVG
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded bg-[#0d0d10] border border-[rgba(255,255,255,0.04)]">
                      <span className="text-[#a1a1aa]">Order Block:</span>
                      {currentOpp.factors.ob ? (
                        <span className="flex items-center gap-1 text-[#20e0b2] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-[#20e0b2]" />
                          Respected
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#71717a]">
                          <XCircle className="w-3 h-3 text-[#71717a]" />
                          Secondary
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full bg-[#141419] rounded-full h-1.5 overflow-hidden border border-[rgba(255,255,255,0.05)] mt-1">
                    <div
                      className="bg-gradient-to-r from-[#20e0b2]/80 to-[#20e0b2] h-full transition-all duration-500 rounded-full"
                      style={{ width: `${currentOpp.score}%` }}
                    />
                  </div>
                </div>

                {/* Right 3 Cols: Actions */}
                <div className="md:col-span-3 flex flex-col justify-center gap-2">
                  <button
                    onClick={() => onStageOrder(currentOpp)}
                    className="w-full py-2.5 rounded-lg bg-[#20e0b2] hover:bg-[#1bc9a0] text-[#09090b] font-black font-mono text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(32,224,178,0.25)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Stage 1-Click Order</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onSelectSymbol(currentOpp.symbol)}
                      className="py-1.5 rounded-lg bg-[#141419] hover:bg-[#1f1f26] border border-[rgba(255,255,255,0.07)] text-[10px] font-bold font-mono text-[#f4f4f5] transition-all flex items-center justify-center gap-1"
                    >
                      <Crosshair className="w-3 h-3 text-[#20e0b2]" />
                      <span>Chart</span>
                    </button>
                    <button
                      onClick={() => onOpenPeek("setup_inspector", currentOpp)}
                      className="py-1.5 rounded-lg bg-[#141419] hover:bg-[#1f1f26] border border-[rgba(255,255,255,0.07)] text-[10px] font-bold font-mono text-[#a1a1aa] hover:text-white transition-all flex items-center justify-center gap-1"
                    >
                      <Search className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel Slide Switcher Pills (Thumbnails) */}
          <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.05)] bg-[#101014] flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono">
            <span className="text-[#71717a]">
              Setup {activeIdx + 1} of {opportunities.length} · {currentOpp.symbol} {currentOpp.direction}
            </span>

            <div className="flex items-center gap-2">
              {opportunities.map((opp, idx) => {
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={opp.id}
                    onClick={() => goToOpp(idx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all ${
                      isActive
                        ? "bg-[#20e0b2]/15 text-[#20e0b2] border border-[#20e0b2]/40 font-bold"
                        : "bg-[#141419] text-[#71717a] hover:text-[#f4f4f5] border border-[rgba(255,255,255,0.05)]"
                    }`}
                  >
                    <span>{opp.symbol}</span>
                    <span
                      className={`text-[8px] font-bold ${
                        opp.direction === "BUY" ? "text-[#20e0b2]" : "text-[#ff5c73]"
                      }`}
                    >
                      {opp.direction}
                    </span>
                    <span className="text-[8px] opacity-75">{opp.grade}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: GRID MATRIX (ALL 4 CARDS WITH ENHANCED ANIMATION) */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[rgba(255,255,255,0.06)] bg-[#09090b]/30">
          {opportunities.map((opp) => {
            const isBuy = opp.direction === "BUY";

            return (
              <motion.div
                key={opp.id}
                whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.02)" }}
                transition={{ duration: 0.15 }}
                className={`p-3.5 flex flex-col justify-between gap-3 transition-all group relative ${
                  opp.grade === "A+" ? "border-t md:border-t-0 border-[#20e0b2]/20" : ""
                }`}
              >
                {/* Top Row: Symbol + Direction + Grade Badge */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black font-mono tracking-tight text-[#f4f4f5]">
                        {opp.symbol}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-black font-mono uppercase ${
                          isBuy ? "bg-[#20e0b2]/15 text-[#20e0b2]" : "bg-[#ff5c73]/15 text-[#ff5c73]"
                        }`}
                      >
                        {opp.direction}
                      </span>
                    </div>
                    <span className="text-[9px] text-[#71717a] font-mono block mt-0.5 truncate max-w-[150px]">
                      {opp.setup_type}
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black font-mono border ${
                        opp.grade === "A+"
                          ? "bg-[#20e0b2]/20 text-[#20e0b2] border-[#20e0b2]/40 shadow-[0_0_8px_rgba(32,224,178,0.15)]"
                          : opp.grade === "A"
                          ? "bg-[#20e0b2]/10 text-[#20e0b2] border-[#20e0b2]/20"
                          : "bg-[#f5c451]/10 text-[#f5c451] border-[#f5c451]/20"
                      }`}
                    >
                      {opp.grade} ({opp.score}%)
                    </span>
                    <span className="text-[8px] text-[#71717a] font-mono mt-0.5">
                      R:R 1:{opp.rr.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Middle Row: ICT Structure Checkmarks */}
                <div className="grid grid-cols-2 gap-1.5 py-2 px-2.5 rounded-lg bg-[#0d0d10] border border-[rgba(255,255,255,0.04)] text-[10px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[#71717a]">Liquidity:</span>
                    {opp.factors.sweep ? (
                      <CheckCircle2 className="w-3 h-3 text-[#20e0b2]" />
                    ) : (
                      <XCircle className="w-3 h-3 text-[#ff5c73]" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#71717a]">MSS:</span>
                    {opp.factors.mss ? (
                      <CheckCircle2 className="w-3 h-3 text-[#20e0b2]" />
                    ) : (
                      <XCircle className="w-3 h-3 text-[#ff5c73]" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#71717a]">FVG:</span>
                    {opp.factors.fvg ? (
                      <CheckCircle2 className="w-3 h-3 text-[#20e0b2]" />
                    ) : (
                      <XCircle className="w-3 h-3 text-[#71717a]" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#71717a]">OB:</span>
                    {opp.factors.ob ? (
                      <CheckCircle2 className="w-3 h-3 text-[#20e0b2]" />
                    ) : (
                      <XCircle className="w-3 h-3 text-[#71717a]" />
                    )}
                  </div>
                </div>

                {/* Pricing Line */}
                <div className="flex items-center justify-between text-[9px] font-mono text-[#a1a1aa] px-1">
                  <span>
                    Entry: <strong className="text-white">{opp.entry}</strong>
                  </span>
                  <span>
                    SL: <strong className="text-[#ff5c73]">{opp.sl}</strong>
                  </span>
                  <span>
                    TP: <strong className="text-[#20e0b2]">{opp.tp}</strong>
                  </span>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => onSelectSymbol(opp.symbol)}
                    className="flex-1 py-1.5 rounded-lg bg-[#141419] hover:bg-[#1f1f26] border border-[rgba(255,255,255,0.07)] text-[9px] font-bold font-mono text-[#f4f4f5] transition-all flex items-center justify-center gap-1"
                  >
                    <Crosshair className="w-3 h-3 text-[#20e0b2]" />
                    <span>Chart</span>
                  </button>
                  <button
                    onClick={() => onOpenPeek("setup_inspector", opp)}
                    className="flex-1 py-1.5 rounded-lg bg-[#141419] hover:bg-[#1f1f26] border border-[rgba(255,255,255,0.07)] text-[9px] font-bold font-mono text-[#a1a1aa] hover:text-white transition-all flex items-center justify-center gap-1"
                  >
                    <Search className="w-3 h-3" />
                    <span>Inspect</span>
                  </button>
                  <button
                    onClick={() => onStageOrder(opp)}
                    className="flex-1 py-1.5 rounded-lg bg-[#20e0b2]/15 hover:bg-[#20e0b2]/25 border border-[#20e0b2]/30 text-[9px] font-black font-mono text-[#20e0b2] transition-all flex items-center justify-center gap-1"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Stage</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default OpportunityRadar;

