"use client";

import React, { useState } from "react";
import { Award } from "lucide-react";

const defaultAccountSizes = [5000, 10000, 25000, 50000, 100000];
const defaultRisk = 0.25;
const defaultPhase1 = 8;
const defaultPhase2 = 4;

interface Row {
  accountSize: number;
  riskAmount: number;
  tradesPhase1: number;
  gainPhase1: number;
  tradesPhase2: number;
  gainPhase2: number;
}

function fmt(num: number) {
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmt2(num: number) {
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PhaseTableCalculator: React.FC = () => {
  const [accountSizesInput, setAccountSizesInput] = useState<string>(defaultAccountSizes.join(", "));
  const [risk, setRisk] = useState<string>(defaultRisk.toString());
  const [phase1Target, setPhase1Target] = useState<string>(defaultPhase1.toString());
  const [phase2Target, setPhase2Target] = useState<string>(defaultPhase2.toString());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string>("");

  const calculateTable = () => {
    const accounts = accountSizesInput
      .split(",")
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    const r = parseFloat(risk) / 100;
    const p1 = parseFloat(phase1Target) / 100;
    const p2 = parseFloat(phase2Target) / 100;

    if (accounts.length === 0) { setError("Enter at least one valid account size."); setRows(null); return; }
    if (isNaN(r) || r <= 0) { setError("Risk must be a positive number."); setRows(null); return; }
    if (isNaN(p1) || p1 <= 0) { setError("Phase 1 target must be positive."); setRows(null); return; }
    if (isNaN(p2) || p2 <= 0) { setError("Phase 2 target must be positive."); setRows(null); return; }

    setRows(accounts.map((account) => ({
      accountSize: account,
      riskAmount: account * r,
      tradesPhase1: Math.floor(p1 / r),
      gainPhase1: account * p1,
      tradesPhase2: Math.floor(p2 / r),
      gainPhase2: account * p2,
    })));
    setError("");
  };

  return (
          <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Award className="text-violet-500" size={24} />
            Funded Account Requirements
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Calculate how many winning trades you need to pass each challenge phase
          </p>
        </div>

        {/* Inputs */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Account Sizes (comma separated)
            </label>
            <input
              type="text"
              value={accountSizesInput}
              onChange={(e) => setAccountSizesInput(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              placeholder="e.g. 5000, 10000, 25000"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Risk % per Trade", value: risk, set: setRisk },
              { label: "Phase 1 Target %", value: phase1Target, set: setPhase1Target },
              { label: "Phase 2 Target %", value: phase2Target, set: setPhase2Target },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {label}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 pr-7"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={calculateTable}
            className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-foreground text-sm font-semibold transition-colors"
          >
            Generate Table
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {rows && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Account Size", "Risk/Win", "Trades (Phase 1)", "Gain (Phase 1)", "Trades (Phase 2)", "Gain (Phase 2)"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-violet-400">{fmt(row.accountSize)}</td>
                      <td className="px-4 py-2.5 font-mono text-red-400">{fmt2(row.riskAmount)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                          {row.tradesPhase1} trades
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-emerald-400">{fmt(row.gainPhase1)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold">
                          {row.tradesPhase2} trades
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-emerald-400">{fmt(row.gainPhase2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
  );
};

export default PhaseTableCalculator;
