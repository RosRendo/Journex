"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Zap, ShieldCheck } from "lucide-react";
import { Reveal } from "./Reveal";

/* ── How it works ─────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    title: "Connect MetaTrader 5 Bridge",
    body: "Run the local Python bridge or connect through your broker account. Every tick, fill, slippage point, and exit streams live into Journex.",
  },
  {
    n: "02",
    title: "Execute with Confluence & Risk Gates",
    body: "Monitor COMEX GC order flow, multi-timeframe regime scores, and real-time drawdown sentinel gates before confirming executions.",
  },
  {
    n: "03",
    title: "Compound Verified Expectancy",
    body: "Review true R-multiple performance, cut losing patterns, and scale your proven positive-expectancy playbooks with complete discipline.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-t border-white/[0.08] bg-[#070709] py-24 sm:py-32 relative">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#20e0b2]">
            System Architecture
          </p>
          <h2 className="text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[40px] text-white">
            Three steps from raw ticks to institutional discipline
          </h2>
        </Reveal>

        <div className="relative mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Connector line (desktop) */}
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-[38px] hidden border-t border-dashed border-white/10 md:block"
          />
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c0c14]/90 p-7 shadow-xl hover:border-[#20e0b2]/30 transition-all">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#20e0b2]/10 border border-[#20e0b2]/30 font-mono text-[13px] font-bold text-[#20e0b2] shadow-[0_0_12px_rgba(32,224,178,0.2)]">
                  {s.n}
                </span>
                <h3 className="mt-4 text-base font-bold tracking-tight text-white">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-400">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ──────────────────────────────────────────────────────────── */

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    period: "/mo",
    tagline: "Essential journaling and macro intelligence.",
    featured: false,
    features: [
      "Live economic calendar with embargo clearance",
      "Manual and CSV trade journaling",
      "Obsidian dark and white institutional themes",
      "Multi-asset correlation matrix",
    ],
    cta: "Select Starter",
  },
  {
    id: "pro",
    name: "Pro Desk",
    price: "$49",
    period: "/mo",
    tagline: "Full institutional cockpit with real-time MT5 bridge.",
    featured: true,
    trial: "Includes 7-day free trial — zero upfront charge",
    features: [
      "Real-time Python MT5 Bridge integration",
      "Sub-second tick streaming & live balance telemetry",
      "COMEX Gold (GC) Order Flow & CME Globex CVD",
      "5-Stage Quantitative Confluence Engine",
      "Automated Drawdown Sentinel & Risk Limit Enforcer",
      "Tick-by-tick Backtest Replay Simulator",
    ],
    cta: "Launch 7-Day Pro Trial",
  },
  {
    id: "lifetime",
    name: "Lifetime Institutional",
    price: "$499",
    period: "once",
    tagline: "One-time payment. Permanent access to all future quant engines.",
    featured: false,
    features: [
      "Everything in Pro Desk forever",
      "Zero recurring subscription fees",
      "All future EA and pine indicator upgrades",
      "Priority API limits & direct developer Discord",
    ],
    cta: "Claim Lifetime Desk",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-white/[0.08] bg-[#09090e] py-24 sm:py-32 relative">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#20e0b2]">
            Institutional Access
          </p>
          <h2 className="text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[40px] text-white">
            Transparent plans for serious operators
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
            Start with the Pro trial. One prevented revenge trade or bad entry pays for an entire year.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <div
                className={`relative flex h-full flex-col rounded-2xl border p-7 sm:p-8 transition-all ${
                  p.featured
                    ? "border-[#20e0b2]/50 bg-[#0d0d18] shadow-[0_0_35px_rgba(32,224,178,0.18)]"
                    : "border-white/[0.08] bg-[#0c0c14]/90"
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-6 rounded-md bg-[#20e0b2] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-black font-extrabold shadow-[0_0_12px_rgba(32,224,178,0.3)]">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold tracking-tight text-white">{p.name}</h3>
                <p className="mt-1 min-h-[38px] text-[13px] leading-relaxed text-zinc-400">
                  {p.tagline}
                </p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-4xl font-mono font-extrabold tracking-tight text-white">{p.price}</span>
                  <span className="text-[13px] font-mono text-zinc-500">
                    {p.period === "once" ? "one-time" : p.period}
                  </span>
                </div>
                {p.trial && (
                  <p className="mt-2 text-[11.5px] font-mono font-bold text-[#20e0b2]">{p.trial}</p>
                )}
                <ul className="mt-6 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#20e0b2]" strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/auth?mode=register&plan=${p.id}`}
                  className={`mt-7 w-full rounded-xl py-3 text-center text-sm font-bold transition-all ${
                    p.featured
                      ? "bg-[#20e0b2] hover:bg-[#1bc79e] text-black shadow-[0_0_20px_rgba(32,224,178,0.35)]"
                      : "border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ────────────────────────────────────────────────────────── */

export function FinalCTA() {
  return (
    <section className="border-t border-white/[0.08] bg-[#070709] py-24 sm:py-32 relative">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal className="overflow-hidden rounded-xl border border-white/[0.09] bg-[#0c0c14] px-6 py-16 text-center text-white sm:px-12 sm:py-20 shadow-2xl relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#20e0b2]/[0.03] blur-[90px] pointer-events-none" />
          
          <h2 className="mx-auto max-w-xl text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[44px]">
            Your next session is an execution test.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-zinc-400">
            Arm yourself with institutional order flow, sub-second MT5 telemetry, and algorithmic confluence before pulling the trigger.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-[#20e0b2] hover:bg-[#1bc79e] px-7 py-3 text-sm font-bold text-black transition-all shadow-[0_0_25px_rgba(32,224,178,0.4)]"
            >
              Launch Live Cockpit
            </Link>
            <Link
              href="/auth?mode=login"
              className="rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
            >
              Member Sign In
            </Link>
          </div>
          <p className="mt-5 font-mono text-[11px] text-zinc-500">
            Instant MT5 Link · No Credit Card Required for Test Drive
          </p>
        </Reveal>
      </div>
    </section>
  );
}
