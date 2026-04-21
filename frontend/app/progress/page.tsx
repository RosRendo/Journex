"use client";
import { Target, Trophy, Bell, AlertTriangle, TrendingUp, TrendingDown, Calendar, DollarSign, Settings, Shield } from "lucide-react";
import ProgressToProfitability from "@/components/progress/ProgressToProfitability";
import FundedChallengeTracker from "@/components/progress/FundedChallengeTracker";
import DrawdownAlerts from "@/components/progress/DrawdownAlerts";
import RuleViolationTracker from "@/components/progress/RuleViolationTracker";

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            Progress & Challenges
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your journey to profitability and funded account challenges
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgressToProfitability />
        <FundedChallengeTracker />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DrawdownAlerts />
        <RuleViolationTracker />
      </div>
    </div>
  );
}