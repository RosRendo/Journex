"use client";
import { useState } from "react";
import { Trophy, Target, Clock, TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle2, Shield, Zap, Flag, Calendar, BarChart3, Activity, Ban } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Challenge {
  id: string;
  name: string;
  provider: string;
  accountSize: number;
  phase: 1 | 2 | 3;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  profitTarget: number;
  currentProfit: number;
  maxDrawdown: number;
  currentDrawdown: number;
  dailyLossLimit: number;
  currentDailyLoss: number;
  tradingDays: number;
  profitableDays: number;
  status: "active" | "passed" | "failed";
}

const mockChallenges: Challenge[] = [
  {
    id: "1",
    name: "Standard Challenge",
    provider: "FTMO",
    accountSize: 50000,
    phase: 2,
    startDate: "2026-04-01",
    endDate: "2026-04-30",
    daysRemaining: 9,
    profitTarget: 10,
    currentProfit: 6.2,
    maxDrawdown: 10,
    currentDrawdown: 3.8,
    dailyLossLimit: 5,
    currentDailyLoss: 1.2,
    tradingDays: 15,
    profitableDays: 10,
    status: "active",
  },
  {
    id: "2",
    name: "Evaluation",
    provider: "The5ers",
    accountSize: 25000,
    phase: 1,
    startDate: "2026-04-10",
    endDate: "2026-05-10",
    daysRemaining: 19,
    profitTarget: 8,
    currentProfit: 2.1,
    maxDrawdown: 5,
    currentDrawdown: 2.4,
    dailyLossLimit: 4,
    currentDailyLoss: 0.8,
    tradingDays: 8,
    profitableDays: 5,
    status: "active",
  },
];

export default function FundedChallengeTracker() {
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(mockChallenges[0]);

  const getProgressColor = (current: number, target: number, inverse = false) => {
    const progress = (current / target) * 100;
    if (inverse) {
      if (progress >= 100) return "var(--bear)";
      if (progress >= 80) return "#f97316";
      return "var(--bull)";
    }
    if (progress >= 100) return "var(--bull)";
    if (progress >= 50) return "var(--accent)";
    return "var(--text-tertiary)";
  };

  const renderProgressBar = (current: number, target: number, inverse = false) => {
    const progress = Math.min((current / target) * 100, 100);
    const color = getProgressColor(current, target, inverse);
    
    return (
      <div className="mt-1">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: color }}
          />
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Funded Challenge Tracker</h3>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
          <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
            {selectedChallenge?.daysRemaining} days left
          </span>
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        {mockChallenges.map(challenge => (
          <button
            key={challenge.id}
            onClick={() => setSelectedChallenge(challenge)}
            className={`flex-1 p-2 rounded-lg text-center transition-all border-2 ${selectedChallenge?.id === challenge.id ? "border-accent" : "border-transparent"}`}
            style={{ 
              background: selectedChallenge?.id === challenge.id ? "var(--accent)" : "var(--bg-input)"
            }}
          >
            <div className="text-xs font-bold" style={{ color: selectedChallenge?.id === challenge.id ? "white" : "var(--text-primary)" }}>
              {challenge.provider}
            </div>
            <div className="text-[10px]" style={{ color: selectedChallenge?.id === challenge.id ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)" }}>
              Phase {challenge.phase}
            </div>
          </button>
        ))}
      </div>

      {selectedChallenge && (
        <>
          <div className="p-3 rounded-lg mb-4" style={{ background: "var(--bg-input)" }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{selectedChallenge.name}</span>
                <span className="text-xs ml-2" style={{ color: "var(--text-tertiary)" }}>
                  ${selectedChallenge.accountSize.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {selectedChallenge.status === "active" && (
                  <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.2)", color: "var(--bull)" }}>
                    Active
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                <DollarSign className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--bull)" }} />
                <div className="text-xs font-bold" style={{ color: "var(--bull)" }}>
                  +{selectedChallenge.currentProfit}%
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  of {selectedChallenge.profitTarget}%
                </div>
              </div>
              <div className="text-center p-2 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                <TrendingDown className="w-4 h-4 mx-auto mb-1" style={{ color: selectedChallenge.currentDrawdown > selectedChallenge.maxDrawdown * 0.8 ? "var(--bear)" : "var(--accent)" }} />
                <div className="text-xs font-bold" style={{ color: selectedChallenge.currentDrawdown > selectedChallenge.maxDrawdown * 0.8 ? "var(--bear)" : "var(--text-primary)" }}>
                  -{selectedChallenge.currentDrawdown}%
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  max {selectedChallenge.maxDrawdown}%
                </div>
              </div>
              <div className="text-center p-2 rounded-lg" style={{ background: "var(--bg-primary)" }}>
                <AlertTriangle className="w-4 h-4 mx-auto mb-1" style={{ color: selectedChallenge.currentDailyLoss > selectedChallenge.dailyLossLimit * 0.8 ? "var(--bear)" : "var(--bull)" }} />
                <div className="text-xs font-bold" style={{ color: selectedChallenge.currentDailyLoss > selectedChallenge.dailyLossLimit * 0.8 ? "var(--bear)" : "var(--bull)" }}>
                  -{selectedChallenge.currentDailyLoss}%
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  daily {selectedChallenge.dailyLossLimit}%
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: "var(--text-tertiary)" }}>Profit Target</span>
                  <span style={{ color: getProgressColor(selectedChallenge.currentProfit, selectedChallenge.profitTarget) }}>
                    {selectedChallenge.currentProfit}% / {selectedChallenge.profitTarget}%
                  </span>
                </div>
                {renderProgressBar(selectedChallenge.currentProfit, selectedChallenge.profitTarget)}
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: "var(--text-tertiary)" }}>Max Drawdown</span>
                  <span style={{ color: getProgressColor(selectedChallenge.currentDrawdown, selectedChallenge.maxDrawdown, true) }}>
                    {selectedChallenge.currentDrawdown}% / {selectedChallenge.maxDrawdown}%
                  </span>
                </div>
                {renderProgressBar(selectedChallenge.currentDrawdown, selectedChallenge.maxDrawdown, true)}
              </div>

              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span style={{ color: "var(--text-tertiary)" }}>Daily Loss Limit</span>
                  <span style={{ color: getProgressColor(selectedChallenge.currentDailyLoss, selectedChallenge.dailyLossLimit, true) }}>
                    {selectedChallenge.currentDailyLoss}% / {selectedChallenge.dailyLossLimit}%
                  </span>
                </div>
                {renderProgressBar(selectedChallenge.currentDailyLoss, selectedChallenge.dailyLossLimit, true)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg" style={{ background: "var(--bg-input)" }}>
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
                <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Trading Days</span>
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{selectedChallenge.tradingDays}</span>
            </div>
            <div className="p-2 rounded-lg" style={{ background: "var(--bg-input)" }}>
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3" style={{ color: "var(--bull)" }} />
                <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Profitable</span>
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--bull)" }}>{selectedChallenge.profitableDays}</span>
            </div>
          </div>

          {(selectedChallenge.currentDrawdown > selectedChallenge.maxDrawdown * 0.8 || 
            selectedChallenge.currentDailyLoss > selectedChallenge.dailyLossLimit * 0.8) && (
            <div className="mt-3 p-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--bear)" }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--bear)" }} />
              <span className="text-xs" style={{ color: "var(--bear)" }}>
                Warning: Approaching drawdown limit!
              </span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}