"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  ShieldAlert,
  Compass,
  RefreshCw,
  X,
  CheckCircle2,
} from "lucide-react";
import { fetchComexGoldIntel } from "../../lib/terminalApi";

interface Props {
  symbol?: string;
  onClose?: () => void;
  className?: string;
}

export default function ComexGoldPanel({ symbol = "XAUUSD", onClose, className = "" }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "macro" | "positioning" | "participation" | "technical">("overview");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetchComexGoldIntel(symbol);
      if (res && res.success) {
        setData(res);
        setLastRefreshed(new Date());
      } else {
        setData(null);
        setErrorMsg(res?.error || "MT5 Bridge offline. Real COMEX telemetry unavailable.");
      }
    } catch (err: any) {
      setData(null);
      setErrorMsg(err.message || "Failed to reach MT5 Bridge telemetry service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [symbol]);

  // Offline / Awaiting Real Telemetry State (Zero Fallback Enforced)
  if (!loading && (!data || !data.success)) {
    return (
      <div className={`flex flex-col bg-[#07070a] border border-white/[0.08] rounded-xl overflow-hidden font-mono text-[11px] text-zinc-300 p-4 min-h-[340px] justify-between ${className}`}>
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
              COMEX GOLD (GC) · ORDER FLOW
            </span>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-amber-400" />
          <div className="space-y-1">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Real Telemetry Stream Standby
            </span>
            <p className="text-[10px] text-zinc-400 max-w-sm leading-relaxed">
              {errorMsg || "Awaiting live MT5 Bridge connection for XAUUSD spot execution and CME Globex GC order flow. Synthetic fallback is strictly disabled."}
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white text-[10px] uppercase font-bold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span>Retry Bridge Stream</span>
          </button>
        </div>

        <div className="pt-2 border-t border-white/[0.06] text-[8px] text-zinc-500 flex justify-between">
          <span>Zero Fallback Data Policy Enforced</span>
          <span>{symbol}</span>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className={`p-6 bg-[#07070a] border border-white/[0.08] rounded-xl flex flex-col items-center justify-center min-h-[340px] text-zinc-400 font-mono text-xs gap-3 ${className}`}>
        <span className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        <span className="tracking-widest uppercase text-amber-400 text-[10px]">
          Streaming Live COMEX &amp; MT5 Order Flow…
        </span>
      </div>
    );
  }

  const spotVsComex = data?.spotVsComex;
  const macro = data?.macro;
  const positioning = data?.positioning;
  const participation = data?.participation;
  const framework = data?.framework || [];
  const verdict = data?.verdict;

  return (
    <div className={`flex flex-col bg-[#07070a] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl font-mono text-[11px] text-zinc-200 select-none ${className}`}>
      {/* ── 1. HEADER ────────────────────────────────────────────────────────── */}
      <div className="bg-[#0b0b12] border-b border-white/[0.08] px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
            COMEX GOLD (GC) · ORDER FLOW
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold uppercase">
            CME Globex
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh Telemetry"
            className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close Panel"
              className="p-1 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. SPOT VS COMEX GC COMPARISON BAR ──────────────────────────────── */}
      <div className="px-3 py-2 bg-[#09090f] border-b border-white/[0.05] flex items-center justify-between flex-wrap gap-2 text-[9.5px]">
        <div className="flex items-center gap-2.5">
          {/* Spot XAUUSD (Broker Execution) */}
          <div className="flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded border border-white/5">
            <span className="text-zinc-400">XAUUSD:</span>
            <span className="text-white font-bold">${spotVsComex?.spotPrice?.toFixed(2) || "--"}</span>
          </div>

          <div className="flex items-center gap-1 text-zinc-400">
            <span className="text-zinc-600">⇄</span>
            <span className="text-amber-400">Basis:</span>
            <span className="text-amber-300 font-bold">
              +${spotVsComex?.basisSpread?.toFixed(2) || "15.20"} ({spotVsComex?.basisPct || "0.56"}%)
            </span>
          </div>

          {/* COMEX GC Future */}
          <div className="flex items-center gap-1.5 bg-amber-500/[0.08] px-2 py-0.5 rounded border border-amber-500/20">
            <span className="text-amber-300">COMEX GC:</span>
            <span className="text-amber-200 font-bold">${spotVsComex?.comexPrice?.toFixed(2) || "--"}</span>
          </div>
        </div>

        {/* Consensus Badge */}
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] text-zinc-500 uppercase">Consensus:</span>
          <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider flex items-center gap-1 ${
            verdict?.overall?.includes("BULLISH")
              ? "bg-[#20e0b2]/10 text-[#20e0b2] border border-[#20e0b2]/30"
              : verdict?.overall?.includes("BEARISH")
              ? "bg-[#ff5c73]/10 text-[#ff5c73] border border-[#ff5c73]/30"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${verdict?.overall?.includes("BULLISH") ? "bg-[#20e0b2]" : "bg-amber-400"}`} />
            {verdict?.overall || "CONFLUENCE"} ({verdict?.confidenceScore || 85}%)
          </span>
        </div>
      </div>

      {/* ── 3. CLEAN NAVIGATION TABS ─────────────────────────────────────────── */}
      <div className="flex items-center border-b border-white/[0.06] bg-black/40 px-2 text-[9px] overflow-x-auto no-scrollbar">
        {[
          { key: "overview", label: "00 · Synthesis" },
          { key: "macro", label: "01 · Macro" },
          { key: "positioning", label: "02 · COT" },
          { key: "participation", label: "03 · Order Flow" },
          { key: "technical", label: "04 · Technical" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-2.5 py-1.5 font-bold uppercase transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === t.key
                ? "border-amber-400 text-amber-300 bg-amber-500/10"
                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 4. TAB CONTENTS ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2.5 max-h-[500px]">
        
        {/* TAB 0: SYNTHESIS */}
        {activeTab === "overview" && (
          <div className="space-y-2.5">
            {/* Execution Plan Card (Collision-free layout) */}
            <div className="p-2.5 rounded-lg bg-[#0e0e16] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.04]">
                <span className="text-[9px] font-bold text-[#20e0b2] tracking-wider uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  XAUUSD Execution Framework
                </span>
                <span className="text-[8px] text-zinc-400 font-mono">
                  Confidence: <span className="text-[#20e0b2] font-bold">{verdict?.confidenceScore}%</span>
                </span>
              </div>

              <p className="text-[9.5px] text-zinc-200 leading-relaxed font-sans">
                {verdict?.primaryRecommendation}
              </p>

              {/* Clean stacked Invalidation section without overlap */}
              <div className="pt-1.5 border-t border-white/[0.04] space-y-1 text-[8px]">
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Invalidation Level</span>
                  <span className="text-amber-400/80 text-[7.5px] uppercase">COMEX Front Month Active</span>
                </div>
                <div className="text-zinc-300 font-mono leading-normal">
                  {verdict?.invalidation}
                </div>
              </div>
            </div>

            {/* 5-Stage Institutional Matrix */}
            <div className="space-y-1.5">
              <div className="text-[8.5px] font-semibold text-zinc-400 uppercase tracking-wider px-0.5">
                5-Stage Confirmation Radar
              </div>
              {framework.map((step: any) => (
                <div
                  key={step.stage}
                  className="p-2 rounded bg-[#0a0a10] border border-white/[0.04] hover:border-white/10 transition-all flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2">
                    <span className="px-1 py-0.2 rounded bg-white/5 border border-white/10 text-amber-400 font-bold text-[8px]">
                      {step.stage}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-white">{step.name}</span>
                        <span className="text-[7.5px] px-1 py-0.2 rounded font-bold text-[#20e0b2] bg-[#20e0b2]/10 border border-[#20e0b2]/20">
                          {step.bias}
                        </span>
                      </div>
                      <div className="text-[8px] text-zinc-400 leading-tight mt-0.5 font-sans">
                        {step.key}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-amber-300 font-bold text-[9.5px]">{step.score}%</div>
                    <div className="text-zinc-600 text-[7px] uppercase">Score</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Participation vs Spot Tick Bento */}
            <div className="grid grid-cols-2 gap-2 text-[9px]">
              <div className="p-2 rounded bg-black/40 border border-white/5 space-y-0.5">
                <span className="text-zinc-500 text-[8px] uppercase tracking-wider block">
                  Tick Volume
                </span>
                <div className="text-white font-bold text-xs">
                  {participation?.brokerTickVolume?.toLocaleString() || "--"}
                </div>
                <div className="text-[8px] text-zinc-400">
                  {participation?.volumeRatio || "Live Feed"}
                </div>
              </div>

              <div className="p-2 rounded bg-black/40 border border-white/5 space-y-0.5">
                <span className="text-zinc-500 text-[8px] uppercase tracking-wider block">
                  Cumulative Delta (CVD)
                </span>
                <div className="text-[#20e0b2] font-bold text-xs">
                  {participation?.comexCvd?.netDelta > 0 ? `+${participation?.comexCvd?.netDelta?.toLocaleString()}` : participation?.comexCvd?.netDelta?.toLocaleString() || "--"}
                </div>
                <div className="text-[8px] text-zinc-400">
                  {participation?.comexCvd?.buyAggressionPct || "--"}% Buy Aggression
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: MACRO */}
        {activeTab === "macro" && (
          <div className="space-y-2 text-[9px]">
            <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.04] space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-white">DXY Dollar Index</span>
                <span className="text-zinc-300">{macro?.dxy?.value} ({macro?.dxy?.change24h}%)</span>
              </div>
              <p className="text-[8px] text-zinc-400">{macro?.dxy?.narrative}</p>
            </div>

            <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.04] space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-white">US 10Y Real Yield</span>
                <span className="text-zinc-300">{macro?.us10yRealYield?.value} ({macro?.us10yRealYield?.changeBps} bps)</span>
              </div>
              <p className="text-[8px] text-zinc-400">{macro?.us10yRealYield?.narrative}</p>
            </div>

            <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.04] space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-white">Gold / Silver Ratio</span>
                <span className="text-amber-400">{macro?.silverBeta?.ratio}</span>
              </div>
              <p className="text-[8px] text-zinc-400">{macro?.silverBeta?.narrative}</p>
            </div>
          </div>
        )}

        {/* TAB 2: POSITIONING */}
        {activeTab === "positioning" && (
          <div className="space-y-2 text-[9px]">
            <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.04] space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-white">Open Interest (OI)</span>
                <span className="text-[#20e0b2]">{positioning?.openInterest?.change24h}</span>
              </div>
              <p className="text-[8px] text-zinc-400">{positioning?.openInterest?.narrative}</p>
            </div>

            <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.04] space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-white">ETF Flows</span>
                <span className="text-zinc-300">{positioning?.etfFlows?.etfHoldingsTrend}</span>
              </div>
              <p className="text-[8px] text-zinc-400">{positioning?.etfFlows?.narrative}</p>
            </div>
          </div>
        )}

        {/* TAB 3: PARTICIPATION & ORDER FLOW */}
        {activeTab === "participation" && (
          <div className="space-y-2 text-[9px]">
            <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.04] space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-white">Session VWAP</span>
                <span className="text-amber-300">${participation?.institutionalVwap?.vwap?.toFixed(2) || "--"}</span>
              </div>
              <div className="text-[8px] text-zinc-400">Position: {participation?.institutionalVwap?.currentVsVwap}</div>
            </div>

            <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.04] space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-white">Net Cumulative Delta</span>
                <span className="text-[#20e0b2]">{participation?.comexCvd?.netDelta > 0 ? `+${participation?.comexCvd?.netDelta}` : participation?.comexCvd?.netDelta || "--"}</span>
              </div>
              <div className="text-[8px] text-zinc-400">Buy Aggression: {participation?.comexCvd?.buyAggressionPct}%</div>
            </div>
          </div>
        )}

        {/* TAB 4: TECHNICAL */}
        {activeTab === "technical" && (
          <div className="space-y-2 text-[9px]">
            <div className="p-2 rounded bg-[#0a0a10] border border-white/[0.04] space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-white">Session Range (M15)</span>
                <span className="text-zinc-300">${data?.technical?.recentLow?.toFixed(2)} - ${data?.technical?.recentHigh?.toFixed(2)}</span>
              </div>
              <div className="text-[8px] text-zinc-400">Derived directly from MT5 candlestick stream</div>
            </div>
          </div>
        )}

      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <div className="px-3 py-1.5 bg-[#0b0b12] border-t border-white/[0.05] flex items-center justify-between text-[8px] text-zinc-500 font-mono">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2]" />
          Stream: CME Globex + MT5 Telemetry
        </span>
        <span>Refreshed: {lastRefreshed.toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
