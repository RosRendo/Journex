"use client";
import { useState, useEffect } from "react";
import { Shield, CheckCircle2, XCircle, AlertTriangle, Edit2, Save, RotateCcw, TrendingUp, TrendingDown, Clock, Zap, Target, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TradingRule {
  id: string;
  category: string;
  label: string;
  currentValue: string | number | boolean;
  enabled: boolean;
  type: "boolean" | "number" | "select";
}

const defaultRules: TradingRule[] = [
  { id: "1", category: "Risk", label: "Max daily loss (% of account)", currentValue: 4, enabled: true, type: "number" },
  { id: "2", category: "Risk", label: "Max weekly loss (% of account)", currentValue: 10, enabled: true, type: "number" },
  { id: "3", category: "Risk", label: "Max risk per trade (%)", currentValue: 2, enabled: true, type: "number" },
  { id: "4", category: "Risk", label: "Min trades per day", currentValue: 0, enabled: false, type: "number" },
  { id: "5", category: "Risk", label: "Max trades per day", currentValue: 5, enabled: true, type: "number" },
  { id: "6", category: "Setup", label: "Trade only with trend", currentValue: true, enabled: true, type: "boolean" },
  { id: "7", category: "Setup", label: "Min RR ratio", currentValue: 2, enabled: true, type: "number" },
  { id: "8", category: "Setup", label: "Require S/R level", currentValue: true, enabled: true, type: "boolean" },
  { id: "9", category: "Execution", label: "Set SL before entry", currentValue: true, enabled: true, type: "boolean" },
  { id: "10", category: "Execution", label: "Set TP before entry", currentValue: true, enabled: true, type: "boolean" },
  { id: "11", category: "Timing", label: "Avoid news (min before/after)", currentValue: 30, enabled: true, type: "number" },
  { id: "12", category: "Timing", label: "Asian session only", currentValue: false, enabled: false, type: "boolean" },
  { id: "13", category: "Emotional", label: "No revenge trading", currentValue: true, enabled: true, type: "boolean" },
  { id: "14", category: "Emotional", label: "Take breaks after 2 losses", currentValue: true, enabled: true, type: "boolean" },
];

const mockTodayStats = {
  tradesToday: 2,
  dailyLoss: 1.8,
  tradesThisWeek: 8,
  weeklyLoss: 4.2,
};

export default function TradingPlanEnforcer() {
  const [rules, setRules] = useState<TradingRule[]>(defaultRules);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string | number | boolean>("");
  const [violations, setViolations] = useState<string[]>([]);

  const categories = ["Risk", "Setup", "Execution", "Timing", "Emotional"];

  const checkViolations = () => {
    const newViolations: string[] = [];
    
    rules.filter(r => r.enabled).forEach(rule => {
      if (rule.id === "1" && mockTodayStats.dailyLoss > (rule.currentValue as number)) {
        newViolations.push(`Daily loss: ${mockTodayStats.dailyLoss}% exceeds ${rule.currentValue}%`);
      }
      if (rule.id === "2" && mockTodayStats.weeklyLoss > (rule.currentValue as number)) {
        newViolations.push(`Weekly loss: ${mockTodayStats.weeklyLoss}% exceeds ${rule.currentValue}%`);
      }
      if (rule.id === "5" && mockTodayStats.tradesToday >= (rule.currentValue as number)) {
        newViolations.push(`Max trades reached: ${mockTodayStats.tradesToday}/${rule.currentValue}`);
      }
    });
    
    setViolations(newViolations);
  };

  useEffect(() => {
    checkViolations();
  }, [rules]);

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const startEdit = (rule: TradingRule) => {
    setEditingRule(rule.id);
    setEditValue(rule.currentValue);
  };

  const saveEdit = () => {
    if (editingRule) {
      setRules(rules.map(r => r.id === editingRule ? { ...r, currentValue: editValue } : r));
      setEditingRule(null);
    }
  };

  const enabledRules = rules.filter(r => r.enabled).length;
  const totalRules = rules.length;

  return (
    <Card className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: violations.length > 0 ? "var(--bear)" : "var(--bull)" }} />
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Trading Plan Enforcer</h3>
        </div>
        <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: "var(--bg-input)", color: "var(--text-tertiary)" }}>
          {enabledRules}/{totalRules} rules
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-2 rounded-lg" style={{ background: "var(--bg-input)" }}>
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>TODAY</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{mockTodayStats.tradesToday}</span>
            <span className="text-xs" style={{ color: mockTodayStats.dailyLoss > 2 ? "var(--bear)" : "var(--bull)" }}>
              -{mockTodayStats.dailyLoss}%
            </span>
          </div>
        </div>
        <div className="p-2 rounded-lg" style={{ background: "var(--bg-input)" }}>
          <div className="flex items-center gap-1 mb-1">
            <BarChart3 className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>WEEK</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{mockTodayStats.tradesThisWeek}</span>
            <span className="text-xs" style={{ color: mockTodayStats.weeklyLoss > 6 ? "var(--bear)" : "var(--bull)" }}>
              -{mockTodayStats.weeklyLoss}%
            </span>
          </div>
        </div>
      </div>

      {violations.length > 0 && (
        <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--bear)" }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" style={{ color: "var(--bear)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--bear)" }}>ACTIVE VIOLATIONS</span>
          </div>
          <ul className="space-y-1">
            {violations.map((v, i) => (
              <li key={i} className="text-xs flex items-center gap-1" style={{ color: "var(--bear)" }}>
                <XCircle className="w-3 h-3" /> {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      {violations.length === 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--bull)" }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: "var(--bull)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--bull)" }}>All rules followed - Plan compliant!</span>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {categories.map(category => {
          const categoryRules = rules.filter(r => r.category === category);
          if (categoryRules.length === 0) return null;
          
          return (
            <div key={category}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                {category}
              </div>
              <div className="space-y-1">
                {categoryRules.map(rule => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-2 rounded-lg"
                    style={{ background: rule.enabled ? "var(--bg-input)" : "var(--bg-primary)", opacity: rule.enabled ? 1 : 0.5 }}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                          rule.enabled ? "bg-green-500" : "bg-gray-600"
                        }`}
                      >
                        {rule.enabled && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </button>
                      <span className="text-xs" style={{ color: "var(--text-primary)" }}>{rule.label}</span>
                    </div>
                    
                    {editingRule === rule.id ? (
                      <div className="flex items-center gap-1">
                        {rule.type === "boolean" ? (
                          <button
                            onClick={() => setEditValue(!editValue)}
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: "var(--accent)", color: "white" }}
                          >
                            {editValue ? "ON" : "OFF"}
                          </button>
                        ) : (
                          <input
                            type="number"
                            value={editValue as number}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            className="w-16 text-xs px-2 py-1 rounded text-center"
                            style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                          />
                        )}
                        <button onClick={saveEdit} className="p-1 rounded hover:opacity-80" style={{ color: "var(--bull)" }}>
                          <Save className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono" style={{ color: "var(--accent)" }}>
                          {rule.type === "boolean" ? (rule.currentValue ? "ON" : "OFF") : rule.currentValue}
                        </span>
                        <button onClick={() => startEdit(rule)} className="p-1 rounded hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
