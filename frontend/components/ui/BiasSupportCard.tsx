"use client";

import React from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";

export interface BiasSupportCardProps {
  bias: "Bullish" | "Bearish" | "Neutral";
  bullets: string[];
}

export function BiasSupportCard({ bias, bullets }: BiasSupportCardProps) {
  const isBullish = bias === "Bullish";
  const isBearish = bias === "Bearish";
  
  const accentColor = isBullish ? "var(--profit)" : isBearish ? "var(--loss)" : "var(--text-tertiary)";
  const accentGlow = isBullish ? "rgba(0,212,161,0.2)" : isBearish ? "rgba(255,77,106,0.2)" : "rgba(160,160,184,0.2)";

  return (
    <div 
      className="relative rounded-lg p-5 overflow-hidden transition-all duration-300 group"
      style={{ 
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.4)"
      }}
    >
      {/* Top right glowing accent gradient */}
      <div 
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] opacity-60 transition-opacity group-hover:opacity-100"
        style={{ background: accentColor }}
      />
      
      {/* Subtle border top glow overlay */}
      <div 
        className="absolute inset-x-0 top-0 h-[1px]"
        style={{ 
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          opacity: 0.5
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <h3 
          className="text-[16px] font-bold tracking-tight mb-4 flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          What supports the {bias.toLowerCase()} bias?
        </h3>

        <ul className="space-y-3">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1" style={{ color: accentColor }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
              <p className="text-[13px] leading-relaxed font-medium" style={{ color: "var(--text-secondary)" }}>
                {b}
              </p>
            </li>
          ))}
        </ul>
        
        {bullets.length === 0 && (
          <div className="py-6 text-center text-[12px] italic text-[--text-tertiary]">
            Awaiting AI synthesis...
          </div>
        )}
      </div>
    </div>
  );
}

