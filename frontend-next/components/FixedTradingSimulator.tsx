"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Activity, TrendingUp, DollarSign, Target,
  AlertTriangle, Zap,
} from "lucide-react";

interface TradeResult {
  tradeNumber: number; result: "Win" | "Loss";
  balance: number; gainLoss: number;
  risk: number; reward: number; lotSize: number; positionSize: number;
}

function Field({ label, value, onChange, step, unit }: {
  label: string; value: number; onChange: (v: number) => void; step?: string; unit?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground block">{label}{unit ? ` (${unit})` : ""}</label>
      <input type="number" step={step ?? "1"} min="0" value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full h-9 px-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition tabular-nums" />
    </div>
  );
}

export default function FixedTradingSimulator() {
  const [startingBalance, setStartBal] = useState(1000);
  const [riskPerTrade, setRisk] = useState(2);
  const [rewardRiskRatio, setRR] = useState(2);
  const [winRate, setWinRate] = useState(60);
  const [numberOfTrades, setNumTrades] = useState(20);
  const [entryPrice, setEntry] = useState(3980);
  const [stopLossPrice, setSL] = useState(3960);
  const [leverage, setLeverage] = useState(100);
  const [contractSize, setContrSize] = useState(100);
  const [trades, setTrades] = useState<TradeResult[]>([]);
  const [chartData, setChartData] = useState<{ trade: number; balance: number }[]>([]);

  const riskPerUnit = Math.abs(entryPrice - stopLossPrice);
  const firstRisk = (startingBalance * riskPerTrade) / 100;
  const firstPos = riskPerUnit > 0 ? firstRisk / riskPerUnit : 0;
  const firstLot = firstPos / contractSize;
  const takeProfitPrice = entryPrice + (riskPerUnit * rewardRiskRatio * (entryPrice > stopLossPrice ? -1 : 1));
  const marginRequired = (firstLot * entryPrice * contractSize) / leverage;

  const simulate = useCallback(() => {
    const newTrades: TradeResult[] = [];
    let bal = startingBalance;
    const chart = [{ trade: 0, balance: startingBalance }];
    const ru = Math.abs(entryPrice - stopLossPrice);
    
    // Deterministic distribution of wins and losses
    let error = 0.5;
    const winRatio = Math.max(0, Math.min(100, winRate)) / 100;

    for (let i = 1; i <= numberOfTrades; i++) {
        
      error += winRatio;
      let isWin = false;
      if (error >= 1) {
          isWin = true;
          error -= 1;
      }

      const curRisk = (bal * riskPerTrade) / 100;
      const curPos = ru > 0 ? curRisk / ru : 0;
      const curLot = curPos / contractSize;
      const curReward = curRisk * rewardRiskRatio;
      const gl = isWin ? curReward : -curRisk;
      bal = Math.max(0, bal + gl);
      newTrades.push({ tradeNumber: i, result: isWin ? "Win" : "Loss", balance: bal, gainLoss: gl, risk: curRisk, reward: curReward, lotSize: curLot, positionSize: curPos });
      chart.push({ trade: i, balance: +bal.toFixed(2) });
    }
    setTrades(newTrades);
    setChartData(chart);
  }, [startingBalance, riskPerTrade, rewardRiskRatio, winRate, numberOfTrades, entryPrice, stopLossPrice, contractSize]);

  useEffect(() => { simulate(); }, [simulate]);

  const finalBalance = trades.at(-1)?.balance ?? startingBalance;
  const totalPct = ((finalBalance - startingBalance) / startingBalance) * 100;
  const totalProfit = finalBalance - startingBalance;
  const wins = trades.filter(t => t.result === "Win").length;
  const losses = trades.filter(t => t.result === "Loss").length;
  const actualWR = trades.length ? (wins / trades.length) * 100 : 0;
  const multiplier = finalBalance / startingBalance;

  const lineColor = finalBalance >= startingBalance ? "#22c55e" : "#ef4444";

  return (
    <div className="min-h-screen bg-background text-foreground space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Fixed Trading Simulator (Deterministic)</h1>
            <p className="text-xs text-muted-foreground">Perfectly Distributed Exact Expected Value Compound Engine</p>
          </div>
        </div>
        <div className="px-4 py-2 border border-blue-500/20 bg-blue-500/10 rounded-xl text-xs font-bold text-blue-400 uppercase tracking-wider">
            Zero Randomness Mode
        </div>
      </div>

      {/* Parameters */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Zap className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-foreground">Fixed Strategy Parameters</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Field label="Starting Balance" value={startingBalance} onChange={setStartBal} unit="$" />
          <Field label="Risk per Trade" value={riskPerTrade} onChange={setRisk} unit="%" step="0.1" />
          <Field label="Reward:Risk" value={rewardRiskRatio} onChange={setRR} step="0.1" />
          <Field label="Target Win Rate" value={winRate} onChange={setWinRate} unit="%" />
          <Field label="# of Trades" value={numberOfTrades} onChange={setNumTrades} />
          <Field label="Entry Price" value={entryPrice} onChange={setEntry} unit="$" step="0.01" />
          <Field label="Stop Loss" value={stopLossPrice} onChange={setSL} unit="$" step="0.01" />
          <Field label="Leverage" value={leverage} onChange={setLeverage} unit="1:X" />
          <Field label="Contract Size" value={contractSize} onChange={setContrSize} unit="oz/lot" />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Theoretical Final Bal", value: `$${finalBalance.toFixed(2)}`, color: "text-foreground", Icon: DollarSign },
          { label: "Expected Gain", value: `${totalPct >= 0 ? "+" : ""}${totalPct.toFixed(2)}%`, color: totalPct >= 0 ? "text-green-500" : "text-destructive", Icon: TrendingUp },
          { label: "Expected P/L", value: `$${totalProfit.toFixed(2)}`, color: totalProfit >= 0 ? "text-green-500" : "text-destructive", Icon: Activity },
          { label: "Exact Distributed WR", value: `${actualWR.toFixed(1)}%`, color: "text-foreground", Icon: Target, sub: `${wins}W / ${losses}L` },
          { label: "EV Multiplier", value: `${multiplier.toFixed(2)}×`, color: "text-blue-400", Icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <s.Icon className={`w-5 h-5 shrink-0 ${s.color}`} />
            <div>
              <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              {(s as any).sub && <p className="text-[10px] text-muted-foreground">{(s as any).sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Equity Curve */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Deterministic Expected Equity Trajectory</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="trade" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <ReferenceLine y={startingBalance} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }} />
            <Line type="monotone" dataKey="balance" stroke={lineColor} strokeWidth={2}
              dot={(p) => <circle key={p.key} cx={p.cx} cy={p.cy} r={3}
                fill={trades[p.index - 1]?.result === "Win" ? "#22c55e" : p.index === 0 ? lineColor : "#ef4444"}
                stroke="none" />}
              activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">Perfect mathematical interleaving representing the exact path of compounded expected value.</p>
      </div>

      {/* Trade table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-foreground">Expected Values per Execution Node</h3>
        </div>
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr className="border-b border-border">
                {["Sequence #", "Distributed Result", "Compounded Balance", "Gain/Loss", "Risk $", "Reward $", "Position Size", "Lot Size"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={t.tradeNumber} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.tradeNumber}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex w-fit uppercase tracking-widest ${t.result === "Win" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                      {t.result}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-bold text-foreground tabular-nums">${t.balance.toFixed(2)}</td>
                  <td className={`px-4 py-2.5 font-semibold tabular-nums ${t.gainLoss >= 0 ? "text-green-500" : "text-destructive"}`}>
                    {t.gainLoss >= 0 ? "+" : ""}${t.gainLoss.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">${t.risk.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">${t.reward.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-amber-500 tabular-nums">{t.positionSize.toFixed(2)}</td>
                  <td className="px-4 py-2.5 font-bold text-blue-400 tabular-nums">{t.lotSize.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Info */}
      <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
        <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Deterministic Interleaving:</span>{" "}
          Unlike the random Monte Carlo simulator, this system uses an exact fixed sequencer. If your win rate is 60%, exactly 6 out of every 10 trades will mathematically be assigned as a win in a perfectly interspersed layout, demonstrating expected theoretical drawdown free of standard deviation noise.
        </p>
      </div>

    </div>
  );
}
