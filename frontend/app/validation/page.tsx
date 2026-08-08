"use client";
import { Shield, Target, Brain, AlertTriangle, Zap, CheckCircle2 } from "lucide-react";
import PreTradeChecklist from "@/components/validation/PreTradeChecklist";
import TradingPlanEnforcer from "@/components/validation/TradingPlanEnforcer";
import SetupQualityScorer from "@/components/validation/SetupQualityScorer";
import EmotionalStateChecker from "@/components/validation/EmotionalStateChecker";
import RiskLimitGuard from "@/components/validation/RiskLimitGuard";

export default function ValidationPage() {
  return (
    <div className="min-h-screen w-full bg-[#05050a] text-text-primary px-4 md:px-6 py-4 flex flex-col gap-4 animate-fade-in pb-16">
      
      {/* Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111118]/80 p-4 border border-zinc-800/40 rounded-2xl backdrop-blur-xl mt-4">
        <div>
          <h1 className="text-lg font-black tracking-tight text-white font-display flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Validation Hub
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-1 mt-0.5">
            <Target className="w-3.5 h-3.5 text-zinc-450" /> Pre-trade checks, plan enforcement, and risk management validation
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-mono text-[10px] font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400">All Checks Complete</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <PreTradeChecklist />
        <TradingPlanEnforcer />
        <SetupQualityScorer />
        <EmotionalStateChecker />
        <RiskLimitGuard />
      </div>
    </div>
  );
}
