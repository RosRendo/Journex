"use client";
import { Shield, Target, Brain, AlertTriangle, Zap, CheckCircle2 } from "lucide-react";
import PreTradeChecklist from "@/components/validation/PreTradeChecklist";
import TradingPlanEnforcer from "@/components/validation/TradingPlanEnforcer";
import SetupQualityScorer from "@/components/validation/SetupQualityScorer";
import EmotionalStateChecker from "@/components/validation/EmotionalStateChecker";
import RiskLimitGuard from "@/components/validation/RiskLimitGuard";

export default function ValidationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            Validation Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Pre-trade checks, plan enforcement, and risk management tools
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-xs font-medium text-green-400">All Checks Complete</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PreTradeChecklist />
        <TradingPlanEnforcer />
        <SetupQualityScorer />
        <EmotionalStateChecker />
        <RiskLimitGuard />
      </div>
    </div>
  );
}
