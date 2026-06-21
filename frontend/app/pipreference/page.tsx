"use client";
import React, { useState } from "react";
import { TrendingUp, Clock, AlertCircle, Info } from "lucide-react";

const ForexPipMovement = () => {
  const [selectedStyle, setSelectedStyle] = useState("all");
  const [selectedSession, setSelectedSession] = useState("high");

  const pipData = {
    high: {
      XAUUSD: { "1m": 20, "5m": 50, "15m": 120, "30m": 200, "1h": 350, "4h": 800 },
      EURUSD: { "1m": 2, "5m": 5, "15m": 12, "30m": 20, "1h": 35, "4h": 80 },
      GBPUSD: { "1m": 3, "5m": 7, "15m": 15, "30m": 25, "1h": 45, "4h": 100 },
      USDJPY: { "1m": 3, "5m": 6, "15m": 13, "30m": 22, "1h": 40, "4h": 85 },
      AUDUSD: { "1m": 2, "5m": 5, "15m": 11, "30m": 18, "1h": 32, "4h": 75 },
      USDCAD: { "1m": 2, "5m": 5, "15m": 11, "30m": 19, "1h": 33, "4h": 70 },
      NZDUSD: { "1m": 2, "5m": 5, "15m": 10, "30m": 17, "1h": 30, "4h": 70 },
      USDCHF: { "1m": 2, "5m": 5, "15m": 11, "30m": 19, "1h": 33, "4h": 75 },
      EURJPY: { "1m": 3, "5m": 7, "15m": 16, "30m": 27, "1h": 48, "4h": 110 },
      GBPJPY: { "1m": 4, "5m": 9, "15m": 20, "30m": 35, "1h": 60, "4h": 140 },
      EURGBP: { "1m": 1, "5m": 3, "15m": 8, "30m": 14, "1h": 25, "4h": 60 },
    },
    low: {
      XAUUSD: { "1m": 8, "5m": 20, "15m": 50, "30m": 80, "1h": 140, "4h": 350 },
      EURUSD: { "1m": 1, "5m": 2, "15m": 5, "30m": 8, "1h": 15, "4h": 35 },
      GBPUSD: { "1m": 1, "5m": 3, "15m": 6, "30m": 10, "1h": 18, "4h": 45 },
      USDJPY: { "1m": 1, "5m": 3, "15m": 6, "30m": 10, "1h": 17, "4h": 40 },
      AUDUSD: { "1m": 1, "5m": 2, "15m": 5, "30m": 8, "1h": 14, "4h": 32 },
      USDCAD: { "1m": 1, "5m": 2, "15m": 5, "30m": 8, "1h": 14, "4h": 30 },
      NZDUSD: { "1m": 1, "5m": 2, "15m": 4, "30m": 7, "1h": 12, "4h": 30 },
      USDCHF: { "1m": 1, "5m": 2, "15m": 5, "30m": 8, "1h": 14, "4h": 32 },
      EURJPY: { "1m": 1, "5m": 3, "15m": 7, "30m": 11, "1h": 20, "4h": 50 },
      GBPJPY: { "1m": 2, "5m": 4, "15m": 9, "30m": 15, "1h": 25, "4h": 65 },
      EURGBP: { "1m": 1, "5m": 2, "15m": 4, "30m": 6, "1h": 11, "4h": 25 },
    },
  } as const;

  const tradingStyles = {
    scalping: { timeframes: ["1m", "5m"], typical_tp: "5-15 pips", typical_sl: "5-10 pips", rr_ratio: "1:1 to 1:2", trades_per_day: "10-50+", best_session: "London/NY overlap" },
    day: { timeframes: ["5m", "15m", "30m", "1h"], typical_tp: "20-50 pips", typical_sl: "15-30 pips", rr_ratio: "1:1.5 to 1:3", trades_per_day: "2-8", best_session: "London or NY" },
    swing: { timeframes: ["1h", "4h"], typical_tp: "50-200 pips", typical_sl: "30-80 pips", rr_ratio: "1:2 to 1:4", trades_per_day: "0-2", best_session: "Any (holds overnight)" },
  };

  const data = pipData[selectedSession as keyof typeof pipData];
  const pairs = Object.keys(data);

  const styleColors = { scalping: "text-red-400", day: "text-amber-400", swing: "text-emerald-400" };

  const insights = [
    { icon: Info, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20", title: "TP/SL Setting Guidelines", items: ["Take Profit: Aim for 50-80% of average timeframe movement", "Stop Loss: Set at 100-150% of average movement (wider than TP)", "Risk:Reward: Minimum 1:1.5, ideally 1:2 or better", "Greed Control: Take profit when you hit 60-70% of target if price stalls"] },
    { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", title: "Volatility Considerations", items: ["JPY pairs (USDJPY, EURJPY, GBPJPY): Most volatile, wider stops needed", "GBPJPY: Highest volatility - can move 4+ pips per minute", "EURGBP: Lowest volatility - tighter targets work better", "News releases: Movement can be 3-10x normal, avoid or widen stops"] },
    { icon: Clock, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", title: "Session-Based Strategy", items: ["London (8:00-12:00 GMT): Best for EUR, GBP pairs", "NY (13:00-17:00 GMT): Best for USD pairs - strong trends", "London/NY Overlap (13:00-16:00 GMT): Highest volume, best for scalping", "Asian (23:00-8:00 GMT): Lower volume, range-bound trading"] },
    { icon: AlertCircle, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", title: "Avoiding Greed & Reversals", items: ["Scale out: Take 50% profit at 1:1.5 RR, let rest run to full TP", "Move SL to breakeven: Once price moves 50% to TP", "Watch key levels: Previous high/low, round numbers, S/R", "Time-based exit: If trade hasn't moved in 2-3 candles, consider closing"] },
  ];

  return (
          <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="text-emerald-400" size={24} />
            </div>
            PIP Movement Reference 
          </h1>
          <p className="text-muted-foreground text-sm mt-2 ml-1">
            Average pip movements per timeframe to set realistic TP/SL targets
          </p>
        </div>

        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md p-5 shadow-xl">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Trading Session</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none cursor-pointer"
            >
              <option value="high" className="bg-[#111118]">High Volume (London/NY Overlap)</option>
              <option value="low" className="bg-[#111118]">Low Volume (Asian Session)</option>
            </select>
          </div>
          <div className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md p-5 shadow-xl">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Filter by Style</label>
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none cursor-pointer"
            >
              <option value="all" className="bg-[#111118]">All Timeframes</option>
              <option value="scalping" className="bg-[#111118]">Scalping (1m, 5m)</option>
              <option value="day" className="bg-[#111118]">Day Trading (5m-1h)</option>
              <option value="swing" className="bg-[#111118]">Swing (1h, 4h)</option>
            </select>
          </div>
        </div>

        {/* Main Table */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-xl overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-emerald-500/5 mix-blend-overlay pointer-events-none" />
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pair</th>
                  {(selectedStyle === "all" || selectedStyle === "scalping") && (<><th className="px-4 py-3 text-center text-xs font-semibold text-red-400 uppercase">1m</th><th className="px-4 py-3 text-center text-xs font-semibold text-red-400 uppercase">5m</th></>)}
                  {(selectedStyle === "all" || selectedStyle === "day") && (<><th className="px-4 py-3 text-center text-xs font-semibold text-amber-400 uppercase">15m</th><th className="px-4 py-3 text-center text-xs font-semibold text-amber-400 uppercase">30m</th><th className="px-4 py-3 text-center text-xs font-semibold text-amber-400 uppercase">1h</th></>)}
                  {(selectedStyle === "all" || selectedStyle === "swing") && (<th className="px-4 py-3 text-center text-xs font-semibold text-emerald-400 uppercase">4h</th>)}
                </tr>
              </thead>
              <tbody>
                {pairs.map((pair, idx) => (
                  <tr key={pair} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? "bg-black/20" : "bg-transparent"}`}>
                    <td className="px-5 py-4 font-extrabold text-foreground tracking-wider">{pair}</td>
                    {(selectedStyle === "all" || selectedStyle === "scalping") && (<><td className="px-4 py-4 text-center font-mono font-medium text-red-100">{data[pair as keyof typeof data]["1m"]}</td><td className="px-4 py-4 text-center font-mono font-medium text-red-200">{data[pair as keyof typeof data]["5m"]}</td></>)}
                    {(selectedStyle === "all" || selectedStyle === "day") && (<><td className="px-4 py-4 text-center font-mono font-medium text-amber-100">{data[pair as keyof typeof data]["15m"]}</td><td className="px-4 py-4 text-center font-mono font-medium text-amber-200">{data[pair as keyof typeof data]["30m"]}</td><td className="px-4 py-4 text-center font-mono font-bold text-amber-300">{data[pair as keyof typeof data]["1h"]}</td></>)}
                    {(selectedStyle === "all" || selectedStyle === "swing") && (<td className="px-4 py-4 text-center font-mono font-bold text-emerald-300">{data[pair as keyof typeof data]["4h"]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 text-[11px] uppercase tracking-widest font-bold text-muted-foreground border-t border-white/10 bg-black/40">
            Values shown in relative pips. XAUUSD values represent pip-equivalent movements.
          </div>
        </div>

        {/* Style Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {Object.entries(tradingStyles).map(([key, style]) => (
            <div key={key} className="rounded-3xl border border-white/5 bg-black/40 backdrop-blur-md p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h3 className={`text-lg font-black mb-4 uppercase tracking-widest ${styleColors[key as keyof typeof styleColors]}`}>{key} Trading</h3>
              <div className="space-y-2 text-sm text-muted-foreground relative z-10">
                <p className="flex justify-between border-b border-white/5 pb-2"><span className="font-semibold text-foreground/70">Timeframes</span> <span className="font-mono text-foreground">{style.timeframes.join(", ")}</span></p>
                <p className="flex justify-between border-b border-white/5 pb-2 pt-1"><span className="font-semibold text-foreground/70">Typical TP</span> <span className="font-mono text-foreground">{style.typical_tp}</span></p>
                <p className="flex justify-between border-b border-white/5 pb-2 pt-1"><span className="font-semibold text-foreground/70">Typical SL</span> <span className="font-mono text-foreground">{style.typical_sl}</span></p>
                <p className="flex justify-between border-b border-white/5 pb-2 pt-1"><span className="font-semibold text-foreground/70">Target R:R</span> <span className="font-mono text-foreground">{style.rr_ratio}</span></p>
                <p className="flex justify-between border-b border-white/5 pb-2 pt-1"><span className="font-semibold text-foreground/70">Trades/Day</span> <span className="font-mono text-foreground">{style.trades_per_day}</span></p>
                <p className="flex justify-between pt-1"><span className="font-semibold text-foreground/70">Best Session</span> <span className="font-mono text-right max-w-[120px] text-foreground">{style.best_session}</span></p>
              </div>
            </div>
          ))}
        </div>

        {/* Insights */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {insights.map(({ icon: Icon, color, bg, title, items }) => (
            <div key={title} className={`rounded-3xl border p-6 backdrop-blur-md shadow-xl ${bg}`}>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                <div className={`p-2 rounded-xl bg-black/40 ${color}`}>
                  <Icon size={20} />
                </div>
                <h4 className="text-base font-bold text-foreground">{title}</h4>
              </div>
              <ul className="space-y-2.5 text-sm font-medium text-foreground/80 leading-relaxed">
                {items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-muted-foreground select-none">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
  );
};

export default ForexPipMovement;
