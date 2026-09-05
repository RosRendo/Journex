"use client";
import { useState, useEffect } from "react";
import { Star, Target, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, MessageSquare, Calendar, X, Save, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";

import { useCsvTrades } from "@/hooks/useCsvTrades";

interface TradeRating {
  id: string;
  tradeId: string;
  pair: string;
  direction: "BUY" | "SELL";
  pnl: number;
  setupScore: number;
  executionScore: number;
  emotionalScore: number;
  outcomeScore: number;
  notes: string;
  mistakes: string[];
  date: string;
}

const mistakeOptions = [
  "Overtrading", "FOMO", "Revenge trading", "No SL", "Wrong Sizing",
  "Early exit", "Late entry", "Ignored plan", "Emotional trading",
  "Chasing price", "News trading", "Session trading", "Size up"
];

export default function TradeQualityRater() {
  const { trades: realTrades = [] } = useCsvTrades();
  const [trades, setTrades] = useState<TradeRating[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<TradeRating | null>(null);
  const [editingMistake, setEditingMistake] = useState<string | null>(null);
  const [newMistake, setNewMistake] = useState("");

  useEffect(() => {
    if (realTrades.length > 0) {
      const mapped: TradeRating[] = realTrades.slice(0, 20).map(t => ({
        id: t.id.toString(),
        tradeId: t.ticket || `T${t.id}`,
        pair: t.pair || "XAUUSD",
        direction: (t.direction === "Long" ? "BUY" : "SELL") as "BUY" | "SELL",
        pnl: t.profit || 0,
        setupScore: t.outcome === "W" ? 8 : 5,
        executionScore: t.followedPlan !== false ? 8 : 4,
        emotionalScore: 7,
        outcomeScore: (t.profit || 0) > 0 ? 8 : 4,
        notes: t.notes || (t.planDeviationReason ? `Deviation: ${t.planDeviationReason}` : "Standard execution"),
        mistakes: t.planDeviationReason ? [t.planDeviationReason] : ((t.profit || 0) < -50 ? ["Overtrading"] : []),
        date: t.date ? t.date.split("T")[0] : new Date().toISOString().split("T")[0],
      }));
      setTrades(mapped);
      if (!selectedTrade && mapped.length > 0) {
        setSelectedTrade(mapped[0]);
      }
    }
  }, [realTrades]);

  const updateTradeRating = (tradeId: string, field: keyof TradeRating, value: any) => {
    setTrades(trades.map(t => t.tradeId === tradeId ? { ...t, [field]: value } : t));
    if (selectedTrade?.tradeId === tradeId) {
      setSelectedTrade({ ...selectedTrade, [field]: value });
    }
  };

  const addMistake = (tradeId: string) => {
    if (newMistake && !mistakeOptions.includes(newMistake)) {
      setTrades(trades.map(t => t.tradeId === tradeId 
        ? { ...t, mistakes: [...t.mistakes, newMistake] } 
        : t
      ));
      if (selectedTrade?.tradeId === tradeId) {
        setSelectedTrade({ ...selectedTrade, mistakes: [...selectedTrade.mistakes, newMistake] });
      }
      setNewMistake("");
    }
    setEditingMistake(null);
  };

  const removeMistake = (tradeId: string, mistake: string) => {
    setTrades(trades.map(t => t.tradeId === tradeId 
      ? { ...t, mistakes: t.mistakes.filter(m => m !== mistake) } 
      : t
    ));
    if (selectedTrade?.tradeId === tradeId) {
      setSelectedTrade({ ...selectedTrade, mistakes: selectedTrade.mistakes.filter(m => m !== mistake) });
    }
  };

  const getAverageScore = (trade: TradeRating) => {
    return (trade.setupScore + trade.executionScore + trade.emotionalScore + trade.outcomeScore) / 4;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "var(--bull)";
    if (score >= 5) return "var(--accent)";
    return "var(--bear)";
  };

  const renderStars = (score: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
        <button
          key={num}
          onClick={() => selectedTrade && updateTradeRating(selectedTrade.tradeId, "setupScore", num)}
          className="w-4 h-4 text-[8px] rounded transition-colors"
          style={{ 
            background: num <= score ? getScoreColor(score) : "var(--bg-input)",
            color: num <= score ? "white" : "var(--text-tertiary)"
          }}
        >
          {num}
        </button>
      ))}
    </div>
  );

  return (
    <Card className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Trade Quality Rater</h3>
        </div>
        <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
          {trades.length} trades
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
        {trades.map(trade => (
          <button
            key={trade.id}
            onClick={() => setSelectedTrade(trade)}
            className="w-full p-3 rounded-lg text-left transition-all hover:opacity-80"
            style={{ 
              background: selectedTrade?.tradeId === trade.tradeId ? "var(--accent)" : "var(--bg-input)",
              border: `1px solid ${trade.pnl >= 0 ? "var(--bull)" : "var(--bear)"}`
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: selectedTrade?.tradeId === trade.tradeId ? "white" : "var(--text-primary)" }}>
                  {trade.pair}
                </span>
                <span 
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ 
                    background: trade.direction === "BUY" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                    color: trade.direction === "BUY" ? "var(--bull)" : "var(--bear)"
                  }}
                >
                  {trade.direction}
                </span>
              </div>
              <span 
                className="text-xs font-bold"
                style={{ color: selectedTrade?.tradeId === trade.tradeId ? "white" : trade.pnl >= 0 ? "var(--bull)" : "var(--bear)" }}
              >
                {trade.pnl >= 0 ? "+" : ""}{trade.pnl}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px]" style={{ color: selectedTrade?.tradeId === trade.tradeId ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)" }}>
                Score: {getAverageScore(trade).toFixed(1)}/10
              </span>
              <span className="text-[10px]" style={{ color: selectedTrade?.tradeId === trade.tradeId ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)" }}>
                {trade.date}
              </span>
            </div>
          </button>
        ))}
      </div>

      {selectedTrade && (
        <div className="p-3 rounded-lg mt-4" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{selectedTrade.pair}</span>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{selectedTrade.tradeId}</span>
            </div>
            <button onClick={() => setSelectedTrade(null)}>
              <X className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-tertiary)" }}>Setup Quality</div>
              {renderStars(selectedTrade.setupScore)}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-tertiary)" }}>Execution</div>
              {renderStars(selectedTrade.executionScore)}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-tertiary)" }}>Emotional Control</div>
              {renderStars(selectedTrade.emotionalScore)}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-tertiary)" }}>Outcome</div>
              {renderStars(selectedTrade.outcomeScore)}
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-tertiary)" }}>Mistakes Made</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedTrade.mistakes.map(mistake => (
                  <span 
                    key={mistake} 
                    className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                    style={{ background: "rgba(239,68,68,0.2)", color: "var(--bear)" }}
                  >
                    {mistake}
                    <button onClick={() => removeMistake(selectedTrade.tradeId, mistake)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              {editingMistake === selectedTrade.tradeId ? (
                <div className="flex gap-1">
                  <select
                    value={newMistake}
                    onChange={(e) => setNewMistake(e.target.value)}
                    className="flex-1 text-xs px-2 py-1 rounded"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  >
                    <option value="">Select mistake...</option>
                    {mistakeOptions.filter(m => !selectedTrade.mistakes.includes(m)).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => addMistake(selectedTrade.tradeId)}
                    className="px-2 py-1 rounded"
                    style={{ background: "var(--bull)", color: "white" }}
                  >
                    <Save className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingMistake(selectedTrade.tradeId)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: "var(--bg-primary)", color: "var(--text-tertiary)" }}
                >
                  + Add Mistake
                </button>
              )}
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-tertiary)" }}>Notes</div>
              <textarea
                value={selectedTrade.notes}
                onChange={(e) => updateTradeRating(selectedTrade.tradeId, "notes", e.target.value)}
                className="w-full text-xs p-2 rounded-lg resize-none"
                rows={2}
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                placeholder="What went well / what to improve..."
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
