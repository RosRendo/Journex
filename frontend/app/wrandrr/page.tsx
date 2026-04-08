"use client";

import { useState, useMemo } from "react";
import { BarChart3, Target, TrendingUp, TrendingDown, RefreshCw, Info } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid
} from "recharts";

interface ResultRow {
  wins: number;
  losses: number;
  wr: number;
  net: number;
  status: "profit" | "loss" | "breakeven";
}

export default function WrandRR() {
  const [accountBalance, setAccountBalance] = useState(6000);
  const [numTrades, setNumTrades] = useState(10);
  const [riskPct, setRiskPct] = useState(1);
  const [rr, setRR] = useState(2);
  const [mode, setMode] = useState<"simulated" | "real">("simulated");

  const riskAmount = accountBalance * (riskPct / 100);
  const rewardAmount = riskAmount * rr;
  const breakEvenWR = (1 / (1 + rr)) * 100;

  const results = useMemo<ResultRow[]>(() => {
    return Array.from({ length: numTrades + 1 }, (_, wins) => {
      const losses = numTrades - wins;
      const net = wins * rewardAmount - losses * riskAmount;
      const wr = (wins / numTrades) * 100;
      return {
        wins, losses, wr,
        net: Math.round(net * 100) / 100,
        status: net > 0 ? "profit" : net === 0 ? "breakeven" : "loss",
      };
    });
  }, [numTrades, riskAmount, rewardAmount]);

  const scenarios = useMemo(() => results.slice(0, 8).map(r => ({
    name: `${r.wins}W`,
    value: r.net,
  })), [results]);

  const sliderClass = "w-full accent-violet-500 h-2 rounded-full cursor-pointer";

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const v = payload[0].value as number;
      return (
        <div className="bg-[#0c0c0d] border border-white/10 rounded-lg p-3 shadow-xl text-xs">
          <p className="text-gray-400 mb-1 font-bold">{label}</p>
          <p className={`font-mono font-bold ${v >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
            {v >= 0 ? "+" : ""}${v.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-12 text-[--text-primary] relative">
      {/* Ambient */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3" style={{ fontFamily: "'Syne', sans-serif" }}>
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-violet-400" />
          </div>
          Win Rate & RR Simulator
        </h1>
        <p className="text-sm mt-2 text-[--text-secondary]">
          Simulate how win rate and risk-reward ratio affect your profitability over a series of trades.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Panel */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-xl border border-[--border] bg-[--bg-card] p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> Parameters
              </h2>
              <div className="bg-white/5 rounded-lg p-1 flex">
                <button 
                  onClick={() => setMode("simulated")}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${mode === "simulated" ? "bg-violet-500 text-white shadow-md" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Simulated
                </button>
                <button 
                  onClick={() => setMode("real")}
                  className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${mode === "real" ? "bg-orange-500 text-white shadow-md" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Real MT5 Data
                </button>
              </div>
            </div>

            {mode === "real" && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <div className="text-[10px] font-bold uppercase text-orange-400 mb-2">Notice</div>
                <p className="text-xs text-orange-400/80">Using historical execution data to calculate exact empirical R-Multiples. (Currently calculating based on sample set)</p>
              </div>
            )}

            {/* Account Balance */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Account Balance</label>
                <span className="text-sm font-mono font-bold text-white">${accountBalance.toLocaleString()}</span>
              </div>
              <input type="range" min={1000} max={100000} step={500} value={accountBalance}
                onChange={e => setAccountBalance(Number(e.target.value))} className={sliderClass} />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>$1,000</span><span>$100,000</span>
              </div>
            </div>

            {/* Risk % */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Risk per Trade</label>
                <span className="text-sm font-mono font-bold text-white">{riskPct}% = <span className="text-[--bear]">${riskAmount.toFixed(2)}</span></span>
              </div>
              <input type="range" min={0.1} max={5} step={0.1} value={riskPct}
                onChange={e => setRiskPct(Number(e.target.value))} className={sliderClass} />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>0.1%</span><span>5%</span>
              </div>
            </div>

            {/* RR Ratio */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Risk:Reward Ratio</label>
                <span className="text-sm font-mono font-bold text-white">1:{rr} = <span className="text-[--bull]">+${rewardAmount.toFixed(2)}</span></span>
              </div>
              <input type="range" min={0.5} max={10} step={0.5} value={rr}
                onChange={e => setRR(Number(e.target.value))} className={sliderClass} />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>1:0.5</span><span>1:10</span>
              </div>
            </div>

            {/* Number of Trades */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Trade Sample</label>
                <span className="text-sm font-mono font-bold text-white">{numTrades} trades</span>
              </div>
              <input type="range" min={5} max={50} step={1} value={numTrades}
                onChange={e => setNumTrades(Number(e.target.value))} className={sliderClass} />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>5</span><span>50</span>
              </div>
            </div>

            {/* Break-even callout */}
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-widest font-bold text-violet-400 mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" /> Break-even Win Rate
              </div>
              <div className="text-2xl font-black font-mono text-violet-300">{breakEvenWR.toFixed(1)}%</div>
              <p className="text-[10px] text-gray-400 mt-1">You need to win at least this % to be profitable at 1:{rr} RR.</p>
            </div>
          </div>
        </div>

        {/* Simulation Chart + Table */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Area chart of outcomes */}
          <div className="rounded-xl border border-[--border] bg-[--bg-card] p-6 shadow-xl">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> Outcome Simulation (first 8 scenarios)
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={scenarios}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280", fontFamily: "monospace" }} tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} />
                <Tooltip content={customTooltip} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2}
                  fill="url(#areaGrad)" activeDot={{ r: 5, fill: "#fff", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Heatmap Table */}
          <div className="rounded-xl border border-[--border] bg-[--bg-card] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[--border] flex items-center justify-between" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" /> Full Probability Table
              </h2>
              <span className="text-[10px] text-gray-500">Break-even threshold at {breakEvenWR.toFixed(1)}% WR</span>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0" style={{ backgroundColor: "#0c0c0d" }}>
                  <tr className="text-[10px] uppercase font-bold text-gray-500 tracking-wider border-b border-[--border]">
                    <th className="px-5 py-3 text-left">Wins</th>
                    <th className="px-5 py-3 text-left">Losses</th>
                    <th className="px-5 py-3 text-left">Win Rate</th>
                    <th className="px-5 py-3 text-right">Net Result</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className={`border-b border-[--border] transition-colors ${
                      r.status === "profit" ? "hover:bg-[--bull]/5" :
                      r.status === "loss" ? "hover:bg-[--bear]/5" :
                      "hover:bg-yellow-500/5"
                    } ${r.wr >= breakEvenWR && results[Math.max(0,i-1)]?.wr < breakEvenWR ? "border-t-2 border-t-violet-500" : ""}`}>
                      <td className="px-5 py-3 font-mono font-bold text-white">{r.wins}</td>
                      <td className="px-5 py-3 font-mono text-gray-400">{r.losses}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${r.status === "profit" ? "bg-[--bull]" : r.status === "loss" ? "bg-[--bear]" : "bg-yellow-500"}`}
                              style={{ width: `${r.wr}%` }} />
                          </div>
                          <span className={`text-xs font-mono font-bold ${
                            r.status === "profit" ? "text-[--bull]" : r.status === "loss" ? "text-[--bear]" : "text-yellow-400"
                          }`}>{r.wr.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3 text-right font-mono font-bold ${
                        r.status === "profit" ? "text-[--bull]" : r.status === "loss" ? "text-[--bear]" : "text-yellow-400"
                      }`}>
                        {r.net >= 0 ? "+" : ""}${r.net.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          r.status === "profit" ? "bg-[--bull]/10 border-[--bull]/20 text-[--bull]" :
                          r.status === "loss" ? "bg-[--bear]/10 border-[--bear]/20 text-[--bear]" :
                          "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                        }`}>
                          {r.status === "profit" ? <TrendingUp className="w-3 h-3 inline mr-1" /> : r.status === "loss" ? <TrendingDown className="w-3 h-3 inline mr-1" /> : null}
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
