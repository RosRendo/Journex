"use client";

import Link from "next/link";
import { motion, Float } from "./Reveal";
import type { ReactNode } from "react";
import { Activity, ShieldCheck, Zap, ArrowUpRight, CheckCircle2 } from "lucide-react";

/* ── Shared mini-components for the hero composition ─────────────────── */

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-white/[0.09] bg-[#0c0c14] shadow-2xl ${className}`}
    >
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "pos" | "neg";
}) {
  const color =
    tone === "pos"
      ? "text-[#20e0b2]"
      : tone === "neg"
        ? "text-[#ff5c73]"
        : "text-zinc-200";
  return (
    <div className="min-w-0 px-3.5 py-2.5">
      <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className={`mt-0.5 truncate text-[15px] font-mono font-bold tracking-tight ${color}`}>
        {value}
      </p>
    </div>
  );
}

const TRADES = [
  { pair: "XAUUSD", setup: "London Asian Sweep + MSS", r: "+2.8R", side: "BUY", lot: "0.50" },
  { pair: "EURUSD", setup: "Session VWAP Extension", r: "+1.9R", side: "BUY", lot: "1.00" },
  { pair: "US100", setup: "Opening Range Reversal", r: "-1.0R", side: "SELL", lot: "0.20" },
  { pair: "GBPUSD", setup: "HTF Confluence Breakout", r: "+3.2R", side: "BUY", lot: "0.80" },
] as const;

