"use client";

import React from "react";
import { Info, RefreshCw, TrendingUp, TrendingDown, Minus, RefreshCcw } from "lucide-react";

export interface PlaybookScenario {
  label: string;
  type: "above" | "on" | "below";
  threshold1: { name: string; value: number | string };
  threshold2: { name: string; value: number | string };
  impact1: "Very Bullish" | "Bullish" | "Ranging" | "Bearish" | "Very Bearish";
  impact2: "Very Bullish" | "Bullish" | "Ranging" | "Bearish" | "Very Bearish";
}

export interface PlaybookProps {
  title: string;
  countryCode: "US" | "EU" | "UK" | "JP" | "AU" | "CA" | "CH" | "NZ";
  timeFormatted: string;
  impactLevel: "high" | "medium" | "low";
  countdown: string;
  inFocus?: boolean;
  bullets: string[];
  impactedCurrency: string;
  scenarios: PlaybookScenario[];
  aiFootnote?: string;
  onRefresh?: () => void;
}

const FLAGS: Record<string, string> = {
  US: "🇺🇸", EU: "🇪🇺", UK: "🇬🇧", JP: "🇯🇵", AU: "🇦🇺", CA: "🇨🇦", CH: "🇨🇭", NZ: "🇳🇿"
};

export function EventPlaybook({
  title,
  countryCode,
  timeFormatted,
  impactLevel,
  countdown,
  inFocus = true,
  bullets,
  impactedCurrency,
  scenarios,
  aiFootnote,
  onRefresh
}: PlaybookProps) {
  const isHigh = impactLevel === "high";

  // Helpers for impact color coding
  const getColor = (impact: string) => {
    switch (impact) {
      case "Very Bullish": return "var(--profit)"; // Usually bright green
      case "Bullish": return "var(--profit)";
      case "Ranging": return "var(--text-tertiary)";
      case "Bearish": return "var(--loss)";
      case "Very Bearish": return "var(--loss)";
      default: return "var(--text-primary)";
    }
  };

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[18px] font-bold tracking-tight text-[--text-primary] flex items-center gap-2">
          {title}
          <Info className="w-4 h-4 text-[--text-tertiary] cursor-pointer" />
        </h2>
        {onRefresh && (
          <button 
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border hover:bg-[--bg-elevated] transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-base)" }}
          >
            <RefreshCw className="w-3 h-3" /> Generate ▾
          </button>
        )}
      </div>

      {/* Meta Info */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
        <span className="flex items-center gap-1.5"><span className="text-[14px]">{FLAGS[countryCode] || "🇺🇳"}</span> {countryCode === "US" ? "United States" : countryCode}</span>
        <span>•</span>
        <span>{timeFormatted}</span>
        <span>•</span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isHigh ? "bg-[--loss] shadow-[0_0_8px_rgba(255,77,106,0.8)]" : impactLevel === "medium" ? "bg-[--warning]" : "bg-[--text-tertiary]"}`} />
          <span style={{ color: isHigh ? "var(--loss)" : "inherit" }}>{impactLevel.charAt(0).toUpperCase() + impactLevel.slice(1)}</span>
        </span>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border" style={{ borderColor: "rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.05)", color: "#c084fc" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" /> {countdown}
        </div>
        {inFocus && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border" style={{ borderColor: "rgba(0,212,161,0.3)", background: "rgba(0,212,161,0.05)", color: "var(--profit)" }}>
            <span className="w-4 h-4 rounded-full border border-[--profit] flex items-center justify-center"><div className="w-1.5 h-1.5 bg-[--profit] rounded-full" /></span> In Focus
          </div>
        )}
      </div>

      {/* Bullets */}
      <ul className="space-y-2.5 mb-6 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-[--text-tertiary] mt-1.5">•</span>
            {b}
          </li>
        ))}
      </ul>

      {/* Playbook Table */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12px] font-black tracking-widest text-[--text-tertiary] uppercase">Playbook</h3>
          <div className="text-[11px] font-medium text-[--text-secondary] flex items-center gap-1.5">
            Impacted currency <span className="text-[13px]">{FLAGS[impactedCurrency.slice(0, 2)] || "💵"}</span> <span className="font-bold text-[--text-primary]">{impactedCurrency}</span>
          </div>
        </div>

        <div className="space-y-1">
          {scenarios.map((s, i) => {
            const isAbv = s.type === "above";
            const isBel = s.type === "below";

            return (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-transparent transition-colors hover:bg-[--bg-elevated]">
                
                {/* Type Label */}
                <div className="w-[100px] flex items-center gap-2 font-bold text-[13px]" style={{ color: "var(--text-primary)" }}>
                  {isAbv && <TrendingUp className="w-4 h-4 text-[--profit]" />}
                  {isBel && <TrendingDown className="w-4 h-4 text-[--loss]" />}
                  {!isAbv && !isBel && <Minus className="w-4 h-4 text-[--text-tertiary]" />}
                  {s.label}
                </div>

                {/* Thresholds */}
                <div className="flex-1 flex flex-col gap-1 items-center justify-center">
                  <div className="flex items-center justify-between w-[120px]">
                    <span className="text-[9px] font-bold uppercase text-[--text-tertiary] tracking-widest">{s.threshold1.name}</span>
                    <span className="text-[12px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: isAbv ? "var(--profit)" : isBel ? "var(--loss)" : "var(--text-primary)" }}>
                      {s.threshold1.value}
                    </span>
                  </div>
                  <div className="flex items-center justify-between w-[120px]">
                    <span className="text-[9px] font-bold uppercase text-[--text-tertiary] tracking-widest">{s.threshold2.name}</span>
                    <span className="text-[12px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: isAbv ? "var(--profit)" : isBel ? "var(--loss)" : "var(--text-primary)" }}>
                      {s.threshold2.value}
                    </span>
                  </div>
                </div>

                {/* Impacts */}
                <div className="w-[100px] flex flex-col items-end gap-1.5 text-[12px] font-bold">
                  <span style={{ color: getColor(s.impact1) }}>{s.impact1}</span>
                  <span style={{ color: getColor(s.impact2) }}>{s.impact2}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Alert */}
      {aiFootnote && (
        <div className="mt-4 p-3 rounded-xl border flex items-start gap-3" style={{ background: "rgba(168,85,247,0.03)", borderColor: "rgba(168,85,247,0.2)" }}>
           <Info className="w-4 h-4 shrink-0 text-[#c084fc] mt-0.5" />
           <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
             {aiFootnote}
           </p>
        </div>
      )}

    </div>
  );
}
