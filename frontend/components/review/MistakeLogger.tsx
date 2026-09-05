"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, TrendingDown, Brain, Clock, Target, Ban, Zap, BarChart3, Calendar, Filter, Plus, X, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

import { useCsvTrades } from "@/hooks/useCsvTrades";

interface Mistake {
  id: string;
  type: string;
  date: string;
  tradeId: string;
  pair: string;
  pnl: number;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  lesson: string;
  resolved: boolean;
}

const mistakeTypes = [
  { category: "Emotional", mistakes: ["Revenge Trading", "FOMO", "Fear of Missing Out", "Fear of Loss", "Overconfidence", "Impatience"] },
  { category: "Execution", mistakes: ["No Stop Loss", "Late Entry", "Early Exit", "Late Exit", "Wrong Sizing", "Ignored Signal"] },
  { category: "Planning", mistakes: ["Overtrading", "No Plan", "No Setup", "Trading News", "Wrong Session", "Chasing Price"] },
  { category: "Analysis", mistakes: ["Against Trend", "Ignored S/R", "Wrong Direction", "Poor Setup", "No Confirmation"] },
];

export default function MistakeLogger() {
  const { trades: realTrades = [] } = useCsvTrades();
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("all");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMistake, setNewMistake] = useState({ type: "", description: "", severity: "medium" as const, tradeId: "", pair: "" });

  useEffect(() => {
    if (realTrades.length > 0) {
      const errorTrades = realTrades.filter(t => t.outcome === "L" || t.followedPlan === false || t.planDeviationReason);
      const mapped: Mistake[] = errorTrades.slice(0, 15).map((t, idx) => ({
        id: t.id.toString(),
        type: t.planDeviationReason ? "Ignored Plan" : ((t.profit || 0) < -100 ? "Wrong Sizing" : "Late Entry"),
        date: t.date ? t.date.split("T")[0] : new Date().toISOString().split("T")[0],
        tradeId: t.ticket || `T${t.id}`,
        pair: t.pair || "XAUUSD",
        pnl: t.profit || 0,
        severity: (t.profit || 0) < -100 ? "critical" : ((t.profit || 0) < -50 ? "high" : "medium"),
        description: t.planDeviationReason || t.notes || "Suboptimal trade execution parameter",
        lesson: t.planDeviationReason ? "Stick strictly to trading plan rules" : "Wait for complete confluence before execution",
        resolved: idx % 2 === 0
      }));
      setMistakes(mapped);
    }
  }, [realTrades]);

  const toggleResolved = (id: string) => {
    setMistakes(mistakes.map(m => m.id === id ? { ...m, resolved: !m.resolved } : m));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "var(--bear)";
      case "high": return "#f97316";
      case "medium": return "var(--accent)";
      case "low": return "var(--bull)";
      default: return "var(--text-tertiary)";
    }
  };

  const getMistakeIcon = (type: string) => {
    if (type.includes("Revenge") || type.includes("FOMO") || type.includes("Fear")) return <Brain className="w-4 h-4" />;
    if (type.includes("Overtrading") || type.includes("No Stop")) return <Ban className="w-4 h-4" />;
    if (type.includes("Entry") || type.includes("Exit")) return <Zap className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const filteredMistakes = mistakes.filter(m => {
    if (filter === "unresolved") return !m.resolved;
    if (filter === "resolved") return m.resolved;
    return true;
  }).filter(m => !selectedType || m.type === selectedType);

  const stats = {
    total: mistakes.length,
    unresolved: mistakes.filter(m => !m.resolved).length,
    critical: mistakes.filter(m => m.severity === "critical" && !m.resolved).length,
    totalLoss: mistakes.reduce((sum, m) => sum + (m.pnl < 0 ? Math.abs(m.pnl) : 0), 0),
  };

  const typeCounts = mistakeTypes.flatMap(c => c.mistakes).reduce((acc, type) => {
    acc[type] = mistakes.filter(m => m.type === type).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" style={{ color: stats.critical > 0 ? "var(--bear)" : "var(--accent)" }} />
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Mistake Logger</h3>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
          style={{ background: "var(--accent)", color: "white" }}
        >
          <Plus className="w-3 h-3" /> Log
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
          <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{stats.total}</div>
          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Total</div>
        </div>
        <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
          <div className="text-lg font-bold" style={{ color: "var(--bear)" }}>{stats.unresolved}</div>
          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Open</div>
        </div>
        <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
          <div className="text-lg font-bold" style={{ color: "#f97316" }}>{stats.critical}</div>
          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Critical</div>
        </div>
        <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
          <div className="text-lg font-bold" style={{ color: "var(--bear)" }}>-${stats.totalLoss}</div>
          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Lost</div>
        </div>
      </div>

      <div className="flex gap-1 mb-3">
        {(["all", "unresolved", "resolved"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="flex-1 py-1 text-[10px] rounded-lg capitalize"
            style={{ 
              background: filter === f ? "var(--accent)" : "var(--bg-input)",
              color: filter === f ? "white" : "var(--text-tertiary)"
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {Object.entries(typeCounts)
          .filter(([_, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([type, count]) => (
            <button
              key={type}
              onClick={() => setSelectedType(selectedType === type ? null : type)}
              className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                selectedType === type ? "ring-1" : ""
              }`}
              style={{ 
                background: selectedType === type ? getSeverityColor(mistakes.find(m => m.type === type)?.severity || "low") : "var(--bg-input)",
                color: selectedType === type ? "white" : "var(--text-tertiary)"
              }}
            >
              {type} ({count})
            </button>
          ))}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredMistakes.map(mistake => (
          <div
            key={mistake.id}
            className={`p-3 rounded-lg transition-all ${mistake.resolved ? "opacity-60" : ""}`}
            style={{ background: "var(--bg-input)", borderLeft: `3px solid ${getSeverityColor(mistake.severity)}` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span style={{ color: getSeverityColor(mistake.severity) }}>{getMistakeIcon(mistake.type)}</span>
                <div>
                  <span className="text-xs font-semibold block" style={{ color: "var(--text-primary)" }}>{mistake.type}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    {mistake.pair} {mistake.tradeId} • {mistake.date}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold" style={{ color: mistake.pnl >= 0 ? "var(--bull)" : "var(--bear)" }}>
                  {mistake.pnl >= 0 ? "+" : ""}{mistake.pnl}
                </span>
                <button
                  onClick={() => toggleResolved(mistake.id)}
                  className="block text-[10px] mt-1"
                  style={{ color: mistake.resolved ? "var(--bull)" : "var(--text-tertiary)" }}
                >
                  {mistake.resolved ? "Resolved" : "Mark resolved"}
                </button>
              </div>
            </div>
            {!mistake.resolved && (
              <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="text-[10px] italic" style={{ color: "var(--text-tertiary)" }}>
                  Lesson: {mistake.lesson}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredMistakes.length === 0 && (
        <div className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>
          <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <span className="text-xs">No mistakes logged</span>
        </div>
      )}
    </Card>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
