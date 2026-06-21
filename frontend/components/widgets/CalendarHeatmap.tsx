"use client";

import React, { useMemo } from "react";
import type { TradeData } from "@/hooks/useCsvTrades";
import { Tooltip, ResponsiveContainer } from "recharts";

export function CalendarHeatmap({ trades }: { trades: TradeData[] }) {
  // We want to generate the last 365 days or just the current year up to today
  const { weeks, monthLabels, maxAbsPnl } = useMemo(() => {
    const today = new Date();
    // Start 52 weeks ago
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // Aggregate PnL by Date string YYYY-MM-DD
    const pnlByDate = new Map<string, number>();
    let maxAbs = 0;
    
    trades.forEach(t => {
      const d = new Date(t.date);
      // Skip if invalid
      if(isNaN(d.getTime())) return;
      
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const current = pnlByDate.get(key) || 0;
      const updated = current + t.profit;
      pnlByDate.set(key, updated);
      
      if (Math.abs(updated) > maxAbs) maxAbs = Math.abs(updated);
    });

    const weeksArray: { date: Date; pnl: number; key: string }[][] = [];
    const mLabels: { month: string; offset: number }[] = [];
    
    let currentWeek: { date: Date; pnl: number; key: string }[] = [];
    let currentDay = new Date(startDate);
    let lastMonth = -1;

    for (let i = 0; i < 371; i++) {
      if (currentDay > today && currentWeek.length === 0) break;

      const key = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;
      const pnl = pnlByDate.get(key) || 0;

      if (currentDay.getDate() === 1 || (lastMonth === -1 && currentDay.getDate() <= 7)) {
        const monthName = currentDay.toLocaleDateString('en-US', { month: 'short' });
        // Don't add duplicate labels too close
        if (mLabels.length === 0 || mLabels[mLabels.length - 1].month !== monthName) {
           mLabels.push({ month: monthName, offset: weeksArray.length });
        }
      }
      lastMonth = currentDay.getMonth();

      currentWeek.push({
        date: new Date(currentDay),
        pnl,
        key
      });

      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    if (currentWeek.length > 0) {
      weeksArray.push(currentWeek);
    }

    return { weeks: weeksArray, monthLabels: mLabels, maxAbsPnl: maxAbs || 1 };
  }, [trades]);

  const getColor = (pnl: number) => {
    if (pnl === 0) return "rgba(255, 255, 255, 0.03)";
    const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1);
    // Base 20% + 80% of intensity
    const opacity = 0.2 + (0.8 * intensity);
    if (pnl > 0) {
      return `rgba(0, 200, 150, ${opacity})`; // #00c896
    } else {
      return `rgba(255, 77, 106, ${opacity})`; // #ff4d6a
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
      <div className="min-w-[800px] relative">
        {/* Month Labels */}
        <div className="flex text-[10px] text-gray-500 mb-2 h-4 relative">
          {monthLabels.map((m, i) => (
            <div key={i} className="absolute" style={{ left: `${(m.offset / weeks.length) * 100}%` }}>
              {m.month}
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {/* Day Labels */}
          <div className="flex flex-col gap-1 pr-2 text-[9px] text-gray-500 justify-between py-1">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>

          {/* Grid */}
          <div className="flex gap-1 flex-1">
            {weeks.map((week, wIndex) => (
              <div key={wIndex} className="flex flex-col gap-1">
                {week.map((day, dIndex) => (
                  <div
                    key={day.key}
                    title={`${day.key}: ${day.pnl >= 0 ? '+' : ''}$${day.pnl.toFixed(2)}`}
                    className="w-[11px] h-[11px] rounded-[2px] transition-all hover:ring-1 hover:ring-white/50 cursor-pointer"
                    style={{ backgroundColor: getColor(day.pnl) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-gray-500">
          <span>Loss</span>
          <div className="flex gap-1">
             <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(255, 77, 106, 1)' }} />
             <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(255, 77, 106, 0.4)' }} />
             <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }} />
             <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(0, 200, 150, 0.4)' }} />
             <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(0, 200, 150, 1)' }} />
          </div>
          <span>Profit</span>
        </div>
      </div>
    </div>
  );
}
