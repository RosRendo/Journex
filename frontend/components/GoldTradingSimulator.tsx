"use client";
import React, { useState, useMemo } from "react";
import { Coins, Settings, TrendingUp, DollarSign, AlertTriangle, Info } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type Row = {
  day: number; balance: number; lotSize: number;
  marginRequired: number; pipValue: number;
  maxAffordableSL: number; effectiveSL: number;
  commission: number; netProfit: number; newBalance: number;
};

function StatCard({ label, value, sub, color = "text-foreground" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Field({ label, value, onChange, step, min }: {
  label: string; value: number; onChange: (v: number) => void; step?: string; min?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground block">{label}</label>
      <input type="number" step={step ?? "1"} min={min ?? "0"} value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full h-9 px-3 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition tabular-nums" />
    </div>
  );
}

export default function GoldTradingSimulator() {
  const [balance, setBalance] = useState(1000);
  const [lotSize, setLotSize] = useState(0.01);
  const [price, setPrice] = useState(4200);
  const [leverage, setLeverage] = useState(2000);
  const [commission, setCommission] = useState(7);
  const [contractSize, setContrSize] = useState(100);
  const [tp, setTp] = useState(100);
  const [maxSlCap, setMaxSlCap] = useState(500);

  const results: Row[] = useMemo(() => {
    const days: Row[] = [];
    let bal = balance;
    for (let d = 1; d <= 30; d++) {
      const pipValue = 10 * lotSize;
      const marginRequired = (lotSize * price * contractSize) / leverage;
      const maxAffordableSL = bal / pipValue;
      const effectiveSL = Math.min(maxAffordableSL, maxSlCap);
      const comm = lotSize * commission;
      const netProfit = pipValue * tp - comm;
      const newBal = bal + netProfit;
      days.push({ day: d, balance: bal, lotSize, marginRequired, pipValue, maxAffordableSL, effectiveSL, commission: comm, netProfit, newBalance: newBal });
      bal = newBal;
    }
    return days;
  }, [balance, lotSize, price, leverage, commission, contractSize, tp, maxSlCap]);

  const finalBalance = results.at(-1)?.newBalance ?? balance;
  const totalProfit = finalBalance - balance;
  const totalReturn = (totalProfit / balance) * 100;
  const chartData = results.map(r => ({ day: `D${r.day}`, balance: +r.newBalance.toFixed(2) }));

  return (
    <div className="min-h-screen bg-background text-foreground space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Coins className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Gold Trading Simulator</h1>
            <p className="text-xs text-muted-foreground">XAU/USD · Fixed Lot Size · 30-Day Projection</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground border border-amber-500/20 bg-amber-500/5 rounded-full px-3 py-1.5">
          <Coins className="w-3 h-3 text-amber-500" /> Fixed lot strategy
        </div>
      </div>

      {/* Parameters */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Trading Parameters</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Starting Balance ($)" value={balance} onChange={setBalance} />
          <Field label="Fixed Lot Size" value={lotSize} onChange={setLotSize} step="0.01" />
          <Field label="Gold Price ($/oz)" value={price} onChange={setPrice} step="0.01" />
          <Field label="Leverage (1:X)" value={leverage} onChange={setLeverage} />
          <Field label="Commission ($/lot)" value={commission} onChange={setCommission} step="0.1" />
          <Field label="Take Profit (pips)" value={tp} onChange={setTp} />
          <Field label="Contract Size (oz)" value={contractSize} onChange={setContrSize} />
          <Field label="Max SL Cap (pips)" value={maxSlCap} onChange={setMaxSlCap} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Starting Balance" value={`$${balance.toLocaleString()}`} />
        <StatCard label="30-Day Final" value={`$${finalBalance.toFixed(2)}`} color="text-green-500" />
        <StatCard label="Total Profit" value={`$${totalProfit.toFixed(2)}`} color={totalProfit >= 0 ? "text-green-500" : "text-destructive"} />
        <StatCard label="Total Return" value={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`} color={totalReturn >= 0 ? "text-green-500" : "text-destructive"} sub="30 days" />
      </div>

      {/* Equity chart */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Projected Balance Curve</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }} />
            <Area type="monotone" dataKey="balance" stroke="#f59e0b" strokeWidth={2} fill="url(#goldGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Results table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">30-Day Simulation Results</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Day", "Balance", "Lot", "Margin", "Pip Val", "Max SL", "Commission", "Net Profit", "New Balance"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.day} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="px-4 py-2.5 font-semibold text-foreground">{r.day}</td>
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">${r.balance.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{r.lotSize.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">${r.marginRequired.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">${r.pipValue.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-blue-500 font-medium tabular-nums">{r.maxAffordableSL.toFixed(0)}</td>
                  <td className="px-4 py-2.5 text-destructive tabular-nums">${r.commission.toFixed(2)}</td>
                  <td className="px-4 py-2.5 font-semibold tabular-nums text-green-500">${r.netProfit.toFixed(2)}</td>
                  <td className="px-4 py-2.5 font-bold text-foreground tabular-nums">${r.newBalance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Note:</span> Assumes TP is hit every day.
          Pip value for gold ≈ $10 per pip per 1.0 lot. Max SL shows pips before account wipe at current balance.
        </p>
      </div>
    </div>
  );
}