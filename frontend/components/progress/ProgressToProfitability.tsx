"use client";
import { useState } from "react";
import { Target, Trophy, Flag, TrendingUp, Calendar, Star, Zap, Award, CheckCircle2, Clock, DollarSign, Activity, BarChart3, ChevronRight, X } from "lucide-react";
import { Card } from "@/components/ui/card";

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

const mockMilestones: Milestone[] = [
  { id: "1", day: 7, targetWinRate: 50, targetRR: 1.5, targetProfit: 5, currentWinRate: 55, currentRR: 1.2, currentProfit: 6.2, completed: true },
  { id: "2", day: 14, targetWinRate: 55, targetRR: 1.8, targetProfit: 10, currentWinRate: 52, currentRR: 1.5, currentProfit: 8.4, completed: false },
  { id: "3", day: 30, targetWinRate: 60, targetRR: 2.0, targetProfit: 20, currentWinRate: 58, currentRR: 1.8, currentProfit: 18.2, completed: false },
  { id: "4", day: 60, targetWinRate: 65, targetRR: 2.2, targetProfit: 40, currentWinRate: 0, currentRR: 0, currentProfit: 0, completed: false },
  { id: "5", day: 90, targetWinRate: 70, targetRR: 2.5, targetProfit: 60, currentWinRate: 0, currentRR: 0, currentProfit: 0, completed: false },
];

const achievements = [
  { id: "1", label: "First Profitable Week", icon: <Star className="w-4 h-4" />, earned: true },
  { id: "2", label: "10 Trades Completed", icon: <Activity className="w-4 h-4" />, earned: true },
  { id: "3", label: "50% Win Rate", icon: <Trophy className="w-4 h-4" />, earned: true },
  { id: "4", label: "2:1 Average RR", icon: <Flag className="w-4 h-4" />, earned: false },
  { id: "5", label: "No Losing Week", icon: <CheckCircle2 className="w-4 h-4" />, earned: false },
  { id: "6", label: "Month of Profit", icon: <Award className="w-4 h-4" />, earned: false },
];

export default function ProgressToProfitability() {
  const [currentDay, setCurrentDay] = useState(18);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const getProgressColor = (current: number, target: number) => {
    const progress = (current / target) * 100;
    if (progress >= 100) return "var(--bull)";
    if (progress >= 75) return "var(--accent)";
    if (progress >= 50) return "#f97316";
    return "var(--text-tertiary)";
  };

  const nextMilestone = mockMilestones.find(m => m.day >= currentDay);
  const daysToNext = nextMilestone ? nextMilestone.day - currentDay : 0;

  const calculateOverallProgress = () => {
    const completedMilestones = mockMilestones.filter(m => m.completed).length;
    return (completedMilestones / mockMilestones.length) * 100;
  };

  return (
    <Card className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Progress to Profitability</h3>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
          <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
            Day {currentDay}
          </span>
        </div>
      </div>

      <div className="p-4 rounded-xl mb-4 text-center" style={{ background: "var(--bg-input)" }}>
        <div className="text-3xl font-black mb-1" style={{ color: "var(--accent)" }}>
          Day {currentDay}
          <span className="text-lg font-normal" style={{ color: "var(--text-tertiary)" }}>/90</span>
        </div>
        <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {daysToNext > 0 ? `${daysToNext} days to next milestone` : "Goal completed!"}
        </div>
      </div>

      <div className="mb-4">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${calculateOverallProgress()}%`, 
              background: "linear-gradient(90deg, var(--accent), var(--bull))"
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
          <span>Start</span>
          <span>90 Days to Consistency</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
          Current Stats
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
            <Activity className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--bull)" }} />
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>58%</div>
            <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Win Rate</div>
          </div>
          <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
            <Flag className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--accent)" }} />
            <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>1.8</div>
            <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Avg RR</div>
          </div>
          <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
            <DollarSign className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--bull)" }} />
            <div className="text-sm font-bold" style={{ color: "var(--bull)" }}>+18%</div>
            <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Profit</div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
          Milestones
        </div>
        <div className="space-y-1">
          {mockMilestones.filter(m => m.day <= 30).map(milestone => (
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
                <div className="text-left">
                  <span className="text-xs font-semibold" style={{ color: milestone.completed ? "var(--bull)" : "var(--text-primary)" }}>
                    Day {milestone.day}
                  </span>
                  <span className="text-[10px] block" style={{ color: "var(--text-tertiary)" }}>
                    {milestone.targetWinRate}% WR • {milestone.targetRR}:1
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
          Achievements
        </div>
        <div className="grid grid-cols-3 gap-1">
          {achievements.map(achievement => (
            <div
              key={achievement.id}
              className={`p-2 rounded-lg text-center ${
                achievement.earned ? "" : "opacity-40"
              }`}
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