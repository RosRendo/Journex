"use client";

import { useState } from "react";
import { AnimatePresence, motion, Reveal } from "./Reveal";
import { ShieldAlert, Activity, CheckCircle2, TrendingUp, BarChart2 } from "lucide-react";

type TabId = "analytics" | "equity" | "calendar" | "history" | "strategy" | "risk";

const TABS: { id: TabId; label: string }[] = [
  { id: "analytics", label: "Analytics" },
  { id: "equity", label: "Equity curve" },
  { id: "calendar", label: "Calendar" },
  { id: "history", label: "Trade history" },
  { id: "strategy", label: "Strategy" },
  { id: "risk", label: "Risk desk" },
];

function PanelShell({
  title,
  meta,
  children,
}: {
  title: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c14]/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#090910] px-5 py-3">
        <span className="text-[13px] font-mono font-bold tracking-tight text-white flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2]" />
          {title}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#20e0b2] bg-[#20e0b2]/10 px-2 py-0.5 rounded border border-[#20e0b2]/20 font-bold">
          {meta}
        </span>
      </div>
      <div className="p-5 sm:p-6 bg-[#08080d]">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "pos" | "neg";
}) {
  const color =
    tone === "pos" ? "text-[#20e0b2]" : tone === "neg" ? "text-[#ff5c73]" : "text-white";
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0a0a12] px-4 py-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-xl font-mono font-bold tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

const MONTHS = [
  { m: "May", pct: 62, v: "+3.1%" },
  { m: "Jun", pct: 84, v: "+4.6%" },
  { m: "Jul", pct: 22, v: "−1.2%" },
  { m: "Aug", pct: 55, v: "+2.4%" },
  { m: "Sep", pct: 78, v: "+5.2%" },
  { m: "Oct", pct: 68, v: "+3.8%" },
];

function AnalyticsPanel() {
  return (
    <PanelShell title="Performance Analytics" meta="MT5 Telemetry · 90 Days">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Win Rate" value="68.4%" tone="pos" />
        <Stat label="Avg Winner" value="+2.4R" tone="pos" />
        <Stat label="Avg Loser" value="−0.9R" tone="neg" />
        <Stat label="Expectancy" value="+$184/tr" tone="pos" />
      </div>
      <div className="mt-6 border-t border-white/[0.05] pt-5">
        <p className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-500 flex items-center justify-between">
          <span>Monthly Net PnL Breakdown</span>
          <span className="text-[#20e0b2]">+17.9% Cumulative</span>
        </p>
        <div className="flex h-32 items-end gap-3 pt-2">
          {MONTHS.map((m, i) => (
            <div key={m.m} className="flex flex-1 flex-col items-center gap-1.5">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                whileInView={{ height: m.pct * 0.75, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className={`w-full rounded-t-md transition-all ${
                  m.v.startsWith("−")
                    ? "bg-[#ff5c73]/70 hover:bg-[#ff5c73]"
                    : "bg-[#20e0b2]/80 hover:bg-[#20e0b2] shadow-[0_0_12px_rgba(32,224,178,0.2)]"
                }`}
              />
              <span className="font-mono text-[9px] text-zinc-500">{m.m}</span>
            </div>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}

const EQUITY_POINTS = [
  148, 146, 138, 140, 128, 130, 118, 106, 112, 94, 78, 70, 48,
];

function EquityPanel() {
  const d = EQUITY_POINTS.map((y, i) => {
    const x = i * (560 / (EQUITY_POINTS.length - 1));
    return `${i === 0 ? "M0" : "L"} ${x} ${y}`;
  }).join(" ");
  return (
    <PanelShell title="Cumulative Equity Curve" meta="Verified Telemetry">
      <svg viewBox="0 0 560 170" className="h-44 w-full" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="shDarkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20e0b2" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#20e0b2" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[50, 100].map((y) => (
          <line key={y} x1="0" x2="560" y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
        ))}
        <path d={`${d} L560 170 L0 170 Z`} fill="url(#shDarkFill)" />
        <motion.path
          d={d}
          stroke="#20e0b2"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </svg>
      <div className="mt-3 flex justify-between border-t border-white/[0.06] pt-3 font-mono text-[10px] text-zinc-500">
        <span>Genesis Deposit: $10,000</span>
        <span className="text-zinc-400">Max DD: −1.2%</span>
        <span className="text-[#20e0b2] font-bold">Sharpe: 2.41</span>
      </div>
    </PanelShell>
  );
}

const CAL = [
  { d: "01", r: "+1.4%", p: true },
  { d: "02", r: "+2.6%", p: true },
  { d: "03", r: "−0.6%", p: false },
  { d: "04", r: "+3.1%", p: true },
  { d: "05", r: "+0.8%", p: true },
  { d: "08", r: "+1.9%", p: true },
  { d: "09", r: "+0.7%", p: true },
  { d: "10", r: "−1.1%", p: false },
  { d: "11", r: "+4.2%", p: true },
  { d: "12", r: "+1.1%", p: true },
  { d: "15", r: "—", p: null },
  { d: "16", r: "—", p: null },
  { d: "17", r: "—", p: null },
  { d: "18", r: "—", p: null },
  { d: "19", r: "—", p: null },
  { d: "22", r: "+2.2%", p: true },
  { d: "23", r: "+1.5%", p: true },
  { d: "24", r: "−0.8%", p: false },
  { d: "25", r: "+2.8%", p: true },
  { d: "26", r: "+1.3%", p: true },
];

function CalendarPanel() {
  return (
    <PanelShell title="Session Calendar" meta="Daily Realized Yield">
      <div className="grid grid-cols-7 gap-1.5">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="pb-1 text-center font-mono text-[9px] uppercase text-zinc-500">
            {d}
          </div>
        ))}
        {CAL.map((c, i) => (
          <motion.div
            key={c.d + i}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.02 }}
            className={`flex min-h-[46px] flex-col justify-between rounded-lg border px-1.5 py-1 ${
              c.p === null
                ? "border-white/[0.04] bg-white/[0.01] text-zinc-600"
                : c.p
                  ? "border-[#20e0b2]/20 bg-[#20e0b2]/[0.08]"
                  : "border-[#ff5c73]/20 bg-[#ff5c73]/[0.08]"
            }`}
          >
            <span className="font-mono text-[9px] text-zinc-500">{c.d}</span>
            <span
              className={`font-mono text-[10px] font-bold ${
                c.p === null
                  ? "text-zinc-600"
                  : c.p
                    ? "text-[#20e0b2]"
                    : "text-[#ff5c73]"
              }`}
            >
              {c.r}
            </span>
          </motion.div>
        ))}
      </div>
    </PanelShell>
  );
}

