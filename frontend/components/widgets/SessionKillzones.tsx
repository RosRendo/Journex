"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Activity, Target, Zap } from "lucide-react";

interface Killzone {
  name: string;
  start: number; // Hour in NY time (EST/EDT) 0-24
  end: number;
  color: string;
  description: string;
}

const KILLZONES: Killzone[] = [
  { name: "Asian Range", start: 20, end: 24, color: "var(--accent)", description: "Consolidation & liquidity building" },
  { name: "London Open", start: 2, end: 5, color: "#00d4a1", description: "Judas swing & true daily direction" },
  { name: "New York Open", start: 7, end: 10, color: "var(--bull)", description: "Highest volume & trend continuation/reversal" },
  { name: "London Close", start: 10, end: 12, color: "var(--bear)", description: "Profit taking & daily retracement" }
];

export default function SessionKillzones({ trades = [] }: { trades?: any[] }) {
  const [nyTime, setNyTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      // Get current NY time
      const nyTimeString = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
      setNyTime(new Date(nyTimeString));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = nyTime.getHours() + nyTime.getMinutes() / 60;
  
  // Determine active killzone
  const activeZone = KILLZONES.find(k => currentHour >= k.start && currentHour < k.end);

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const killzoneStats = React.useMemo(() => {
    const stats: Record<string, { total: number; wins: number; winRate: number }> = {};
    
    // Initialize stats
    KILLZONES.forEach(k => {
      stats[k.name] = { total: 0, wins: 0, winRate: 0 };
    });
    
    trades.forEach(t => {
      if (!t.date) return;
      
      const date = new Date(t.date);
      let nyHour = 0;
      try {
        const nyString = date.toLocaleString("en-US", { 
          timeZone: "America/New_York", 
          hour: "numeric", 
          hour12: false 
        });
        nyHour = parseInt(nyString, 10);
      } catch (e) {
        nyHour = date.getHours();
      }
      
      const matchedZone = KILLZONES.find(k => {
        if (k.start <= k.end) {
          return nyHour >= k.start && nyHour < k.end;
        } else {
          return nyHour >= k.start || nyHour < k.end;
        }
      });
      
      if (matchedZone) {
        stats[matchedZone.name].total += 1;
        if (t.outcome === "Win" || t.outcome === "W" || Number(t.profit) > 0) {
          stats[matchedZone.name].wins += 1;
        }
      }
    });
    
    KILLZONES.forEach(k => {
      const z = stats[k.name];
      z.winRate = z.total > 0 ? Math.round((z.wins / z.total) * 100) : 0;
    });
    
    return stats;
  }, [trades]);

  return (
    <div className="rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl shadow-2xl h-full border" 
         style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      
      {/* Background ambient glow if active zone exists */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none transition-colors duration-1000" 
           style={{ background: activeZone ? activeZone.color : "transparent" }} />
           
      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        <div className="flex items-center justify-between border-b pb-4 shrink-0" style={{ borderColor: "var(--border-strong)" }}>
          <span className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Target size={16} style={{ color: "var(--accent)" }}/> ICT Killzones
          </span>
          <span className="text-[12px] font-mono font-bold flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <Clock size={14} /> NY Time: {formatTime(nyTime)}
          </span>
        </div>

        {activeZone ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="p-3.5 rounded-lg flex items-center gap-4 relative overflow-hidden shadow-lg border shrink-0"
            style={{ background: "var(--bg-elevated)", borderColor: activeZone.color }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-2xl rounded-full" style={{ background: activeZone.color }} />
            
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg relative z-10" 
                 style={{ background: `linear-gradient(135deg, ${activeZone.color}40, transparent)`, border: `1px solid ${activeZone.color}` }}>
              <Activity size={18} style={{ color: activeZone.color }} />
            </div>
            <div className="relative z-10">
               <div className="text-[9px] font-bold uppercase tracking-widest mb-0.5 animate-pulse" style={{ color: activeZone.color }}>
                 Active Killzone
               </div>
               <div className="text-[16px] font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                 {activeZone.name}
               </div>
            </div>
          </motion.div>
        ) : (
          <div className="p-3.5 rounded-lg border flex items-center justify-center gap-2 text-[12px] font-bold shrink-0"
               style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-strong)", color: "var(--text-tertiary)" }}>
            <Clock size={14} /> Between active sessions
          </div>
        )}

        {/* Timeline visualization */}
        <div className="space-y-3 pt-2 flex-1 flex flex-col justify-end">
           <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Session Performance (NY Time)</div>
           <div className="space-y-2.5">
             {KILLZONES.map((zone, idx) => {
               const isActive = activeZone?.name === zone.name;
               const isPast = currentHour > zone.end;
               const stat = killzoneStats[zone.name];
               
               return (
                 <div key={idx} className="flex items-center gap-3 relative justify-between">
                    <div className="w-20 text-[10px] font-mono font-bold shrink-0 text-left" style={{ color: "var(--text-tertiary)" }}>
                      {zone.start.toString().padStart(2, '0')}:00-{zone.end.toString().padStart(2, '0')}:00
                    </div>
                    
                    <div className="w-20 text-[11px] font-bold truncate text-left" style={{ color: isActive ? zone.color : isPast ? "var(--text-tertiary)" : "var(--text-secondary)" }}>
                      {zone.name}
                    </div>

                    <div className="flex-1 h-1 rounded-full relative mx-1 hidden sm:block" style={{ background: "var(--bg-elevated)" }}>
                      <motion.div 
                        className="absolute left-0 top-0 h-full rounded-full"
                        style={{ background: zone.color, opacity: isActive ? 1 : isPast ? 0.25 : 0.5 }}
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ delay: idx * 0.1 }}
                      />
                    </div>
                    
                    <div className="text-[11px] font-mono font-bold shrink-0 text-right w-24">
                      {stat.total > 0 ? (
                        <span style={{ color: stat.winRate >= 50 ? "var(--bull)" : "var(--bear)" }}>
                          {stat.winRate}% WR <span className="opacity-40">({stat.total}t)</span>
                        </span>
                      ) : (
                        <span className="opacity-30">—</span>
                      )}
                    </div>
                 </div>
               );
             })}
           </div>
        </div>
      </div>
    </div>
  );
}

