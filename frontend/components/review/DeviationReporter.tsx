"use client";
import { useState } from "react";
import { GitCompare, TrendingUp, TrendingDown, ArrowRight, AlertTriangle, CheckCircle2, X, Activity, Target, Clock, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TradeDeviation {
  id: string;
  tradeId: string;
  pair: string;
  direction: "BUY" | "SELL";
  plannedEntry: number;
  actualEntry: number;
  plannedSL: number;
  actualSL: number;
  plannedTP: number;
  actualTP: number;
  plannedSize: number;
  actualSize: number;
  plannedRR: number;
  actualRR: number;
  pnl: number;
  date: string;
  deviationReason: string;
}

const mockDeviations: TradeDeviation[] = [
  { 
    id: "1", 
    tradeId: "T001", pair: "XAUUSD", direction: "BUY",
    plannedEntry: 2650.00, actualEntry: 2649.50,
    plannedSL: 2645.00, actualSL: 2645.00,
    plannedTP: 2660.00, actualTP: 2658.00,
    plannedSize: 0.10, actualSize: 0.10,
    plannedRR: 2, actualRR: 1.7,
    pnl: 85, date: "2026-04-20",
    deviationReason: "Entered at better price - Good"
  },
  { 
    id: "2", 
    tradeId: "T002", pair: "EURUSD", direction: "SELL",
    plannedEntry: 1.0850, actualEntry: 1.0865,
    plannedSL: 1.0900, actualSL: 1.0895,
    plannedTP: 1.0750, actualTP: 1.0780,
    plannedSize: 0.10, actualSize: 0.15,
    plannedRR: 2, actualRR: 1.3,
    pnl: -60, date: "2026-04-20",
    deviationReason: "Chased price - missed entry"
  },
  { 
    id: "3", 
    tradeId: "T003", pair: "GBPUSD", direction: "BUY",
    plannedEntry: 1.2420, actualEntry: 1.2420,
    plannedSL: 1.2370, actualSL: 1.2375,
    plannedTP: 1.2520, actualTP: 1.2520,
    plannedSize: 0.10, actualSize: 0.10,
    plannedRR: 2, actualRR: 2,
    pnl: 100, date: "2026-04-19",
    deviationReason: "Perfect execution"
  },
  { 
    id: "4", 
    tradeId: "T004", pair: "USDJPY", direction: "SELL",
    plannedEntry: 148.50, actualEntry: 148.80,
    plannedSL: 149.00, actualSL: 148.75,
    plannedTP: 147.50, actualTP: 147.80,
    plannedSize: 0.10, actualSize: 0.20,
    plannedRR: 2, actualRR: 0.9,
    pnl: -100, date: "2026-04-19",
    deviationReason: "Size doubled - revenge"
  },
  { 
    id: "5", 
    tradeId: "T005", pair: "AUDUSD", direction: "BUY",
    plannedEntry: 0.6520, actualEntry: 0.6510,
    plannedSL: 0.6470, actualSL: 0.6480,
    plannedTP: 0.6620, actualTP: 0.6600,
    plannedSize: 0.10, actualSize: 0.10,
    plannedRR: 2, actualRR: 1.8,
    pnl: 90, date: "2026-04-18",
    deviationReason: "Partial exit early"
  },
];

export default function DeviationReporter() {
  const [selectedTrade, setSelectedTrade] = useState<TradeDeviation | null>(null);

  const getDeviationSeverity = (deviation: number, field: string) => {
    if (field === "Size") {
      return Math.abs(deviation) > 0 ? "high" : "none";
    }
    if (deviation === 0) return "none";
    if (field === "Entry" && Math.abs(deviation) <= 5) return "low";
    return "medium";
  };

  const formatPrice = (price: number, pair: string) => {
    const decimals = pair.includes("JPY") ? 2 : 4;
    return price.toFixed(decimals);
  };

  const renderComparison = (planned: number, actual: number, field: string, pair: string, isPip = false) => {
    const deviation = planned - actual;
    const severity = getDeviationSeverity(deviation, field);
    
    const getColor = () => {
      if (severity === "none") return "var(--text-primary)";
      if (severity === "high") return "var(--bear)";
      if (severity === "medium") return "#f97316";
      return "var(--accent)";
    };

    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{field}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
            {isPip ? formatPrice(planned, pair) : planned}
          </span>
          <ArrowRight className="w-3 h-3 style" style={{ color: "var(--text-tertiary)" }} />
          <span className="text-xs font-mono font-bold" style={{ color: getColor() }}>
            {isPip ? formatPrice(actual, pair) : actual}
          </span>
          {deviation !== 0 && (
            <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.2)", color: "var(--bear)" }}>
              {deviation > 0 ? "+" : ""}{isPip ? formatPrice(deviation, pair) : deviation}
            </span>
          )}
        </div>
      </div>
    );
  };

  const calculateTradeScore = (trade: TradeDeviation) => {
    let score = 10;
    const entryDev = Math.abs(trade.plannedEntry - trade.actualEntry);
    const slDev = Math.abs(trade.plannedSL - trade.actualSL);
    const tpDev = Math.abs(trade.plannedTP - trade.actualTP);
    const sizeDev = Math.abs(trade.plannedSize - trade.actualSize);
    const rrDev = Math.abs(trade.plannedRR - trade.actualRR);

    if (entryDev > 10) score -= 2;
    if (slDev > 5) score -= 1;
    if (tpDev > 10) score -= 1;
    if (sizeDev > 0.01) score -= 3;
    if (rrDev > 0.5) score -= 2;

    return Math.max(0, score);
  };

  return (
    <Card className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitCompare className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Deviation Reporter</h3>
        </div>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Compare planned vs actual
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
        {mockDeviations.map(trade => {
          const score = calculateTradeScore(trade);
          const hasDeviation = trade.plannedEntry !== trade.actualEntry || 
                           trade.plannedSize !== trade.actualSize ||
                           trade.plannedRR !== trade.actualRR;
          
          return (
            <button
              key={trade.id}
              onClick={() => setSelectedTrade(selectedTrade?.tradeId === trade.tradeId ? null : trade)}
              className="w-full p-3 rounded-lg text-left transition-all hover:opacity-80"
              style={{ 
                background: selectedTrade?.tradeId === trade.tradeId ? "var(--accent)" : "var(--bg-input)",
                border: `1px solid ${hasDeviation ? "#f97316" : "var(--border)"}`
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: selectedTrade?.tradeId === trade.tradeId ? "white" : "var(--text-primary)" }}>
                    {trade.pair}
                  </span>
                  <span 
                    className="text-[10px] px-1 py-0.5 rounded"
                    style={{ 
                      background: trade.direction === "BUY" ? "var(--bull)" : "var(--bear)",
                      color: "white"
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
                <div className="flex items-center gap-1">
                  {hasDeviation ? (
                    <AlertTriangle className="w-3 h-3" style={{ color: "#f97316" }} />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" style={{ color: "var(--bull)" }} />
                  )}
                  <span className="text-[10px]" style={{ color: selectedTrade?.tradeId === trade.tradeId ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)" }}>
                    Score: {score}/10
                  </span>
                </div>
                <span className="text-[10px]" style={{ color: selectedTrade?.tradeId === trade.tradeId ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)" }}>
                  {trade.date}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedTrade && (
        <div className="p-3 rounded-lg mt-4" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{selectedTrade.pair}</span>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{selectedTrade.date}</span>
            </div>
            <button onClick={() => setSelectedTrade(null)}>
              <X className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            </button>
          </div>

          <div className="space-y-0">
            {renderComparison(selectedTrade.plannedEntry, selectedTrade.actualEntry, "Entry", selectedTrade.pair, true)}
            {renderComparison(selectedTrade.plannedSL, selectedTrade.actualSL, "SL", selectedTrade.pair, true)}
            {renderComparison(selectedTrade.plannedTP, selectedTrade.actualTP, "TP", selectedTrade.pair, true)}
            {renderComparison(selectedTrade.plannedSize, selectedTrade.actualSize, "Size", selectedTrade.pair)}
            {renderComparison(selectedTrade.plannedRR, selectedTrade.actualRR, "R:R", selectedTrade.pair)}
          </div>

          <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-1 mb-1">
              <Target className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
              <span className="text-[10px] font-bold" style={{ color: "var(--text-tertiary)" }}>REASON</span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-primary)" }}>
              {selectedTrade.deviationReason}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}