const HISTORY = [
  { pair: "XAUUSD", side: "BUY", tag: "London Sweep + MSS", entry: "2,735.40", exit: "2,748.80", r: "+2.8R", pnl: "+$1,340" },
  { pair: "EURUSD", side: "BUY", tag: "Session VWAP Push", entry: "1.0842", exit: "1.0871", r: "+1.8R", pnl: "+$580" },
  { pair: "US100", side: "SELL", tag: "Opening Range Fade", entry: "20,410", exit: "20,460", r: "−1.0R", pnl: "−$320" },
  { pair: "GBPUSD", side: "BUY", tag: "HTF Confluence Break", entry: "1.2980", exit: "1.3060", r: "+3.2R", pnl: "+$960" },
  { pair: "USDJPY", side: "SELL", tag: "BoJ Yield Divergence", entry: "154.20", exit: "153.10", r: "+2.2R", pnl: "+$880" },
];

function HistoryPanel() {
  return (
    <PanelShell title="Execution Ledger" meta="MT5 Real Fills">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-left text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.08] font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500">
              <th className="pb-2 font-medium">Instrument</th>
              <th className="pb-2 font-medium">Model / Setup</th>
              <th className="pb-2 font-medium">Execution Range</th>
              <th className="pb-2 font-medium">PnL</th>
              <th className="pb-2 text-right font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {HISTORY.map((t) => (
              <tr key={t.pair + t.tag} className="hover:bg-white/[0.02]">
                <td className="py-2.5">
                  <span className="font-mono font-bold text-white tracking-tight">{t.pair}</span>
                  <span
                    className={`ml-2 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold ${
                      t.side === "BUY"
                        ? "bg-[#20e0b2]/10 text-[#20e0b2] border border-[#20e0b2]/20"
                        : "bg-[#ff5c73]/10 text-[#ff5c73] border border-[#ff5c73]/20"
                    }`}
                  >
                    {t.side}
                  </span>
                </td>
                <td className="py-2.5 text-zinc-400">{t.tag}</td>
                <td className="py-2.5 font-mono text-[11px] text-zinc-500">
                  {t.entry} → {t.exit}
                </td>
                <td className={`py-2.5 font-mono text-[11px] font-bold ${t.pnl.startsWith("−") ? "text-[#ff5c73]" : "text-[#20e0b2]"}`}>
                  {t.pnl}
                </td>
                <td
                  className={`py-2.5 text-right font-mono font-bold ${
                    t.r.startsWith("−") ? "text-[#ff5c73]" : "text-[#20e0b2]"
                  }`}
                >
                  {t.r}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}

