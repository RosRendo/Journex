"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, ChartCandlestick, ClipboardCheck, FlaskConical, PlugZap, ShieldCheck, Sparkles, Activity, Layers } from "lucide-react";
import { Float, Reveal } from "./Reveal";

function FeatureLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[13px] font-mono font-bold text-[#20e0b2] hover:text-[#20e0b2]/80 transition-colors"
    >
      {label} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

/* Split feature: MT5 auto-journaling */
function MT5Split() {
  return (
    <Reveal className="lg:col-span-12">
      <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c14]/90 lg:grid-cols-12 shadow-2xl">
        <div className="flex flex-col justify-between p-7 sm:p-9 lg:col-span-6 bg-[#090910]">
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#20e0b2]/10 border border-[#20e0b2]/30 text-[#20e0b2] shadow-[0_0_15px_rgba(32,224,178,0.25)]">
              <PlugZap className="h-5 w-5 text-[#20e0b2]" />
            </span>
            <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
              Real-Time Execution, Direct from MetaTrader 5
            </h3>
            <p className="mt-2.5 max-w-md text-[14px] leading-relaxed text-zinc-400">
              Connect your MetaTrader 5 account via the high-speed Python bridge. Journex records every fill,
              slippage point, tick volume, and fee live from your broker — completely automated.
            </p>
          </div>
          <ul className="mt-6 space-y-2.5 text-[13px] text-zinc-300 font-mono">
            {[
              "Sub-second tick streaming & equity balance telemetry",
              "Automated model tagging & invalidation detection",
              "Zero mock placeholders — verified broker fills only",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#20e0b2] shadow-[0_0_6px_#20e0b2]" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <FeatureLink href="/dashboard" label="Launch trading radar" />
          </div>
        </div>

        {/* Visual: bridge activity log style card */}
        <div className="relative border-t border-white/[0.08] bg-[#070709] p-6 sm:p-9 lg:col-span-6 lg:border-l lg:border-t-0 flex items-center justify-center">
          <Float distance={5} duration={8} className="w-full">
            <div className="rounded-xl border border-white/[0.08] bg-[#0d0d16] p-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#20e0b2] animate-pulse" />
                  <span className="text-[12px] font-mono font-bold text-white">MT5 Live Event Stream</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#20e0b2] bg-[#20e0b2]/10 px-2 py-0.5 rounded border border-[#20e0b2]/20 font-bold">
                  Connected
                </span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {[
                  { t: "XAUUSD", s: "ORDER #434447746 BUY 0.50 lots @ 2,735.40 · Tagged MSS Sweep", r: "+$1,340" },
                  { t: "EURUSD", s: "ORDER #434447748 BUY 1.00 lots @ 1.0842 · Session VWAP Test", r: "+$580" },
                  { t: "US100", s: "ORDER #434447750 SELL 0.20 lots @ 20,410 · Risk Gate Enforced", r: "−$320" },
                ].map((row) => (
                  <div key={row.s} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-[#20e0b2]/10 text-[#20e0b2] shrink-0 font-mono text-[10px] font-bold">
                        {row.t.slice(0, 3)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-mono font-bold text-white tracking-tight">{row.t}</p>
                        <p className="truncate text-[10.5px] font-mono text-zinc-500">{row.s}</p>
                      </div>
                    </div>
                    <span className={`font-mono text-[11px] font-bold shrink-0 ${row.r.startsWith("−") ? "text-[#ff5c73]" : "text-[#20e0b2]"}`}>
                      {row.r}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-[10.5px] text-zinc-400 flex items-center justify-between">
                <span>Session Confluence: 88% Positive</span>
                <span className="text-[#20e0b2] font-bold">CVD +14.8K GC</span>
              </div>
            </div>
          </Float>
        </div>
      </div>
    </Reveal>
  );
}

type Feat = {
  icon: typeof BookOpen;
  title: string;
  body: string;
  href: string;
  link: string;
};

const GRID_A: Feat[] = [
  {
    icon: Activity,
    title: "Institutional Order Flow (COMEX GC)",
    body: "Monitor CME Globex GC depth, cumulative volume delta (CVD), spot-to-futures basis spread, and COT large speculator positioning before placing your spot CFD orders.",
    href: "/macro/XAUUSD",
    link: "COMEX Order Flow",
  },
  {
    icon: Sparkles,
    title: "Quantitative Confluence Engine",
    body: "Mathematical scoring across 5 institutional confirmation stages: Macro drivers, institutional positioning, market participation, HTF/LTF alignment, and strict risk gates.",
    href: "/signals",
    link: "Confluence Engine",
  },
];

const GRID_B: Feat[] = [
  {
    icon: ChartCandlestick,
    title: "Native TradingView Charting",
    body: "High-performance lightweight canvas with 300+ real MT5 bars, sub-second WebSocket tick updates, technical indicators, and persistent drawings.",
    href: "/macro/XAUUSD",
    link: "Native Charting",
  },
  {
    icon: FlaskConical,
    title: "Backtest Replay Lab",
    body: "Replay tick-by-tick market history at 1x to 50x speeds. Stress test your execution models without risking real capital.",
    href: "/backtesting",
    link: "Replay Simulator",
  },
  {
    icon: CalendarDays,
    title: "Macro Economic Calendar",
    body: "Live G10 high-impact calendar events with broker embargo clearances so you never get trapped in high-spread slippage spikes.",
    href: "/calendar",
    link: "Macro Calendar",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-white/[0.08] bg-[#070709] py-24 sm:py-32 relative">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#20e0b2]">
            Platform Modules
          </p>
          <h2 className="text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[40px] text-white">
            An institutional desk, not a casual spreadsheet
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <MT5Split />

          {/* Row A: 2 asymmetric */}
          {GRID_A.map((f, i) => (
            <Reveal key={f.title} delay={0.08 * i} className={i === 0 ? "lg:col-span-7" : "lg:col-span-5"}>
              <div className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-[#0c0c14]/90 p-7 sm:p-8 hover:border-[#20e0b2]/30 transition-all">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#20e0b2]/20 bg-[#20e0b2]/[0.08] text-[#20e0b2] shadow-[0_0_12px_rgba(32,224,178,0.2)]">
                  <f.icon className="h-5 w-5 text-[#20e0b2]" />
                </span>
                <h3 className="mt-4 text-xl font-bold tracking-tight text-white">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">{f.body}</p>
                <div className="mt-auto pt-6">
                  <FeatureLink href={f.href} label={f.link} />
                </div>
              </div>
            </Reveal>
          ))}

          {/* Row B: 3-up */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:col-span-12">
            {GRID_B.map((f, i) => (
              <Reveal key={f.title} delay={0.08 * i}>
                <div className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-[#0c0c14]/90 p-6 sm:p-7 hover:border-[#20e0b2]/30 transition-all">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300">
                    <f.icon className="h-4 w-4 text-[#20e0b2]" />
                  </span>
                  <h3 className="mt-4 text-[16px] font-bold tracking-tight text-white">{f.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{f.body}</p>
                  <div className="mt-auto pt-5">
                    <FeatureLink href={f.href} label={f.link} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Row C: analytics (wide) + risk (narrow) */}
          <Reveal delay={0} className="lg:col-span-8">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c0c16] via-[#090912] to-[#0e161c] p-7 sm:p-9 text-white">
              <div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#20e0b2]/10 border border-[#20e0b2]/20">
                  <ClipboardCheck className="h-5 w-5 text-[#20e0b2]" />
                </span>
                <h3 className="mt-4 text-2xl font-bold tracking-tight">
                  Automated Journaling & Analytical Feedback Loop
                </h3>
                <p className="mt-2.5 max-w-lg text-[14px] leading-relaxed text-zinc-400">
                  Expectancy metrics, R-multiple distributions, session win rate analysis, and mistake categorization from your real fills.
                  Eliminate leakages before you scale position size.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {[
                  { href: "/journal", label: "Trade Journal" },
                  { href: "/analytics", label: "Analytics Desk" },
                ].map((b) => (
                  <Link
                    key={b.href}
                    href={b.href}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 font-mono text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    {b.label} <ArrowRight className="h-3.5 w-3.5 text-[#20e0b2]" />
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-4">
            <div className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-[#0c0c14]/90 p-7 sm:p-8 hover:border-[#20e0b2]/30 transition-all">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300">
                <ShieldCheck className="h-5 w-5 text-[#20e0b2]" />
              </span>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-white">Drawdown Sentinel</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">
                Automated position sizing calculator and account risk limit gates to prevent tilt, revenge trading, and funded challenge blowups.
              </p>
              <div className="mt-auto pt-6">
                <FeatureLink href="/risk" label="Risk Calculator" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
