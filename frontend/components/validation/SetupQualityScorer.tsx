"use client";
import { useState } from "react";
import { Star, Target, TrendingUp, Zap, CheckCircle2, AlertCircle, BarChart3, Activity } from "lucide-react";

interface Criteria {
  id: string;
  label: string;
  maxScore: number;
  score: number;
  weight: number;
}

const defaultCriteria: Criteria[] = [
  { id: "1", label: "Trend alignment", maxScore: 10, score: 0, weight: 1.5 },
  { id: "2", label: "S/R proximity", maxScore: 10, score: 0, weight: 1.2 },
  { id: "3", label: "Candlestick pattern", maxScore: 10, score: 0, weight: 1.0 },
  { id: "4", label: "Volume confirmation", maxScore: 10, score: 0, weight: 0.8 },
  { id: "5", label: "Risk/Reward ratio", maxScore: 10, score: 0, weight: 1.3 },
  { id: "6", label: "Market structure", maxScore: 10, score: 0, weight: 1.0 },
  { id: "7", label: "Time of trade", maxScore: 10, score: 0, weight: 0.7 },
  { id: "8", label: "News context", maxScore: 10, score: 0, weight: 0.5 },
];

const tradingPairs = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "AUDUSD", "USDCAD"];

export default function SetupQualityScorer() {
  const [criteria, setCriteria] = useState<Criteria[]>(defaultCriteria);
  const [selectedPair, setSelectedPair] = useState("EURUSD");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");

  const updateScore = (id: string, score: number) => {
    setCriteria(criteria.map(c => c.id === id ? { ...c, score } : c));
  };

  const calculateWeightedScore = () => {
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    const weightedSum = criteria.reduce((sum, c) => sum + (c.score * c.weight), 0);
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const calculateRawAverage = () => {
    const total = criteria.reduce((sum, c) => sum + c.score, 0);
    return total / criteria.length;
  };

  const getQualityLabel = (score: number) => {
    if (score >= 8) return { label: "Excellent Setup", color: "#10b981" };
    if (score >= 6) return { label: "Good Setup", color: "#22d3ee" };
    if (score >= 4) return { label: "Average Setup", color: "#f59e0b" };
    if (score >= 2) return { label: "Weak Setup", color: "#f97316" };
    return { label: "Poor Setup", color: "#ef4444" };
  };

  const resetScores = () => {
    setCriteria(criteria.map(c => ({ ...c, score: 0 })));
  };

  const weightedScore = calculateWeightedScore();
  const rawAverage = calculateRawAverage();
  const quality = getQualityLabel(weightedScore);

  return (
    <div className="bg-[#111118] border border-zinc-800/40 rounded-xl p-5 shadow-xl font-mono text-[10px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" style={{ color: quality.color }} />
          <h3 className="font-bold uppercase tracking-widest text-zinc-300">Setup Quality Score</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setDirection("BUY")}
            className={`px-2.5 py-1 text-[9px] rounded-l font-bold transition-all uppercase tracking-wider ${direction === "BUY" ? "bg-emerald-500 text-emerald-950" : "bg-black/25 text-zinc-550 border border-zinc-850"}`}
          >
            BUY
          </button>
          <button
            onClick={() => setDirection("SELL")}
            className={`px-2.5 py-1 text-[9px] rounded-r font-bold transition-all uppercase tracking-wider ${direction === "SELL" ? "bg-red-500 text-white" : "bg-black/25 text-zinc-550 border border-zinc-850"}`}
          >
            SELL
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={selectedPair}
          onChange={(e) => setSelectedPair(e.target.value)}
          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-black/25 border border-zinc-800/60 text-white cursor-pointer"
        >
          {tradingPairs.map(pair => (
            <option key={pair} value={pair} className="bg-zinc-950 text-white">{pair}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 p-4 rounded-xl text-center bg-black/25 border border-zinc-850">
        <div className="text-3xl font-black mb-1 font-mono" style={{ color: quality.color }}>
          {weightedScore.toFixed(1)}
          <span className="text-sm text-zinc-650 font-normal">/10</span>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <Star className="w-3.5 h-3.5" style={{ color: quality.color }} />
          <span className="text-[11px] font-bold" style={{ color: quality.color }}>{quality.label}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="h-1.5 rounded-full overflow-hidden bg-black/35 border border-zinc-850">
          <div 
            className="h-full transition-all duration-300 rounded-full"
            style={{ 
              width: `${weightedScore * 10}%`, 
              background: quality.color
            }} 
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[8px] text-zinc-550 font-bold">
          <span>Raw Avg: {rawAverage.toFixed(1)}</span>
          <span>Weighted metrics</span>
        </div>
      </div>

      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        {criteria.map(c => (
          <div key={c.id} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-zinc-400">
              <Activity className="w-3 h-3 text-zinc-550" />
              <span className="font-sans text-[11px] text-zinc-350">{c.label}</span>
              <span className="text-[8px] px-1 rounded bg-black/25 border border-zinc-850 text-zinc-500 font-mono">
                x{c.weight}
              </span>
            </div>
            <div className="flex items-center gap-0.5 font-mono">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                const isSelected = c.score >= num;
                const scoreColor = num <= 3 ? "bg-red-500/20 text-red-400 border border-red-500/30" : num <= 6 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-450 border border-emerald-500/30";
                
                return (
                  <button
                    key={num}
                    onClick={() => updateScore(c.id, num)}
                    className={`w-4.5 h-4.5 text-[8px] rounded transition-all flex items-center justify-center font-bold ${
                      isSelected 
                        ? scoreColor
                        : "bg-black/25 text-zinc-650 hover:bg-black/35"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={resetScores}
        className="w-full mt-3 py-2 bg-black/25 border border-zinc-800 text-zinc-500 hover:text-white rounded-lg flex items-center justify-center gap-1 transition-all uppercase tracking-wider font-bold"
      >
        <Zap className="w-3.5 h-3.5" /> Reset Scores
      </button>

      {weightedScore >= 6 && (
        <div className="mt-3 p-2.5 rounded-lg flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="font-bold uppercase tracking-wider text-[9px]">High quality setup - favorable conditions</span>
        </div>
      )}

      {weightedScore < 4 && weightedScore > 0 && (
        <div className="mt-3 p-2.5 rounded-lg flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span className="font-bold uppercase tracking-wider text-[9px]">Low quality setup - consider skipping</span>
        </div>
      )}
    </div>
  );
}
