"use client";
import { useState } from "react";
import { CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronUp, Target, TrendingUp, TrendingDown, Clock, Newspaper, BarChart3, Zap } from "lucide-react";

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
    <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 font-mono text-[10px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-zinc-550" />
          <h3 className="font-bold uppercase tracking-widest text-zinc-300">Pre-Trade Checklist</h3>
        </div>
        <div className="flex items-center gap-1.5 font-bold">
          <span className={canTrade ? "text-emerald-450" : "text-zinc-550"}>
            {totalChecked}/{items.length}
          </span>
          {canTrade && <Zap className="w-3.5 h-3.5 text-[#20e0b2]" />}
        </div>
      </div>

      <div className="mb-4">
        <div className="h-1.5 rounded-full overflow-hidden bg-black/35 border border-zinc-850">
          <div 
            className="h-full transition-all duration-350 rounded-full bg-[#20e0b2]"
            style={{ width: `${overallProgress}%` }} 
          />
        </div>
      </div>

      {canTrade && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2 bg-[#20e0b2]/10 border border-[#20e0b2]/20 text-[#20e0b2]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="font-bold uppercase tracking-wider text-[9px]">Ready to deploy execution orders</span>
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
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-black/25 hover:bg-black/45 transition-all text-left outline-none"
              >
                <div className="flex items-center gap-2 text-zinc-450 font-bold uppercase tracking-wider">
                  {category === "Market" && <BarChart3 className="w-3.5 h-3.5" />}
                  {category === "Setup" && <Target className="w-3.5 h-3.5" />}
                  {category === "Risk" && <AlertTriangle className="w-3.5 h-3.5" />}
                  {category === "Execution" && <Zap className="w-3.5 h-3.5" />}
                  <span className="text-zinc-300">{category}</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-[9px] text-zinc-500">
                  <span className={checked === total ? "text-[#20e0b2]" : "text-zinc-500"}>
                    {checked}/{total}
                  </span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>
              
              {isExpanded && (
                <div className="mt-2 space-y-1.5 pl-2">
                  {items.filter(i => i.category === category).map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className="w-full flex items-start gap-2 p-2.5 rounded-lg bg-black/10 border border-[rgba(255,255,255,0.04)] hover:bg-black/20 transition-all text-left font-sans"
                    >
                      {item.checked ? (
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#20e0b2]" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-700" />
                      )}
                      <div>
                        <span className={`text-[11px] block ${item.checked ? "text-[#20e0b2] font-bold" : "text-zinc-300"}`}>
                          {item.label}
                        </span>
                        <span className="text-[9px] text-zinc-550 block mt-0.5 font-mono">
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
    </div>
  );
}


