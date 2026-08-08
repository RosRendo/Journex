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
    stats.score === null ? "#71717a"
    : stats.score >= 80 ? "#10b981"
    : stats.score >= 60 ? "#f59e0b"
    : "#ef4444";

  const scoreLabel =
    stats.score === null ? "No data yet"
    : stats.score >= 80 ? "Disciplined"
    : stats.score >= 60 ? "Improving"
    : "Needs attention";

  if (stats.total === 0) {
    return (
      <div className="bg-[#111118] border border-zinc-800/40 rounded-xl p-5 shadow-xl font-mono text-[10px]">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-zinc-550" />
          <span className="font-bold uppercase tracking-widest text-zinc-300">Discipline Score</span>
        </div>
        <p className="text-zinc-500 leading-relaxed font-sans text-xs">
          Open trades in your journal and log your emotional state &amp; plan compliance to see your discipline score.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#111118] border border-zinc-800/40 rounded-xl p-5 shadow-xl font-mono text-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: scoreColor }} />
          <span className="font-bold uppercase tracking-widest text-zinc-350">Discipline Score</span>
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: `${scoreColor}15`, color: scoreColor, border: `1px solid ${scoreColor}25` }}>
          {scoreLabel}
        </span>
      </div>

      {/* Big Score */}
      <div className="flex items-end gap-3 mb-4">
        <div className="text-5xl font-black font-mono leading-none" style={{ color: scoreColor }}>
          {stats.score !== null ? stats.score : "—"}
        </div>
        <div className="pb-1 space-y-0.5">
          <div className="text-[9px] text-zinc-555 font-bold uppercase tracking-wide">out of 100</div>
          <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">last {stats.total} journalled trades</div>
        </div>
      </div>

      {/* Score bar */}
      {stats.score !== null && (
        <div className="h-1.5 w-full bg-black/25 border border-zinc-850 rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${stats.score}%`, background: scoreColor }}
          />
        </div>
      )}

      {/* Insight Cards */}
      <div className="space-y-2.5 pt-1 text-[11px] font-sans">
        {stats.planFollowed > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/[0.02] border border-emerald-500/10">
            <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
            <p className="text-zinc-350">
              You followed your plan <strong className="text-emerald-400 font-bold">{stats.planFollowed} of {stats.total} trades</strong> — keep that consistency.
            </p>
          </div>
        )}

        {stats.planDeviated > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/[0.02] border border-red-500/10">
            <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-400" />
            <p className="text-zinc-350">
              You deviated from your plan <strong className="text-red-400 font-bold">{stats.planDeviated} times</strong>
              {stats.deviationLosses > 0 && <> — <strong className="text-red-400 font-bold">{stats.deviationLosses} of those were losses</strong></>}.
            </p>
          </div>
        )}

        {stats.isEmotionRisk && stats.topEmotion && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/[0.02] border border-amber-500/10">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
            <p className="text-zinc-355">
              Your most common emotional state is <strong className="text-amber-400 font-bold">{stats.topEmotion[0]}</strong>{" "}
              ({stats.topEmotion[1]} trades). Watch your entries when you feel this way.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
