"use client";

import { useState, useEffect } from "react";
import { calcRisk } from "../../lib/terminalApi";
import { useWebSocket } from "../providers/WebSocketProvider";

interface WidgetHeaderProps {
  title: string;
  right?: React.ReactNode;
}

function WidgetHeader({ title, right }: WidgetHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2 h-7 bg-zinc-900 border-b border-zinc-800 shrink-0">
      <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-500">
        {title}
      </span>
      {right}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  suffix?: string;
  step?: number;
  testId?: string;
}

function NumberField({ label, value, onChange, suffix, step = 0.01, testId }: NumberFieldProps) {
  return (
    <label className="flex items-center gap-1 text-[10px]">
      <span className="text-zinc-500 uppercase tracking-widest w-16">{label}</span>
      <input
        data-testid={testId}
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 bg-black border border-zinc-700 focus:border-amber-500 outline-none px-1.5 py-0.5 font-mono text-[11px] text-zinc-100"
      />
      {suffix && <span className="text-zinc-500 font-mono text-[10px]">{suffix}</span>}
    </label>
  );
}

interface RiskResult {
  risk_amount: number;
  position_size_lots: number;
  position_size_units: number;
  margin_required: number;
  rr_targets: {
    "2R_profit": number;
    "3R_profit": number;
    [key: string]: number;
  };
}

export default function RiskCalculator({ accountBalance }: { accountBalance?: number }) {
  const { liveEquity, livePrices } = useWebSocket();
  const balance = liveEquity?.balance || accountBalance || 100000;
  
  const [riskPct, setRiskPct] = useState(1);
  const [slPips, setSlPips] = useState(30);
  const [entry, setEntry] = useState(1.0950);
  const [leverage, setLeverage] = useState(100);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-recalculate when balance, risk, or SL changes
  useEffect(() => {
    run();
  }, [balance, riskPct, slPips, leverage, entry]);

  const run = async () => {
    setLoading(true);
    try {
      const r = await calcRisk({
        balance,
        risk_pct: riskPct,
        sl_pips: slPips,
        pip_value_per_lot: 10,
        leverage,
        entry_price: entry,
      });
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section data-testid="widget-risk-calc" className="border-b border-zinc-800">
      <WidgetHeader
        title="Risk Calculator"
        right={
          <button
            data-testid="risk-calc-run"
            onClick={run}
            className="text-[10px] uppercase tracking-widest border border-zinc-700 hover:border-amber-500 px-2 py-0.5"
          >
            {loading ? "…" : "Calc"}
          </button>
        }
      />
      <div className="px-2 py-2 grid grid-cols-1 gap-1">
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-zinc-500 uppercase tracking-widest w-16">Balance</span>
          <div className="flex-1 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400">
            ${balance.toLocaleString()}
          </div>
        </div>
        <NumberField label="Risk" value={riskPct} onChange={setRiskPct} suffix="%" step={0.1} testId="risk-pct" />
        <NumberField label="SL Pips" value={slPips} onChange={setSlPips} suffix="p" step={1} testId="risk-sl" />
        <NumberField label="Entry" value={entry} onChange={setEntry} step={0.00001} testId="risk-entry" />
        <NumberField label="Leverage" value={leverage} onChange={setLeverage} suffix="x" step={1} testId="risk-lev" />
      </div>
      {result && (
        <div data-testid="risk-calc-result" className="px-2 pb-2 grid grid-cols-2 gap-y-1 gap-x-3 text-[11px] font-mono">
          <div className="text-zinc-500">Risk $</div>
          <div className="text-right text-red-500">${result.risk_amount.toLocaleString()}</div>
          <div className="text-zinc-500">Lots</div>
          <div className="text-right text-zinc-100">{result.position_size_lots.toFixed(2)}</div>
          <div className="text-zinc-500">Units</div>
          <div className="text-right text-zinc-100">{result.position_size_units.toLocaleString()}</div>
          <div className="text-zinc-500">Margin</div>
          <div className="text-right text-amber-500">${result.margin_required.toLocaleString()}</div>
          <div className="text-zinc-500">2R Target</div>
          <div className="text-right text-emerald-500">${result.rr_targets["2R_profit"].toLocaleString()}</div>
          <div className="text-zinc-500">3R Target</div>
          <div className="text-right text-emerald-500">${result.rr_targets["3R_profit"].toLocaleString()}</div>
        </div>
      )}
    </section>
  );
}
