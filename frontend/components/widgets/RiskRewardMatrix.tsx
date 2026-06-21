"use client";

import React, { useMemo } from "react";
import type { TradeData } from "@/hooks/useCsvTrades";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(12, 12, 13, 0.9)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    fontSize: 12,
    color: "#e8e8f0",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
  },
};

export function RiskRewardMatrix({ trades }: { trades: TradeData[] }) {
  const data = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; winPnl: number; lossPnl: number; count: number }>();
    
    trades.forEach(t => {
      if (!map.has(t.pair)) map.set(t.pair, { wins: 0, losses: 0, winPnl: 0, lossPnl: 0, count: 0 });
      const stats = map.get(t.pair)!;
      stats.count++;
      if (t.profit > 0) {
        stats.wins++;
        stats.winPnl += t.profit;
      } else if (t.profit < 0) {
        stats.losses++;
        stats.lossPnl += Math.abs(t.profit);
      }
    });

    return Array.from(map.entries()).map(([pair, stats]) => {
      const winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;
      const avgWin = stats.wins > 0 ? stats.winPnl / stats.wins : 0;
      const avgLoss = stats.losses > 0 ? stats.lossPnl / stats.losses : 0;
      const rr = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 5 : 0; // Cap at 5 if no losses

      return {
        pair,
        winRate: Math.round(winRate * 10) / 10,
        rr: Math.round(rr * 100) / 100,
        count: stats.count,
        totalPnl: stats.winPnl - stats.lossPnl
      };
    }).filter(d => d.count >= 2); // Only plot pairs with at least 2 trades
  }, [trades]);

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-full text-[12px] opacity-60">Not enough trades</div>;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0c0c0d]/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl">
          <div className="font-bold text-white mb-2">{data.pair}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <span className="text-gray-400">Win Rate:</span>
            <span className="text-white font-mono text-right">{data.winRate}%</span>
            <span className="text-gray-400">Avg R:R:</span>
            <span className="text-white font-mono text-right">{data.rr}R</span>
            <span className="text-gray-400">Trades:</span>
            <span className="text-white font-mono text-right">{data.count}</span>
            <span className="text-gray-400">Net P&L:</span>
            <span className={`font-mono text-right font-bold ${data.totalPnl >= 0 ? 'text-[#00c896]' : 'text-[#ff4d6a]'}`}>
              ${data.totalPnl.toFixed(2)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
          <XAxis 
            type="number" 
            dataKey="winRate" 
            name="Win Rate" 
            unit="%" 
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#555568" }} 
            tickLine={false} 
            axisLine={{ stroke: "rgba(255,255,255,0.05)" }} 
            label={{ value: 'Win Rate %', position: 'insideBottom', offset: -10, fill: '#555568', fontSize: 10 }}
          />
          <YAxis 
            type="number" 
            dataKey="rr" 
            name="R:R" 
            tick={{ fontSize: 10, fill: "#555568" }} 
            tickLine={false} 
            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
            label={{ value: 'Avg R:R', angle: -90, position: 'insideLeft', fill: '#555568', fontSize: 10 }}
          />
          <ZAxis type="number" dataKey="count" range={[40, 400]} name="Trades" />
          
          <ReferenceLine y={1} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
          <ReferenceLine x={50} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Scatter name="Pairs" data={data}>
            {data.map((entry, index) => {
              // Mathematical edge: If WR * RR > 100% equivalent (approx), it's profitable
              const isProfitable = entry.totalPnl >= 0;
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={isProfitable ? "#00c896" : "#ff4d6a"} 
                  fillOpacity={0.6}
                  stroke={isProfitable ? "#00c896" : "#ff4d6a"}
                  strokeWidth={1}
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