function TradeRows() {
  return (
    <div className="divide-y divide-white/[0.05]">
      {TRADES.map((t) => (
        <div key={t.pair} className="flex items-center justify-between gap-3 px-3.5 py-2 hover:bg-white/[0.02] transition-colors">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider ${
                t.side === "BUY"
                  ? "bg-[#20e0b2]/10 text-[#20e0b2] border border-[#20e0b2]/20"
                  : "bg-[#ff5c73]/10 text-[#ff5c73] border border-[#ff5c73]/20"
              }`}
            >
              {t.side}
            </span>
            <span className="text-[11px] font-mono font-bold text-white tracking-tight">{t.pair}</span>
            <span className="hidden truncate text-[10px] text-zinc-500 sm:inline">
              {t.setup}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9.5px] font-mono text-zinc-500">{t.lot} lots</span>
            <span
              className={`font-mono text-[11px] font-bold ${
                t.r.startsWith("-") ? "text-[#ff5c73]" : "text-[#20e0b2]"
              }`}
            >
              {t.r}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── The workspace composition ────────────────────────────────────────── */

function WorkspacePreview() {
  return (
    <div className="relative mx-auto max-w-[560px] select-none lg:max-w-none">
      {/* Main panel: overview + equity curve */}
      <Panel>
        <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#09090f] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#20e0b2] animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-zinc-200">
              Journex Cockpit · MT5 Live Telemetry
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#20e0b2]/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#20e0b2] border border-[#20e0b2]/25 font-bold">
              Sub-second Tick Sync
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 bg-[#08080e] sm:grid-cols-4 sm:divide-x sm:divide-white/[0.06]">
          <Kpi label="Profit Factor" value="2.34" tone="pos" />
          <Kpi label="Win Rate" value="68.4%" tone="pos" />
          <Kpi label="Avg R:R" value="1:2.8" tone="pos" />
          <Kpi label="Expectancy" value="+$184/tr" tone="pos" />
        </div>

        {/* Equity curve with draw-on animation */}
        <div className="border-t border-white/[0.07] bg-[#090911] px-4 py-4">
          <div className="mb-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-400">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Activity className="w-3 h-3 text-[#20e0b2]" />
              Account Cumulative Equity (MT5 Verified)
            </span>
            <span className="rounded bg-[#20e0b2]/10 px-2 py-0.5 text-[#20e0b2] border border-[#20e0b2]/20 font-bold">
              +28.4% Net
            </span>
          </div>
          <svg
            viewBox="0 0 560 170"
            className="h-36 w-full sm:h-40"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="heroDarkMintFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#20e0b2" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#20e0b2" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[45, 90, 135].map((y) => (
              <line
                key={y}
                x1="0"
                x2="560"
                y1={y}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="3 3"
              />
            ))}
            <path
              d="M0 148 L47 146 L94 138 L141 140 L188 128 L235 130 L282 118 L329 106 L376 112 L423 94 L470 78 L517 70 L560 48 L560 170 L0 170 Z"
              fill="url(#heroDarkMintFill)"
            />
            <motion.path
              d="M0 148 L47 146 L94 138 L141 140 L188 128 L235 130 L282 118 L329 106 L376 112 L423 94 L470 78 L517 70 L560 48"
              stroke="#20e0b2"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, delay: 0.5, ease: "easeInOut" }}
            />
          </svg>
          <div className="mt-2 flex justify-between font-mono text-[9px] text-zinc-500">
            <span>Session 01 · London</span>
            <span className="text-zinc-400">Max DD: -1.2% (Risk Gate Active)</span>
            <span className="text-[#20e0b2] font-bold">New High Today</span>
          </div>
        </div>
      </Panel>

      {/* Floating chip: quantitative confluence */}
      <Float
        distance={6}
        duration={8}
        className="absolute -top-7 right-6 z-10 hidden w-44 sm:block"
      >
        <Panel className="px-3.5 py-3 border-[#20e0b2]/30 bg-[#0d0d18]/95 shadow-[0_0_25px_rgba(32,224,178,0.15)]">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-zinc-400">
              Confluence Engine
            </p>
            <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-ping" />
          </div>
          <div className="mt-1 flex items-end justify-between">
            <span className="text-xl font-mono font-bold tracking-tight text-[#20e0b2]">88%</span>
            <span className="text-[10px] font-mono uppercase font-bold text-zinc-300">
              BULLISH GC
            </span>
          </div>
        </Panel>
      </Float>

      {/* Overlapping panel: recent trades */}
      <Float
        distance={5}
        duration={6.5}
        delay={0.8}
        className="absolute -bottom-8 -left-3 z-10 w-[285px] sm:-left-8 sm:w-[340px]"
      >
        <Panel className="border-white/10 bg-[#0c0c16]/95">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-3.5 py-2 bg-[#090910]">
            <span className="text-[11px] font-mono font-bold text-zinc-200">Real Execution Ledger</span>
            <span className="font-mono text-[8.5px] text-[#20e0b2] bg-[#20e0b2]/10 px-1.5 py-0.2 rounded border border-[#20e0b2]/20">
              MT5 Bridge Active
            </span>
          </div>
          <TradeRows />
        </Panel>
      </Float>
    </div>
  );
}

/* ── Hero section ─────────────────────────────────────────────────────── */

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-10 pb-20">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-5 pb-24 pt-12 sm:px-8 lg:grid-cols-12 lg:pb-28 lg:pt-20">
        {/* Copy */}
        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-4 inline-flex items-center gap-2 rounded-md border border-[#20e0b2]/30 bg-[#20e0b2]/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#20e0b2]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-pulse" />
            MetaTrader 5 Real-Time Telemetry
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-6xl text-white"
          >
            Stop guessing.
            <br />
            <span className="text-[#20e0b2]">
              Execute with edge.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-400"
          >
            The institutional trading desk and analytical journal built specifically for MetaTrader 5 traders.
            Live COMEX order flow, multi-timeframe quantitative engines, and automated drawdown protection.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/dashboard"
              className="rounded-xl bg-[#20e0b2] hover:bg-[#1bc79e] px-5 py-3 text-sm font-bold text-black transition-all shadow-[0_0_24px_rgba(32,224,178,0.35)] hover:shadow-[0_0_32px_rgba(32,224,178,0.55)] flex items-center gap-2"
            >
              <span>Launch Live Cockpit</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <a
              href="#showcase"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white"
            >
              Explore Workspace
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-5 flex items-center gap-4 text-xs font-mono text-zinc-500"
          >
            <span className="flex items-center gap-1.5 text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#20e0b2]" />
              Zero Mock Fallback
            </span>
            <span className="text-zinc-600">•</span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#20e0b2]" />
              Direct Broker Telemetry
            </span>
          </motion.div>
        </div>

        {/* Product composition */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-7 lg:pl-6"
        >
          <WorkspacePreview />
        </motion.div>
      </div>
    </section>
  );
}
