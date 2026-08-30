"use client";

import React from "react";
import { Flame, TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface LiveWireNewsItemProps {
  id: string;
  source: string;
  time: string;
  title: string;
  summary?: string;
  isHot: boolean;
  tags?: string[];
  heatScore?: number;
  sentiment: "bullish" | "bearish" | "neutral";
  onClick?: () => void;
  selected?: boolean;
}

export function LiveWireNewsItem({
  source,
  time,
  title,
  summary,
  isHot,
  tags = [],
  heatScore = 0,
  sentiment,
  onClick,
  selected = false
}: LiveWireNewsItemProps) {
  
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${selected ? "ring-1" : ""}`} 
      style={{ 
        background: isHot ? "rgba(245,158,11,0.04)" : "var(--bg-card)",
        borderColor: selected ? (isHot ? "rgba(245,158,11,0.6)" : "var(--text-primary)") : isHot ? "rgba(245,158,11,0.2)" : "var(--border)",
        boxShadow: selected && isHot ? "0 0 20px rgba(245,158,11,0.1)" : "none"
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isHot && (
            <span className="flex items-center gap-1 bg-[#f59e0b] text-black text-[10px] uppercase font-black px-2 py-0.5 rounded shadow-[0_0_12px_rgba(245,158,11,0.5)]">
              <Flame className="w-3.5 h-3.5" /> HOT
            </span>
          )}
          <span className="text-[12px] font-bold text-[--text-primary]">&bull; {time}</span>
          <span className="text-[10px] font-bold uppercase text-[--text-tertiary]">&bull; {source} ago</span>
        </div>
        <div className="flex items-center gap-1.5">
          {sentiment === 'bullish' && <span className="text-[11px] uppercase font-bold text-[--profit] flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> Bull</span>}
          {sentiment === 'bearish' && <span className="text-[11px] uppercase font-bold text-[--loss] flex items-center"><TrendingDown className="w-3 h-3 mr-1"/> Bear</span>}
          {sentiment === 'neutral' && <span className="text-[11px] uppercase font-bold text-[--text-tertiary] flex items-center"><Minus className="w-3 h-3 mr-1"/> Neu</span>}
        </div>
      </div>
      
      <h4 className="text-[15px] font-bold text-[--text-primary] leading-relaxed mb-2 uppercase">{title}</h4>
      
      {summary && <p className="text-[12px] text-[--text-secondary] line-clamp-2 leading-relaxed mb-4">{summary}</p>}

      <div className="flex items-center justify-between mt-auto">
        <div className="flex flex-wrap gap-2">
          {tags.map((t, i) => (
             <span key={i} className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors hover:bg-[--bg-elevated]" style={{ borderColor: "var(--border-strong)", color: "var(--text-secondary)", background: "var(--bg-base)" }}>
               {t}
             </span>
          ))}
        </div>
        {heatScore > 0 && (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold border shrink-0" style={{ borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
             <Flame className="w-3 h-3" /> {heatScore}
          </span>
        )}
      </div>

    </div>
  );
}

