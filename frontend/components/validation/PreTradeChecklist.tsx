"use client";
import { useState } from "react";
import { CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronUp, Target, TrendingUp, TrendingDown, Clock, Newspaper, BarChart3, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  description: string;
  checked: boolean;
}

const defaultChecklist: ChecklistItem[] = [
  { id: "1", category: "Market", label: "Identify market direction (trend)", description: "Check if trending up, down, or sideways", checked: false },
  { id: "2", category: "Market", label: "Key S/R levels identified", description: "Mark major support/resistance on chart", checked: false },
  { id: "3", category: "Market", label: "No major news within 30min", description: "Check economic calendar for high impact events", checked: false },
  { id: "4", category: "Setup", label: "Clear entry signal formed", description: "Price action/indicator confirmation", checked: false },
  { id: "5", category: "Setup", label: "Setup matches strategy", description: "Confirms your written trading plan criteria", checked: false },
  { id: "6", category: "Setup", label: "RR ratio at least 1:2", description: "Reward must be 2x the risk", checked: false },
  { id: "7", category: "Risk", label: "Risk under 2% account", description: "Position size calculated correctly", checked: false },
  { id: "8", category: "Risk", label: "Daily loss limit not reached", description: "Check if you've hit daily max loss", checked: false },
  { id: "9", category: "Risk", label: "Not trading revenge", description: "Emotional check - no impulse entries", checked: false },
  { id: "10", category: "Execution", label: "Stop loss set", description: "SL placed before entry", checked: false },
  { id: "11", category: "Execution", label: "Take profit defined", description: "TP or trail SL plan in place", checked: false },
  { id: "12", category: "Execution", label: "Lot size verified", description: "Double-check position sizing", checked: false },
];

export default function PreTradeChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>(defaultChecklist);
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Market");

  const categories = ["Market", "Setup", "Risk", "Execution"];
  
  const toggleItem = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const getCategoryProgress = (category: string) => {
    const categoryItems = items.filter(i => i.category === category);
    const checked = categoryItems.filter(i => i.checked).length;
    return { checked, total: categoryItems.length };
  };

  const totalChecked = items.filter(i => i.checked).length;
  const overallProgress = Math.round((totalChecked / items.length) * 100);
  const canTrade = totalChecked === items.length;

  return (
    <Card className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" style={{ color: canTrade ? "var(--bull)" : "var(--text-tertiary)" }} />
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Pre-Trade Checklist</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: canTrade ? "var(--bull)" : "var(--text-tertiary)" }}>
            {totalChecked}/{items.length}
          </span>
          {canTrade && <Zap className="w-4 h-4 text-amber-400" />}
        </div>
      </div>

      <div className="mb-4">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-input)" }}>
          <div 
            className="h-full transition-all duration-500 rounded-full"
            style={{ 
              width: `${overallProgress}%`, 
              background: canTrade ? "var(--bull)" : "var(--accent)" 
            }} 
          />
        </div>
      </div>

      {canTrade && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--bull)" }}>
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-xs font-medium" style={{ color: "var(--bull)" }}>Ready to trade - All checks passed!</span>
        </div>
      )}

      <div className="space-y-2">
        {categories.map(category => {
          const { checked, total } = getCategoryProgress(category);
          const isExpanded = expandedCategory === category;
          
          return (
            <div key={category}>
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full flex items-center justify-between p-2 rounded-lg transition-colors hover:opacity-80"
                style={{ background: "var(--bg-input)" }}
              >
                <div className="flex items-center gap-2">
                  {category === "Market" && <BarChart3 className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />}
                  {category === "Setup" && <Target className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />}
                  {category === "Risk" && <AlertTriangle className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />}
                  {category === "Execution" && <Zap className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />}
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono" style={{ color: checked === total ? "var(--bull)" : "var(--text-tertiary)" }}>
                    {checked}/{total}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />}
                </div>
              </button>
              
              {isExpanded && (
                <div className="mt-2 space-y-1.5 pl-2">
                  {items.filter(i => i.category === category).map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className="w-full flex items-start gap-2 p-2 rounded-lg transition-all hover:opacity-80"
                      style={{ background: item.checked ? "rgba(34, 197, 94, 0.1)" : "var(--bg-primary)" }}
                    >
                      {item.checked ? (
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--bull)" }} />
                      ) : (
                        <Circle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />
                      )}
                      <div className="text-left">
                        <span className="text-xs block" style={{ color: item.checked ? "var(--bull)" : "var(--text-primary)" }}>
                          {item.label}
                        </span>
                        <span className="text-[10px] block" style={{ color: "var(--text-tertiary)" }}>
                          {item.description}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
