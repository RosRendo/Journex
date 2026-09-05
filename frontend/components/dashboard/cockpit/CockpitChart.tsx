"use client";

import React, { useState } from "react";
import TradingViewWidget from "@/components/ui/TradingViewWidget";
import { Maximize2, Minimize2, Eye, Sliders, Layers, RefreshCw, BarChart2 } from "lucide-react";

interface CockpitChartProps {
  symbol: string;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onOpenPeek?: (type: string, data?: any) => void;
}

const TIMEFRAMES = [
  { label: "M5", value: "5" },
  { label: "M15", value: "15" },
  { label: "H1", value: "60" },
  { label: "H4", value: "240" },
  { label: "D1", value: "D" },
];

export const CockpitChart: React.FC<CockpitChartProps> = ({
  symbol,
  isMaximized = false,
  onToggleMaximize,
  onOpenPeek,
}) => {
  const [timeframe, setTimeframe] = useState<string>("15");
  const [activeOverlays, setActiveOverlays] = useState<Record<string, boolean>>({
    fvg: true,
    ob: true,
    liquidity: true,
    eq: false,
  });

  const toggleOverlay = (key: string) => {
    setActiveOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col h-full bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden shadow-2xl relative group">
      {/* Cockpit Chart Controls Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.07)] bg-[#141419]/90 backdrop-blur-md z-10 gap-2">
        {/* Left: Active Asset & TF */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black font-mono tracking-tight text-[#f4f4f5]">
              {symbol}
            </span>
            <span className="text-[10px] uppercase font-bold text-[#71717a] font-mono border-l border-[rgba(255,255,255,0.08)] pl-2">
              AdaptiveICT Pro Chart
            </span>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center bg-[#09090b] border border-[rgba(255,255,255,0.07)] rounded-lg p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
                  timeframe === tf.value
                    ? "bg-[#20e0b2] text-[#09090b] shadow-sm font-black"
                    : "text-[#71717a] hover:text-[#f4f4f5]"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: ICT Concept Overlays & Controls */}
        <div className="flex items-center gap-2">
          {/* Overlay Pills */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#09090b]/80 border border-[rgba(255,255,255,0.06)] rounded-lg px-2 py-1">
            <span className="text-[8px] uppercase tracking-widest font-black text-[#71717a] font-mono mr-1">
              ICT Overlays:
            </span>
            {[
              { id: "fvg", label: "FVG" },
              { id: "ob", label: "Order Block" },
              { id: "liquidity", label: "Liquidity Pools" },
              { id: "eq", label: "50% Equilibrium" },
            ].map((ov) => (
              <button
                key={ov.id}
                onClick={() => toggleOverlay(ov.id)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-all ${
                  activeOverlays[ov.id]
                    ? "bg-[#20e0b2]/15 text-[#20e0b2] border border-[#20e0b2]/30"
                    : "text-[#71717a] hover:text-[#a1a1aa] border border-transparent"
                }`}
              >
                {ov.label}
              </button>
            ))}
          </div>

          {/* Macro Desk Deep Investigation Link */}
          <a
            href={`/macro/${symbol.toLowerCase()}`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#20e0b2]/10 hover:bg-[#20e0b2]/20 border border-[#20e0b2]/30 text-[#20e0b2] text-[10px] font-black font-mono uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(32,224,178,0.1)]"
            title={`Investigate full institutional context and market state for ${symbol}`}
          >
            <span>Macro Desk</span>
            <span className="text-xs">↗</span>
          </a>

          {/* Maximize Toggle */}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#101014] text-[#a1a1aa] hover:text-white hover:border-[#20e0b2]/40 transition-all"
              title={isMaximized ? "Restore Default Workspace" : "Sniper Focus Mode"}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="flex-1 w-full min-h-[380px] bg-[#09090b] relative">
        <TradingViewWidget
          symbol={symbol}
          interval={timeframe}
          height="100%"
          containerClassName="h-full w-full"
        />

        {/* Floating Active Setup Badge */}
        <div className="absolute bottom-3 left-3 pointer-events-auto bg-[#101014]/90 border border-[rgba(255,255,255,0.09)] backdrop-blur-md rounded-lg px-3 py-1.5 flex items-center gap-3 shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-ping" />
            <span className="text-[10px] font-black font-mono uppercase text-[#20e0b2]">
              Live Engine Active
            </span>
          </div>
          <span className="w-px h-3 bg-[rgba(255,255,255,0.1)]" />
          <button
            onClick={() => onOpenPeek?.("setup_inspector", { symbol })}
            className="text-[10px] font-bold text-[#a1a1aa] hover:text-white transition-colors underline decoration-dotted"
          >
            Inspect Active Confluences ↗
          </button>
        </div>
      </div>
    </div>
  );
};
export default CockpitChart;
