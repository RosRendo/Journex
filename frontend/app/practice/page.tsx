"use client";

import React, { useState } from "react";
import FixedTradingSimulator from "@/components/FixedTradingSimulator";
import FlexibleTradingSimulator from "@/components/FlexibleTradingSimulator";

export default function PracticeTerminal() {
  const [activeTab, setActiveTab] = useState<"fixed" | "flexible">("fixed");

  const tabs = [
    { id: "fixed", label: "Fixed Challenge", desc: "Prop firm fixed-rule simulation" },
    { id: "flexible", label: "Flexible Rules", desc: "Custom margin and flexible rule practice" },
  ] as const;

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col pb-12 font-sans">

      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-20 bg-[#09090b]">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#f4f4f5]">Practice Terminal</h1>
          <p className="text-[9px] font-bold uppercase tracking-widest font-mono text-[#71717a] mt-0.5">
            {tabs.find(t => t.id === activeTab)?.desc}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-l border-[rgba(255,255,255,0.07)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-[#20e0b2] text-[#20e0b2]"
                  : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode indicator strip */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-[rgba(255,255,255,0.07)] bg-[#101014]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-pulse" />
        <span className="text-[9px] font-bold uppercase tracking-widest font-mono text-[#71717a]">
          Simulation Mode Active
        </span>
        <span className="text-[rgba(255,255,255,0.07)]">·</span>
        <span className="text-[9px] font-mono text-[#71717a]">No real funds at risk</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="px-2 py-0.5 rounded border border-[rgba(245,196,81,0.2)] bg-[rgba(245,196,81,0.06)]">
            <span className="text-[8px] font-bold uppercase tracking-widest font-mono text-[#f5c451]">
              {activeTab === "fixed" ? "FIXED CHALLENGE" : "FLEXIBLE RULES"}
            </span>
          </div>
        </div>
      </div>

      {/* ── WORKSPACE ── */}
      <div className="flex-1 w-full">
        {activeTab === "fixed" && <FixedTradingSimulator />}
        {activeTab === "flexible" && <FlexibleTradingSimulator />}
      </div>
    </div>
  );
}
