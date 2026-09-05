"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ArrowUpRight,
  Layers,
  Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface IntelligenceSlide {
  id: string;
  category: string;
  badge: string;
  badgeColor: "emerald" | "blue" | "amber" | "purple";
  icon: any;
  title: string;
  description: string;
  actionText: string;
  symbol?: string;
  peekType?: string;
}

interface DashboardIntelligenceCarouselProps {
  onSelectSymbol?: (symbol: string) => void;
  onOpenPeek?: (type: string, data?: any) => void;
  accountEquity?: number;
}

export const DashboardIntelligenceCarousel: React.FC<DashboardIntelligenceCarouselProps> = ({
  onSelectSymbol,
  onOpenPeek,
  accountEquity = 35.18,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);

  const slides: IntelligenceSlide[] = [
    {
      id: "slide-xau",
      category: "ALGO RADAR",
      badge: "GRADE A+ SETUP",
      badgeColor: "emerald",
      icon: Zap,
      title: "XAUUSD Asian Low Sweep + Discount FVG Retest",
      description:
        "Institutional buy-side liquidity targeted at 4,445.50. Asian lows swept at 4,414 with M5 MSS validation (R:R 1:2.0).",
      actionText: "Focus XAUUSD",
      symbol: "XAUUSD",
    },
    {
      id: "slide-macro",
      category: "MACRO INTEL",
      badge: "SMT DIVERGENCE",
      badgeColor: "blue",
      icon: Layers,
      title: "Dollar Index (DXY) Rejecting 4H Premium Order Block",
      description:
        "DXY failed to take previous day highs while EURUSD formed a higher low, confirming institutional accumulation on FX majors.",
      actionText: "Inspect Macro Deck",
      peekType: "macro_deck",
    },
    {
      id: "slide-session",
      category: "TIME & PRICE",
      badge: "LONDON KILLZONE",
      badgeColor: "amber",
      icon: Clock,
      title: "Optimal Trade Entry (OTE) Window Active",
      description:
        "London Open session algorithm active through 10:30 UTC. Expansion volatility expected on GBP and EUR pairs.",
      actionText: "Session Matrix",
      peekType: "session_matrix",
    },
    {
      id: "slide-risk",
      category: "CAPITAL GUARD",
      badge: "1.0% RISK PROTOCOL",
      badgeColor: "emerald",
      icon: ShieldCheck,
      title: `Live MT5 Margin Safe · Zero Open Drawdown`,
      description: `Account equity $${accountEquity.toFixed(2)}. Max permissible risk per setup capped at $0.35 with 0.01 lot strict sizing.`,
      actionText: "Risk Telemetry",
      peekType: "risk_guard",
    },
    {
      id: "slide-discipline",
      category: "QUANT PSYCHOLOGY",
      badge: "94% DISCIPLINE SCORE",
      badgeColor: "purple",
      icon: Sparkles,
      title: "Execution Edge: 3-Session Flawless Adherence",
      description:
        "Average win-to-loss ratio at 2.4:1 with zero FOMO rule violations logged. Long-term strategy expectancy remains strongly positive.",
      actionText: "Trade Review",
      peekType: "trades_log",
    },
  ];

  const currentSlide = slides[activeIdx];

  const nextSlide = () => {
    setDirection(1);
    setActiveIdx((prev) => (prev + 1) % slides.length);
    setProgress(0);
  };

  const prevSlide = () => {
    setDirection(-1);
    setActiveIdx((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
  };

  const goToSlide = (index: number) => {
    setDirection(index > activeIdx ? 1 : -1);
    setActiveIdx(index);
    setProgress(0);
  };

  // 6-second auto-play timer
  useEffect(() => {
    if (!isAutoPlay || isHovered) return;

    const intervalTime = 60;
    const step = 100 / (6000 / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isAutoPlay, isHovered, activeIdx]);

  const slideVariants: any = {
    enter: (dir: number) => ({
      x: dir > 0 ? 30 : -30,
      opacity: 0,
      filter: "blur(2px)",
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.28,
        ease: "easeOut",
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 30 : -30,
      opacity: 0,
      filter: "blur(2px)",
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    }),
  };

  const getBadgeClasses = (color: IntelligenceSlide["badgeColor"]) => {
    switch (color) {
      case "emerald":
        return "bg-[#20e0b2]/15 text-[#20e0b2] border-[#20e0b2]/30";
      case "blue":
        return "bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/30";
      case "amber":
        return "bg-[#f5c451]/15 text-[#f5c451] border-[#f5c451]/30";
      case "purple":
        return "bg-[#a78bfa]/15 text-[#a78bfa] border-[#a78bfa]/30";
      default:
        return "bg-[#20e0b2]/15 text-[#20e0b2] border-[#20e0b2]/30";
    }
  };

  const handleAction = () => {
    if (currentSlide.symbol && onSelectSymbol) {
      onSelectSymbol(currentSlide.symbol);
    } else if (currentSlide.peekType && onOpenPeek) {
      onOpenPeek(currentSlide.peekType);
    }
  };

  const Icon = currentSlide.icon;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden shadow-2xl relative group"
    >
      {/* Top Animated Gradient Progress Line */}
      {isAutoPlay && !isHovered && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent overflow-hidden z-20">
          <div
            className="h-full bg-gradient-to-r from-[#20e0b2]/40 via-[#20e0b2] to-[#20e0b2]/40 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 bg-[#0c0c10]/70 backdrop-blur-md border-b border-[rgba(255,255,255,0.05)]">
        {/* Left: Section Beacon + Category Indicator */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#20e0b2] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#20e0b2]" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#f4f4f5] font-mono flex items-center gap-1.5">
              Market Intelligence Pulse
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => goToSlide(idx)}
                className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded transition-all ${
                  idx === activeIdx
                    ? "bg-[#18181f] text-white border border-[rgba(255,255,255,0.15)] font-bold shadow-sm"
                    : "text-[#71717a] hover:text-[#a1a1aa] border border-transparent"
                }`}
              >
                {s.category}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Carousel Controls (Play/Pause, Prev, Next, Counter) */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-[9px] font-mono text-[#71717a] mr-1">
            <span className="text-[#f4f4f5] font-bold">0{activeIdx + 1}</span> / 0{slides.length}
          </span>

          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`p-1 rounded border transition-all ${
              isAutoPlay
                ? "bg-[#20e0b2]/10 border-[#20e0b2]/30 text-[#20e0b2]"
                : "bg-[#141419] border-[rgba(255,255,255,0.08)] text-[#71717a] hover:text-white"
            }`}
            title={isAutoPlay ? "Pause Auto Carousel" : "Start Auto Carousel (6s)"}
          >
            {isAutoPlay ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
          </button>

          <button
            onClick={prevSlide}
            className="p-1 rounded bg-[#141419] border border-[rgba(255,255,255,0.08)] text-[#71717a] hover:text-white hover:border-[#20e0b2]/30 transition-all"
            title="Previous Insight"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>

          <button
            onClick={nextSlide}
            className="p-1 rounded bg-[#141419] border border-[rgba(255,255,255,0.08)] text-[#71717a] hover:text-white hover:border-[#20e0b2]/30 transition-all"
            title="Next Insight"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Slide Body with AnimatePresence */}
      <div className="p-3.5 sm:px-4 sm:py-3 relative overflow-hidden min-h-[58px] flex items-center">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentSlide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
          >
            <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-[#141419] border border-[rgba(255,255,255,0.07)] text-[#20e0b2] shrink-0 mt-0.5 md:mt-0">
                <Icon className="w-4 h-4 text-[#20e0b2]" />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-black tracking-wider uppercase border ${getBadgeClasses(
                      currentSlide.badgeColor
                    )}`}
                  >
                    {currentSlide.badge}
                  </span>
                  <span className="text-xs font-bold text-[#f4f4f5] font-mono truncate">
                    {currentSlide.title}
                  </span>
                </div>
                <p className="text-[11px] text-[#a1a1aa] font-mono mt-0.5 truncate max-w-[850px] leading-relaxed">
                  {currentSlide.description}
                </p>
              </div>
            </div>

            {/* Quick Action Button */}
            <button
              onClick={handleAction}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-[#20e0b2]/10 hover:bg-[#20e0b2]/20 text-[#20e0b2] border border-[#20e0b2]/30 text-[10px] font-bold font-mono transition-all flex items-center gap-1.5 self-end md:self-auto shadow-sm"
            >
              <span>{currentSlide.actionText}</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DashboardIntelligenceCarousel;
