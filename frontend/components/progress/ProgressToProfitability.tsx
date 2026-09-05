"use client";
import { useState } from "react";
import { Target, Trophy, Flag, TrendingUp, Calendar, Star, Zap, Award, CheckCircle2, Clock, DollarSign, Activity, BarChart3, ChevronRight, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useCsvTrades } from "@/hooks/useCsvTrades";

interface Milestone {
  id: string;
  day: number;
  targetWinRate: number;
  targetRR: number;
  targetProfit: number;
  currentWinRate: number;
  currentRR: number;
  currentProfit: number;
  completed: boolean;
}

export default function ProgressToProfitability() {
  const { trades = [], analytics } = useCsvTrades();

  const winRate = analytics?.winRate || 0;
  const avgRR = analytics?.profitFactor ? +analytics.profitFactor.toFixed(1) : 1.5;
  const totalProfit = analytics?.totalProfit || 0;
  const profitPct = +(totalProfit / 10).toFixed(1);

  const realMilestones: Milestone[] = [
    { id: "1", day: 7, targetWinRate: 50, targetRR: 1.5, targetProfit: 5, currentWinRate: winRate, currentRR: avgRR, currentProfit: profitPct, completed: winRate >= 50 && trades.length >= 5 },
    { id: "2", day: 14, targetWinRate: 55, targetRR: 1.8, targetProfit: 10, currentWinRate: winRate, currentRR: avgRR, currentProfit: profitPct, completed: winRate >= 55 && trades.length >= 10 },
    { id: "3", day: 30, targetWinRate: 60, targetRR: 2.0, targetProfit: 20, currentWinRate: winRate, currentRR: avgRR, currentProfit: profitPct, completed: winRate >= 60 && trades.length >= 20 },
    { id: "4", day: 60, targetWinRate: 65, targetRR: 2.2, targetProfit: 40, currentWinRate: winRate, currentRR: avgRR, currentProfit: profitPct, completed: winRate >= 65 && trades.length >= 40 },
    { id: "5", day: 90, targetWinRate: 70, targetRR: 2.5, targetProfit: 60, currentWinRate: winRate, currentRR: avgRR, currentProfit: profitPct, completed: winRate >= 70 && trades.length >= 60 },
  ];

  const dynamicAchievements = [
    { id: "1", label: "First Profitable Trade", icon: <Star className="w-4 h-4" />, earned: (analytics?.winningTrades || 0) > 0 },
    { id: "2", label: "10 Trades Completed", icon: <Activity className="w-4 h-4" />, earned: trades.length >= 10 },
    { id: "3", label: "50% Win Rate", icon: <Trophy className="w-4 h-4" />, earned: winRate >= 50 && trades.length >= 5 },
    { id: "4", label: "2:1 Profit Factor", icon: <Flag className="w-4 h-4" />, earned: avgRR >= 2.0 },
    { id: "5", label: "Net Profitable Overall", icon: <CheckCircle2 className="w-4 h-4" />, earned: totalProfit > 0 },
    { id: "6", label: "Master of Discipline", icon: <Award className="w-4 h-4" />, earned: trades.filter(t => t.followedPlan !== false).length >= 10 },
  ];

  const currentDay = Math.min(90, Math.max(1, trades.length > 0 ? trades.length : 7));
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const nextMilestone = realMilestones.find(m => m.day >= currentDay);
  const daysToNext = nextMilestone ? nextMilestone.day - currentDay : 0;

  const calculateOverallProgress = () => {
    const completedMilestones = realMilestones.filter(m => m.completed).length;
    return (completedMilestones / realMilestones.length) * 100;
  };

  return (
    <Card className="p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ background: "rgba(34,197,94,0.1)" }}>
            <TrendingUp className="w-5 h-5" style={{ color: "var(--bull)" }} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              Progress to Profitability
            </h3>
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Day {currentDay} of 90
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold font-mono" style={{ color: "var(--bull)" }}>
            {calculateOverallProgress().toFixed(0)}%
          </div>
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            Completed
          </span>
        </div>
      </div>

      <div className="p-3 rounded-lg mb-4" style={{ background: "var(--bg-input)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
            Current Progress
          </span>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {daysToNext > 0 ? `${daysToNext} days to next milestone` : "Milestone in progress"}
          </span>
        </div>
        <div className="w-full h-2 rounded-full mb-3" style={{ background: "var(--border)" }}>
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${calculateOverallProgress()}%`,
              background: "var(--bull)"
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
            <Activity className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--bull)" }} />
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{winRate.toFixed(0)}%</div>
            <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Win Rate</div>
          </div>
          <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
            <Flag className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--accent)" }} />
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{avgRR}</div>
            <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Profit Factor</div>
          </div>
          <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
            <DollarSign className="w-4 h-4 mx-auto mb-1" style={{ color: totalProfit >= 0 ? "var(--bull)" : "var(--bear)" }} />
            <div className="text-sm font-bold" style={{ color: totalProfit >= 0 ? "var(--bull)" : "var(--bear)" }}>
              {totalProfit >= 0 ? `+$${totalProfit.toFixed(1)}` : `-$${Math.abs(totalProfit).toFixed(1)}`}
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Net P&L</div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
          Milestones
        </div>
        <div className="space-y-1">
          {realMilestones.filter(m => m.day <= 30).map(milestone => (
            <button
              key={milestone.id}
              onClick={() => setSelectedMilestone(selectedMilestone?.id === milestone.id ? null : milestone)}
              className={`w-full p-2 rounded-lg flex items-center justify-between transition-all ${
                milestone.completed ? "opacity-80" : ""
              }`}
              style={{ 
                background: milestone.completed ? "rgba(34,197,94,0.1)" : selectedMilestone?.id === milestone.id ? "var(--accent)" : "var(--bg-input)",
                border: milestone.completed ? "1px solid var(--bull)" : "1px solid transparent"
              }}
            >
              <div className="flex items-center gap-2">
                {milestone.completed ? (
                  <CheckCircle2 className="w-4 h-4" style={{ color: "var(--bull)" }} />
                ) : (
                  <Flag className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                )}
                <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                  Day {milestone.day}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                  {milestone.targetWinRate}% WR / {milestone.targetRR} RR
                </span>
                <ChevronRight className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
          Achievements
        </div>
        <div className="grid grid-cols-2 gap-2">
          {dynamicAchievements.map(achievement => (
            <div 
              key={achievement.id}
              className="p-2 rounded-lg text-center border border-[rgba(255,255,255,0.06)]"
              style={{ background: achievement.earned ? "rgba(34,197,94,0.1)" : "var(--bg-input)" }}
            >
              <span style={{ color: achievement.earned ? "var(--bull)" : "var(--text-tertiary)" }}>
                {achievement.icon}
              </span>
              <div className="text-[9px] mt-1" style={{ color: achievement.earned ? "var(--bull)" : "var(--text-tertiary)" }}>
                {achievement.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
