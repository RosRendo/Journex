"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Compass,
  Clock,
  Calendar,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Flame,
  AlertTriangle,
  Play,
  Pause,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export type ContextDeckTab = "bias" | "session" | "calendar" | "macro" | "risk";

interface ContextDeckProps {
  symbol: string;
  onOpenPeek: (type: string, data?: any) => void;
  biasData?: any;
  riskData?: any;
}

export const ContextDeck: React.FC<ContextDeckProps> = ({
  symbol,
  onOpenPeek,
  biasData,
  riskData,
}) => {
  const [activeTab, setActiveTab] = useState<ContextDeckTab>("bias");
  const [direction, setDirection] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const tabs: { id: ContextDeckTab; label: string; icon: any; badge?: string }[] = [
    { id: "bias", label: "Daily Bias & Flow", icon: Compass, badge: "D1/H4" },
    { id: "session", label: "Session Matrix", icon: Clock, badge: "Killzones" },
    { id: "calendar", label: "Economic Events", icon: Calendar, badge: "High Impact" },
    { id: "macro", label: "Macro & SMT", icon: Layers, badge: "Correlations" },
    { id: "risk", label: "Daily Risk Guard", icon: Shield, badge: "1% Rule" },
  ];

  const currentIdx = tabs.findIndex((t) => t.id === activeTab);

  const setTabWithDirection = (newTabId: ContextDeckTab) => {
    const newIdx = tabs.findIndex((t) => t.id === newTabId);
    setDirection(newIdx > currentIdx ? 1 : -1);
    setActiveTab(newTabId);
    setProgress(0);
  };

  const prevTab = () => {
    const nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
    setDirection(-1);
    setActiveTab(tabs[nextIdx].id);
    setProgress(0);
  };

  const nextTab = () => {
    const nextIdx = (currentIdx + 1) % tabs.length;
    setDirection(1);
    setActiveTab(tabs[nextIdx].id);
    setProgress(0);
  };

  // 7-second Auto-play Carousel Timer
  useEffect(() => {
    if (!isAutoPlay || isHovered) return;

    const intervalTime = 70; // 100 steps over 7000ms
    const step = 100 / (7000 / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextTab();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isAutoPlay, isHovered, currentIdx]);

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key === "q" || e.key === "Q") prevTab();
      if (e.key === "e" || e.key === "E") nextTab();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIdx]);

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
        ease: [0.25, 1, 0.5, 1] as const,
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 35 : -35,
      opacity: 0,
      scale: 0.99,
      transition: {
        duration: 0.2,
        ease: [0.25, 1, 0.5, 1] as const,
      },
    }),
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex flex-col bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden shadow-2xl relative group"
    >
      {/* Animated Carousel Progress Line */}
      {isAutoPlay && !isHovered && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent overflow-hidden z-20">
          <div
            className="h-full bg-gradient-to-r from-[#20e0b2]/40 via-[#20e0b2] to-[#20e0b2]/40 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Context Deck Navigation Rail */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.07)] bg-[#141419]/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#71717a] font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-pulse" />
            Context Deck
          </span>
          <span className="text-[8px] bg-[#18181f] text-[#a1a1aa] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.08)] font-mono">
            [Q / E] Slide
          </span>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTabWithDirection(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all relative ${
                  isActive
                    ? "bg-[#20e0b2]/15 text-[#20e0b2] border border-[#20e0b2]/30 shadow-sm"
                    : "text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#18181f] border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                      isActive ? "bg-[#20e0b2]/20 text-[#20e0b2]" : "bg-[#1f1f26] text-[#71717a]"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 rounded-lg border border-[#20e0b2]/40 pointer-events-none"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Carousel Controls: Play/Pause + Arrows */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`p-1.5 rounded-lg border transition-all ${
              isAutoPlay
                ? "bg-[#20e0b2]/10 border-[#20e0b2]/30 text-[#20e0b2]"
                : "bg-[#09090b] border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-white"
            }`}
            title={isAutoPlay ? "Pause Auto Carousel" : "Start Auto Carousel (7s)"}
          >
            {isAutoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            onClick={prevTab}
            className="p-1.5 rounded-lg bg-[#09090b] border border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-white hover:border-[#20e0b2]/40 transition-all"
            title="Previous Deck (Q)"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={nextTab}
            className="p-1.5 rounded-lg bg-[#09090b] border border-[rgba(255,255,255,0.07)] text-[#71717a] hover:text-white hover:border-[#20e0b2]/40 transition-all"
            title="Next Deck (E)"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Deck Body with Smooth Framer-Motion Slide Animation */}
      <div className="p-4 bg-[#09090b]/40 min-h-[145px] relative overflow-hidden flex flex-col justify-center">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={activeTab}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full"
          >
            {/* SLIDE 1: DAILY BIAS */}
            {activeTab === "bias" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="flex flex-col gap-1 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Institutional Direction
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black font-mono text-[#20e0b2]">BULLISH</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#20e0b2]/10 text-[#20e0b2] border border-[#20e0b2]/20 font-mono">
                      A+ Edge
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                    Liquidity draw resides at Asian Highs (equal highs pool). Price in discount expansion.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    HTF Structure (D1/H4)
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Daily Trend:</span>
                    <span className="text-[#20e0b2] font-bold">Expansion Up</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">H4 Order Flow:</span>
                    <span className="text-[#20e0b2] font-bold">Bullish Order Blocks</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">M15 Execution:</span>
                    <span className="text-[#f5c451] font-bold">Discount FVG Retest</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Key Liquidity Draw
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">BSL (Buy-Side):</span>
                    <span className="text-[#f4f4f5] font-bold">4,445.00 (+20.2 pts)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">SSL (Sell-Side):</span>
                    <span className="text-[#a1a1aa]">4,412.50 (Swept ✓)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Equilibrium:</span>
                    <span className="text-[#a1a1aa]">4,428.75</span>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end justify-center gap-2">
                  <button
                    onClick={() => onOpenPeek("bias_detail", { symbol })}
                    className="w-full md:w-auto px-4 py-2 rounded-lg bg-[#20e0b2]/10 hover:bg-[#20e0b2]/20 text-[#20e0b2] border border-[#20e0b2]/30 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Peek Bias Matrix</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={`/macro/${symbol}`}
                    className="text-[10px] text-[#71717a] hover:text-[#a1a1aa] font-mono transition-colors"
                  >
                    Open Full Macro Analysis ↗
                  </Link>
                </div>
              </div>
            )}

            {/* SLIDE 2: SESSION MATRIX */}
            {activeTab === "session" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="flex flex-col gap-1 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Active Session
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black font-mono text-[#f5c451]">LONDON OPEN</span>
                    <span className="w-2 h-2 rounded-full bg-[#f5c451] animate-ping" />
                  </div>
                  <p className="text-[11px] text-[#a1a1aa]">
                    London Judas Swing active. High volatility expansion window.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Killzone Timeline
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Asian Range:</span>
                    <span className="text-[#a1a1aa]">00:00 - 06:00 UTC (Closed)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">London Open:</span>
                    <span className="text-[#f5c451] font-bold">07:00 - 10:00 UTC (ACTIVE)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">NY AM Open:</span>
                    <span className="text-[#20e0b2]">Opens in 2h 15m</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Asian Range Metrics
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Asian High:</span>
                    <span className="text-[#f4f4f5] font-bold">4,432.10</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Asian Low:</span>
                    <span className="text-[#ff5c73] font-bold">4,414.50 (SWEPT)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Range Size:</span>
                    <span className="text-[#a1a1aa]">17.6 pts (Prime for Exp)</span>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end justify-center gap-2">
                  <button
                    onClick={() => onOpenPeek("session_detail")}
                    className="w-full md:w-auto px-4 py-2 rounded-lg bg-[#f5c451]/10 hover:bg-[#f5c451]/20 text-[#f5c451] border border-[#f5c451]/30 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Peek Session Map</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] text-[#71717a] font-mono">Next Dead Zone at 11:00 UTC</span>
                </div>
              </div>
            )}

            {/* SLIDE 3: ECONOMIC CALENDAR */}
            {activeTab === "calendar" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="flex flex-col gap-1 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Next Macro Catalyst
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black font-mono text-[#ff5c73]">USD CPI m/m</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#ff5c73]/20 text-[#ff5c73] font-bold">
                      HIGH
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a1a1aa]">
                    Releases at 13:30 UTC. Expected volatility surge across XAUUSD &amp; EURUSD.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Event Consensus
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Forecast:</span>
                    <span className="text-[#f4f4f5] font-bold">0.3%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Previous:</span>
                    <span className="text-[#a1a1aa]">0.2%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Risk Embargo:</span>
                    <span className="text-[#f5c451] font-bold">T-30m blackout</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Later Today
                  </span>
                  <div className="text-xs font-mono flex items-center justify-between">
                    <span className="text-[#a1a1aa]">15:00 USD Sentiment</span>
                    <span className="text-[#71717a]">Med Impact</span>
                  </div>
                  <div className="text-xs font-mono flex items-center justify-between">
                    <span className="text-[#a1a1aa]">18:00 Fed Speaker</span>
                    <span className="text-[#71717a]">Low Impact</span>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end justify-center gap-2">
                  <button
                    onClick={() => onOpenPeek("calendar_detail")}
                    className="w-full md:w-auto px-4 py-2 rounded-lg bg-[#20e0b2]/10 hover:bg-[#20e0b2]/20 text-[#20e0b2] border border-[#20e0b2]/30 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Peek Full Day Brief</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href="/calendar"
                    className="text-[10px] text-[#71717a] hover:text-[#a1a1aa] font-mono transition-colors"
                  >
                    Open Institutional Calendar ↗
                  </Link>
                </div>
              </div>
            )}

            {/* SLIDE 4: MACRO & SMT */}
            {activeTab === "macro" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="flex flex-col gap-1 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    SMT Divergence State
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black font-mono text-[#20e0b2]">CONFIRMED SMT</span>
                  </div>
                  <p className="text-[11px] text-[#a1a1aa]">
                    DXY made a higher high, but EURUSD refused lower low. Institutional accumulation.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Dollar Index (DXY)
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Quote:</span>
                    <span className="text-[#f4f4f5] font-bold">104.18 (-0.15%)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Structure:</span>
                    <span className="text-[#ff5c73] font-bold">H1 Bearish Rejection</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Bond Yields (US10Y)
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Yield:</span>
                    <span className="text-[#f4f4f5] font-bold">4.22% (-2.1 bps)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Gold Impact:</span>
                    <span className="text-[#20e0b2] font-bold">Tailwind for Gold</span>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end justify-center gap-2">
                  <button
                    onClick={() => onOpenPeek("smt_matrix")}
                    className="w-full md:w-auto px-4 py-2 rounded-lg bg-[#20e0b2]/10 hover:bg-[#20e0b2]/20 text-[#20e0b2] border border-[#20e0b2]/30 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Peek SMT Matrix</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href="/macro"
                    className="text-[10px] text-[#71717a] hover:text-[#a1a1aa] font-mono transition-colors"
                  >
                    Open Macro Desk ↗
                  </Link>
                </div>
              </div>
            )}

            {/* SLIDE 5: DAILY RISK GUARD */}
            {activeTab === "risk" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="flex flex-col gap-1 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Safety Circuit Status
                  </span>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#20e0b2]" />
                    <span className="text-lg font-black font-mono text-[#20e0b2]">ARMED &amp; SAFE</span>
                  </div>
                  <p className="text-[11px] text-[#a1a1aa]">
                    Live balance: $35.18. Current drawdown: 0.0%. 2 trades remaining today.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Risk Per Trade Rule
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Standard Risk:</span>
                    <span className="text-[#20e0b2] font-bold">1.0% ($0.35)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Max Daily Loss:</span>
                    <span className="text-[#ff5c73] font-bold">3.0% ($1.05)</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 border-r border-[rgba(255,255,255,0.06)] pr-4">
                  <span className="text-[9px] uppercase tracking-widest text-[#71717a] font-mono font-bold">
                    Discipline Rating
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Plan Adherence:</span>
                    <span className="text-[#20e0b2] font-bold">100%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Stop Loss Discipline:</span>
                    <span className="text-[#20e0b2] font-bold">Active on all</span>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end justify-center gap-2">
                  <button
                    onClick={() => onOpenPeek("risk_guard")}
                    className="w-full md:w-auto px-4 py-2 rounded-lg bg-[#20e0b2]/10 hover:bg-[#20e0b2]/20 text-[#20e0b2] border border-[#20e0b2]/30 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Peek Risk Guard</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href="/risk"
                    className="text-[10px] text-[#71717a] hover:text-[#a1a1aa] font-mono transition-colors"
                  >
                    Open Full Risk Terminal ↗
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Carousel Dot Pagination */}
      <div className="px-4 py-1.5 border-t border-[rgba(255,255,255,0.05)] bg-[#101014] flex items-center justify-between text-[9px] font-mono">
        <span className="text-[#71717a]">
          Slide {currentIdx + 1} of {tabs.length} · {tabs[currentIdx].label}
        </span>
        <div className="flex items-center gap-1.5">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => setTabWithDirection(tab.id)}
              className={`h-1.5 rounded-full transition-all ${
                activeTab === tab.id ? "w-5 bg-[#20e0b2]" : "w-1.5 bg-[rgba(255,255,255,0.15)] hover:bg-white"
              }`}
              title={tab.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
export default ContextDeck;
