"use client";
import { useState, useEffect } from "react";
import { Shield, CheckCircle2, XCircle, AlertTriangle, Edit2, Save, RotateCcw, TrendingUp, TrendingDown, Clock, Zap, Target, BarChart3 } from "lucide-react";

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
    <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 font-mono text-[10px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-450" />
          <h3 className="font-bold uppercase tracking-widest text-zinc-300">Trading Plan Enforcer</h3>
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/25 text-zinc-500 border border-zinc-850">
          {enabledRules}/{totalRules} rules
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-black/25 border border-zinc-850">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3.5 h-3.5 text-zinc-550" />
            <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest">TODAY</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-white">{mockTodayStats.tradesToday} <span className="text-[8px] text-zinc-600">trades</span></span>
            <span className="text-xs font-bold text-emerald-450">
              -{mockTodayStats.dailyLoss}%
            </span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-black/25 border border-zinc-850">
          <div className="flex items-center gap-1 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-zinc-555" />
            <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest">WEEK</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-white">{mockTodayStats.tradesThisWeek} <span className="text-[8px] text-zinc-600">trades</span></span>
            <span className="text-xs font-bold text-[#20e0b2]">
              -{mockTodayStats.weeklyLoss}%
            </span>
          </div>
        </div>
      </div>

      {violations.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-[#ff5c73]/10 border border-[#ff5c73]/20 text-[#ff5c73] font-mono">
          <div className="flex items-center gap-1.5 mb-2 font-bold text-[9px] uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>ACTIVE VIOLATIONS</span>
          </div>
          <ul className="space-y-1 text-[9px]">
            {violations.map((v, i) => (
              <li key={i} className="flex items-center gap-1 font-bold">
                <XCircle className="w-3.5 h-3.5 shrink-0" /> {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      {violations.length === 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2 bg-[#20e0b2]/10 border border-[#20e0b2]/20 text-[#20e0b2]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="font-bold uppercase tracking-wider text-[9px]">All rules followed - Plan compliant</span>
        </div>
      )}

      <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
        {categories.map(category => {
          const categoryRules = rules.filter(r => r.category === category);
          if (categoryRules.length === 0) return null;
          
          return (
            <div key={category}>
              <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                {category}
              </div>
              <div className="space-y-1">
                {categoryRules.map(rule => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-black/10 border-[rgba(255,255,255,0.04)]"
                    style={{ opacity: rule.enabled ? 1 : 0.4 }}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-all ${
                          rule.enabled ? "bg-[#20e0b2]" : "bg-zinc-800"
                        }`}
                      >
                        {rule.enabled && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-950 font-black" />}
                      </button>
                      <span className="text-[11px] text-zinc-350 font-sans">{rule.label}</span>
                    </div>
                    
                    {editingRule === rule.id ? (
                      <div className="flex items-center gap-1 font-mono">
                        {rule.type === "boolean" ? (
                          <button
                            onClick={() => setEditValue(!editValue)}
                            className="px-2 py-0.5 rounded text-[9px] font-bold border border-[#20e0b2]/20 text-[#20e0b2] bg-[#20e0b2]/5"
                          >
                            {editValue ? "ON" : "OFF"}
                          </button>
                        ) : (
                          <input
                            type="number"
                            value={editValue as number}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            className="w-12 text-[10px] px-1 py-0.5 rounded bg-[#101014] border border-[rgba(255,255,255,0.07)]/80 text-white font-mono text-center focus:outline-none focus:border-blue-500"
                          />
                        )}
                        <button onClick={saveEdit} className="p-1 rounded text-emerald-450 hover:text-emerald-350">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-450 font-bold">
                          {rule.type === "boolean" ? (rule.currentValue ? "ON" : "OFF") : rule.currentValue}
                        </span>
                        <button onClick={() => startEdit(rule)} className="p-1 rounded text-zinc-600 hover:text-zinc-300">
                          <Edit2 className="w-3.5 h-3.5" />
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
    </div>
  );
}

