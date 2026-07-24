"use client";

import { useMemo } from "react";
import { Shield, TrendingUp, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface TradeEntry {
  id: string | number;
  ticket?: string;
}

interface DisciplineScoreWidgetProps {
  trades?: TradeEntry[];
  compact?: boolean;
}

interface JournalData {
  followedPlan?: boolean;
  checklistPassed?: boolean;
  emotion?: string;
  planDeviationReason?: string;
}

function readJournalEntry(tradeId: string | number): JournalData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`journal_${tradeId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function DisciplineScoreWidget({ trades = [], compact }: DisciplineScoreWidgetProps) {
  const stats = useMemo(() => {
    const last30 = trades.slice(0, 30);
    let total = 0, planFollowed = 0, planDeviated = 0, deviationLosses = 0;
    const emotionCounts: Record<string, number> = {};

    for (const trade of last30) {
      const id = (trade as any).ticket || trade.id;
      const entry = readJournalEntry(id);
      if (!entry) continue;
      total++;

      if (entry.followedPlan === true) planFollowed++;
      if (entry.followedPlan === false) {
        planDeviated++;
        const profit = (trade as any).profit ?? 0;
        if (profit < 0) deviationLosses++;
      }

      if (entry.emotion) {
        emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
      }
    }

    const planRate = total > 0 ? Math.round((planFollowed / total) * 100) : null;
    const score = planRate !== null ? planRate : null;

    const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
    const negativeEmotions = ["Panicked", "Greedy", "Revenge", "Anxious"];
    const isEmotionRisk = topEmotion && negativeEmotions.includes(topEmotion[0]);

    return { score, total, planFollowed, planDeviated, deviationLosses, topEmotion, isEmotionRisk };
  }, [trades]);

  const scoreColor =
    stats.score === null ? "#64748b"
    : stats.score >= 80 ? "#22c55e"
    : stats.score >= 60 ? "#eab308"
    : "#ef4444";

  const scoreLabel =
    stats.score === null ? "No data yet"
    : stats.score >= 80 ? "Disciplined"
    : stats.score >= 60 ? "Improving"
    : "Needs attention";

  if (stats.total === 0) {
    return (
      <div className="rounded-2xl p-6 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: "var(--text-tertiary)" }} />
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Discipline Score</span>
        </div>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Open trades in your journal and log your emotional state &amp; plan compliance to see your discipline score.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 space-y-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: scoreColor }} />
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Discipline Score</span>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: `${scoreColor}18`, color: scoreColor, border: `1px solid ${scoreColor}40` }}>
          {scoreLabel}
        </span>
      </div>

      {/* Big Score */}
      <div className="flex items-end gap-4">
        <div className="text-7xl font-black font-mono leading-none" style={{ color: scoreColor }}>
          {stats.score !== null ? stats.score : "—"}
        </div>
        <div className="pb-2 space-y-1">
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>out of 100</div>
          <div className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>last {stats.total} journalled trades</div>
        </div>
      </div>

      {/* Score bar */}
      {stats.score !== null && (
        <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${stats.score}%`, background: scoreColor }}
          />
        </div>
      )}

      {/* Insight Cards */}
      <div className="space-y-3 pt-1">
        {stats.planFollowed > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)" }}>
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#22c55e" }} />
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              You followed your plan <strong style={{ color: "#22c55e" }}>{stats.planFollowed} of {stats.total} trades</strong> — keep that consistency.
            </p>
          </div>
        )}

        {stats.planDeviated > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#ef4444" }} />
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              You deviated from your plan <strong style={{ color: "#ef4444" }}>{stats.planDeviated} times</strong>
              {stats.deviationLosses > 0 && <> — <strong style={{ color: "#ef4444" }}>{stats.deviationLosses} of those were losses</strong></>}.
              {stats.deviationLosses >= 2 && " That's not a strategy problem."}
            </p>
          </div>
        )}

        {stats.isEmotionRisk && stats.topEmotion && (
          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#eab308" }} />
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Your most common emotional state is <strong style={{ color: "#eab308" }}>{stats.topEmotion[0]}</strong>{" "}
              ({stats.topEmotion[1]} trades). Watch your entries when you feel this way.
            </p>
          </div>
        )}

        {stats.score !== null && stats.score >= 80 && (
          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#6366f1" }} />
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Strong discipline. Most traders with your score see consistent improvement within 30 days.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
