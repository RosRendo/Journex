"use client";

import React from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis, ReferenceLine } from "recharts";
import { Clock } from "lucide-react";

export function TradeDurationScatterPlot({ trades }: { trades: any[] }) {
  // Process trades to extract duration (in minutes) and PnL
  const data = trades.map(t => {
    const durationMs = new Date(t.close_time).getTime() - new Date(t.open_time).getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
    return {
      duration: durationMinutes,
      pnl: t.profit,
      pair: t.symbol,
      z: 1 // For scatter size
    };
  }).filter(t => !isNaN(t.duration) && !isNaN(t.pnl));

  const winningTrades = data.filter(t => t.pnl > 0);
  const losingTrades = data.filter(t => t.pnl <= 0);

  return (
    <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg p-5 h-full flex flex-col font-mono text-[9px]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[9px] uppercase tracking-widest font-bold text-[#71717a]">Trade Duration vs Profit</span>
        <span className="text-[8px] text-zinc-550 uppercase">Operational Analytics</span>
      </div>
      <div className="flex-1 w-full h-full min-h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis 
                type="number" 
                dataKey="duration" 
                name="Duration" 
                unit="m" 
                stroke="transparent" 
                tick={{fill: '#71717a', fontSize: 9, fontFamily: "monospace"}}
              />
              <YAxis 
                type="number" 
                dataKey="pnl" 
                name="PnL" 
                unit="$" 
                stroke="transparent"
                tick={{fill: '#71717a', fontSize: 9, fontFamily: "monospace"}}
              />
              <ZAxis type="number" dataKey="z" range={[50, 50]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3', stroke: "rgba(255,255,255,0.05)" }} 
                contentStyle={{ backgroundColor: '#101014', borderColor: 'rgba(255,255,255,0.07)', color: '#f4f4f5', fontSize: '10px', fontFamily: "monospace", borderRadius: 4 }}
                itemStyle={{ color: '#f4f4f5' }}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.07)" />
              <Scatter name="Wins" data={winningTrades} fill="#20e0b2" />
              <Scatter name="Losses" data={losingTrades} fill="#ff5c73" />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
            Not enough closed trades for scatter plot.
          </div>
        )}
      </div>
    </div>
  );
}
