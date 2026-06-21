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
    <div className="bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
         <Clock className="w-5 h-5 text-purple-400" />
         <h3 className="text-sm font-bold text-gray-200 tracking-wide uppercase">Trade Duration vs PnL</h3>
      </div>
      <div className="flex-1 w-full h-full min-h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis 
                type="number" 
                dataKey="duration" 
                name="Duration" 
                unit=" min" 
                stroke="#ffffff50" 
                tick={{fill: '#ffffff50', fontSize: 11}}
              />
              <YAxis 
                type="number" 
                dataKey="pnl" 
                name="PnL" 
                unit="$" 
                stroke="#ffffff50"
                tick={{fill: '#ffffff50', fontSize: 11}}
              />
              <ZAxis type="number" dataKey="z" range={[50, 50]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff20', color: '#fff', fontSize: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <ReferenceLine y={0} stroke="#ffffff30" />
              <Scatter name="Wins" data={winningTrades} fill="#00dc82" />
              <Scatter name="Losses" data={losingTrades} fill="#ef4444" />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Not enough closed trades for scatter plot.
          </div>
        )}
      </div>
    </div>
  );
}
