"use client";
import { useState } from "react";
import { Star, Target, TrendingUp, Zap, CheckCircle2, AlertCircle, BarChart3, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";

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
    if (score >= 8) return { label: "Excellent Setup", color: "var(--bull)" };
    if (score >= 6) return { label: "Good Setup", color: "#22d3ee" };
    if (score >= 4) return { label: "Average Setup", color: "var(--accent)" };
    if (score >= 2) return { label: "Weak Setup", color: "#f97316" };
    return { label: "Poor Setup", color: "var(--bear)" };
  };

  const resetScores = () => {
    setCriteria(criteria.map(c => ({ ...c, score: 0 })));
  };

  const weightedScore = calculateWeightedScore();
  const rawAverage = calculateRawAverage();
  const quality = getQualityLabel(weightedScore);

  return (
    <Card className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5" style={{ color: quality.color }} />
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Setup Quality Score</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setDirection("BUY")}
            className="px-2 py-1 text-xs rounded-l-lg transition-colors"
            style={{ 
              background: direction === "BUY" ? "var(--bull)" : "var(--bg-input)",
              color: direction === "BUY" ? "white" : "var(--text-tertiary)"
            }}
          >
            BUY
          </button>
          <button
            onClick={() => setDirection("SELL")}
            className="px-2 py-1 text-xs rounded-r-lg transition-colors"
            style={{ 
              background: direction === "SELL" ? "var(--bear)" : "var(--bg-input)",
              color: direction === "SELL" ? "white" : "var(--text-tertiary)"
            }}
          >
            SELL
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={selectedPair}
          onChange={(e) => setSelectedPair(e.target.value)}
          className="flex-1 text-xs px-2 py-1.5 rounded-lg"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          {tradingPairs.map(pair => (
            <option key={pair} value={pair}>{pair}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 p-4 rounded-xl text-center" style={{ background: "var(--bg-input)" }}>
        <div className="text-4xl font-black mb-1" style={{ color: quality.color }}>
          {weightedScore.toFixed(1)}
          <span className="text-lg" style={{ color: "var(--text-tertiary)" }}>/10</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Star className="w-4 h-4" style={{ color: quality.color }} />
          <span className="text-sm font-semibold" style={{ color: quality.color }}>{quality.label}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
          <div 
            className="h-full transition-all duration-300 rounded-full"
            style={{ 
              width: `${weightedScore * 10}%`, 
              background: quality.color
            }} 
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Raw: {rawAverage.toFixed(1)}</span>
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Weighted by importance</span>
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {criteria.map(c => (
          <div key={c.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
              <span className="text-xs" style={{ color: "var(--text-primary)" }}>{c.label}</span>
              <span className="text-[10px] px-1 rounded" style={{ background: "var(--bg-input)", color: "var(--text-tertiary)" }}>
                x{c.weight}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <button
                  key={num}
                  onClick={() => updateScore(c.id, num)}
                  className={`w-5 h-5 text-[10px] rounded transition-colors ${
                    c.score >= num ? "font-bold" : ""
                  }`}
                  style={{ 
                    background: c.score >= num 
                      ? (num <= 3 ? "var(--bear)" : num <= 6 ? "var(--accent)" : "var(--bull)")
                      : "var(--bg-input)",
                    color: c.score >= num ? "white" : "var(--text-tertiary)"
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={resetScores}
        className="w-full mt-3 py-2 text-xs rounded-lg flex items-center justify-center gap-1 transition-colors hover:opacity-80"
        style={{ background: "var(--bg-input)", color: "var(--text-tertiary)" }}
      >
        <Zap className="w-3 h-3" /> Reset Scores
      </button>

      {weightedScore >= 6 && (
        <div className="mt-3 p-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(34, 197, 94, 0.1)" }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: "var(--bull)" }} />
          <span className="text-xs" style={{ color: "var(--bull)" }}>High quality setup - favorable conditions</span>
        </div>
      )}

      {weightedScore < 4 && weightedScore > 0 && (
        <div className="mt-3 p-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
          <AlertCircle className="w-4 h-4" style={{ color: "var(--bear)" }} />
          <span className="text-xs" style={{ color: "var(--bear)" }}>Low quality setup - consider skipping</span>
        </div>
      )}
    </Card>
  );
}