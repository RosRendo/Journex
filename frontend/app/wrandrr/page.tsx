"use client";

import React, { useState } from "react";
import { BarChart3 } from "lucide-react";

interface ResultRow {
  Wins: number;
  Losses: number;
  WR: string;
  NetResult: string;
  NetValue: number;
  Status: string;
}

const WrandRR: React.FC = () => {
  const [accountBalance, setAccountBalance] = useState(6000);
  const [numTrades, setNumTrades] = useState(10);
  const [riskPct, setRiskPct] = useState(1);
  const [rr, setRR] = useState(2);
  const [results, setResults] = useState<ResultRow[]>([]);

  const calculateResults = () => {
    const riskAmount = accountBalance * (riskPct / 100);
    const rewardAmount = riskAmount * rr;
    const tempResults: ResultRow[] = [];

    for (let wins = 0; wins <= numTrades; wins++) {
      const losses = numTrades - wins;
      const totalProfit = wins * rewardAmount;
      const totalLoss = losses * riskAmount;
      const net = totalProfit - totalLoss;
      const wr = (wins / numTrades) * 100;
      const status = net > 0 ? "Profit" : net === 0 ? "Breakeven" : "Loss";

      tempResults.push({
        Wins: wins,
        Losses: losses,
        WR: `${wr.toFixed(1)}%`,
        NetResult: `$${net.toFixed(2)}`,
        NetValue: net,
        Status: status,
      });
    }

    setResults(tempResults);
  };

  const fields = [
    { label: "Account Balance", value: accountBalance, set: setAccountBalance, suffix: "$" },
    { label: "Number of Trades", value: numTrades, set: setNumTrades, suffix: "" },
    { label: "Risk % per Trade", value: riskPct, set: setRiskPct, suffix: "%" },
    { label: "RR Ratio", value: rr, set: setRR, suffix: ":1" },
  ];

  return (
          <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="text-violet-500" size={24} />
            Win Rate & RR Analysis
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            See your net outcome at every possible win rate for a given RR ratio
          </p>
        </div>

        {/* Inputs */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {fields.map(({ label, value, set, suffix }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {label}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 pr-8"
                    value={value}
                    onChange={(e) => set(Number(e.target.value))}
                  />
                  {suffix && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {suffix}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-foreground text-sm font-semibold transition-colors"
            onClick={calculateResults}
          >
            Calculate
          </button>
        </div>

        {/* Table */}
        {results.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wins</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Losses</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Win Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Net Result</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">{row.Wins}</td>
                      <td className="px-4 py-2.5 text-foreground">{row.Losses}</td>
                      <td className="px-4 py-2.5 text-foreground font-mono">{row.WR}</td>
                      <td className={`px-4 py-2.5 font-mono font-semibold ${row.NetValue > 0 ? "text-emerald-400" : row.NetValue < 0 ? "text-red-400" : "text-amber-400"}`}>
                        {row.NetResult}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.Status === "Profit"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : row.Status === "Loss"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                          {row.Status}
                        </span>
                      </td>
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

export default WrandRR;