const STRATEGIES = [
  { name: "Quantitative Trend (Hurst > 0.55)", trades: 54, win: 74, edge: "+2.8R avg", tone: "pos" },
  { name: "London Open Sweep + SMT", trades: 38, win: 68, edge: "+2.1R avg", tone: "pos" },
  { name: "Mean Reversion (Z-Score > 2.0σ)", trades: 21, win: 57, edge: "+1.3R avg", tone: "pos" },
];

function StrategyPanel() {
  return (
    <PanelShell title="Quant Strategy Performance" meta="Playbook Telemetry">
      <div className="space-y-5">
        {STRATEGIES.map((s, i) => (
          <div key={s.name}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[13px] font-mono font-bold text-white tracking-tight">{s.name}</span>
              <span className="font-mono text-[10px] text-zinc-500">
                {s.trades} trades
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${s.win}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-[#20e0b2] shadow-[0_0_10px_rgba(32,224,178,0.4)]"
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-zinc-400">
              <span>Win rate {s.win}%</span>
              <span className="text-[#20e0b2] font-bold">
                {s.edge}
              </span>
            </div>
          </div>
        ))}
        <p className="border-t border-white/[0.06] pt-3 text-[12px] leading-relaxed text-zinc-500">
          Scale verified positive-expectancy models. Automatically gate underperforming strategies with the Risk Sentinel.
        </p>
      </div>
    </PanelShell>
  );
}

function RiskPanel() {
  return (
    <PanelShell title="Automated Risk Guardrails" meta="Real-time Enforcement">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.07] bg-[#0a0a12] p-4">
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-400">
            Automated Sizing Calculator
          </p>
          {[
            ["Risk per trade", "1.0% · $100"],
            ["Stop distance", "22 pips"],
            ["Max allowable lots", "0.45 lots"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-white/[0.05] py-2 text-[12px] last:border-0">
              <span className="text-zinc-400">{k}</span>
              <span className="font-mono font-bold text-white">{v}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-[#0a0a12] p-4">
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-400">
            Drawdown Sentinel Gate
          </p>
          {[
            ["Daily loss threshold", "3.0% Max"],
            ["Max concurrent open risk", "5.0%"],
            ["Session utilized", "1.1% (Safe)"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-white/[0.05] py-2 text-[12px] last:border-0">
              <span className="text-zinc-400">{k}</span>
              <span className="font-mono font-bold text-[#20e0b2]">{v}</span>
            </div>
          ))}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "36%" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-[#20e0b2]"
            />
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

const PANELS: Record<TabId, () => React.ReactNode> = {
  analytics: AnalyticsPanel,
  equity: EquityPanel,
  calendar: CalendarPanel,
  history: HistoryPanel,
  strategy: StrategyPanel,
  risk: RiskPanel,
};

export default function Showcase() {
  const [active, setActive] = useState<TabId>("analytics");
  const Active = PANELS[active];

  return (
    <section id="showcase" className="scroll-mt-20 border-t border-white/[0.08] bg-[#070709] py-24 sm:py-32 relative">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#20e0b2]">
            The Workspace
          </p>
          <h2 className="text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[40px] text-white">
            Quantitative telemetry, unified on one screen
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
            Analytics, calendar, history, strategy, and risk — powered by your real MetaTrader 5 broker feed with zero synthetic placeholders.
          </p>
        </Reveal>

        {/* Tabs */}
        <Reveal delay={0.1} className="mt-10">
          <div
            role="tablist"
            aria-label="Workspace views"
            className="flex justify-start gap-1 overflow-x-auto rounded-xl border border-white/10 bg-[#0a0a12] p-1 sm:justify-center scrollbar-none"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                onClick={() => setActive(t.id)}
                className={`shrink-0 rounded-lg px-4 py-2 text-[13px] font-mono transition-all ${
                  active === t.id
                    ? "bg-[#20e0b2] text-black font-bold shadow-[0_0_16px_rgba(32,224,178,0.3)]"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Reveal>

        {/* Active panel */}
        <div className="mt-8 min-h-[420px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              role="tabpanel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <Active />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
