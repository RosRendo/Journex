"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  Target,
  TrendingUp,
  TrendingDown,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Save,
  X,
  ArrowLeft,
  ArrowRight,
  Clock,
  Activity,
  DollarSign,
  Flame,
  Circle,
  MoveRight,
  Shield,
  BarChart3,
  Award,
  Layers,
  Sparkles,
  Trophy,
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useCsvTrades } from "@/hooks/useCsvTrades";
import { toast } from "sonner";

// Specialized Sub-Components
import TradeQualityRater from "@/components/review/TradeQualityRater";
import MistakeLogger from "@/components/review/MistakeLogger";
import DeviationReporter from "@/components/review/DeviationReporter";
import ProgressToProfitability from "@/components/progress/ProgressToProfitability";
import FundedChallengeTracker from "@/components/progress/FundedChallengeTracker";
import DrawdownAlerts from "@/components/progress/DrawdownAlerts";
import RuleViolationTracker from "@/components/progress/RuleViolationTracker";

// 5-Point Pre-Trade Gatekeeper Questions
const PRE_TRADE_QUESTIONS = [
  "Am I trading my documented edge/setup?",
  "Is my risk strictly 1% or less of my capital?",
  "Am I emotionally neutral and not revenge trading?",
  "Are there any major upcoming high-impact news events (CPI, NFP)?",
  "Is my Take Profit placed at a logical liquidity pool?",
];

// 10-Point Daily Self-Assessment Checklist
const DAILY_REVIEW_QUESTIONS = [
  { id: "1", category: "Preparation", question: "Did you review the session bias and liquidity zones before trading?" },
  { id: "2", category: "Preparation", question: "Were key Asian & Session High/Low levels marked on chart?" },
  { id: "3", category: "Preparation", question: "Did you check the economic news release calendar for embargoes?" },
  { id: "4", category: "Execution", question: "Did you wait for confirmed liquidity sweep + MSS shift?" },
  { id: "5", category: "Execution", question: "Was a hard Stop Loss placed immediately upon entry?" },
  { id: "6", category: "Execution", question: "Did you follow strict 1.0% position sizing without greed?" },
  { id: "7", category: "Emotional", question: "Did you avoid taking revenge trades after a losing trade?" },
  { id: "8", category: "Emotional", question: "Were you emotionally neutral, calm, and detached from PnL?" },
  { id: "9", category: "Review", question: "Did you journal all executions with screenshots/notes?" },
  { id: "10", category: "Review", question: "Did you objectively review mistakes and record lessons learned?" },
];

function ReviewContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get("tab") as "daily" | "mistakes" | "challenges") || "daily";
  const [activeTab, setActiveTab] = useState<"daily" | "mistakes" | "challenges">(initialTab);
  const [showChecklist, setShowChecklist] = useState(false);

  const { trades, analytics } = useCsvTrades();

  // Daily Scorecard State
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [mistakeCounts, setMistakeCounts] = useState<Record<string, number>>({
    Overtrading: 0,
    "Early Exit": 0,
    "FOMO Entry": 0,
    "Revenge Trade": 0,
  });
  const [notes, setNotes] = useState("Disciplined session. Followed liquidity sweep setup. Waited patiently for M5 MSS.");
  const [tomorrowGoal, setTomorrowGoal] = useState("Maintain strict 1% risk and wait for London OTE expansion only.");

  // Pre-Trade Modal Checkbox State
  const [gatekeeperChecked, setGatekeeperChecked] = useState<Record<number, boolean>>({});
  const allGatekeeperPassed = PRE_TRADE_QUESTIONS.every((_, i) => gatekeeperChecked[i]);

  const toggleAnswer = (id: string) => {
    setAnswers((prev) => {
      const current = prev[id];
      if (current === true) return { ...prev, [id]: false };
      if (current === false) return { ...prev, [id]: null };
      return { ...prev, [id]: true };
    });
  };

  const updateMistakeCount = (key: string, delta: number) => {
    setMistakeCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta),
    }));
  };

  // 30-Day Rule Compliance & Streak Calculation
  const { streakData, currentStreak } = useMemo(() => {
    const daysMap: Record<string, boolean> = {};
    (trades || []).forEach((t) => {
      const d = t.date ? t.date.split(" ")[0] : new Date().toISOString().split("T")[0];
      if (daysMap[d] === undefined) {
        daysMap[d] = t.followedPlan !== false;
      } else if (t.followedPlan === false) {
        daysMap[d] = false;
      }
    });

    const now = new Date();
    const streakList: { date: string; compliant: boolean }[] = [];
    let consecutive = 0;
    let streakActive = true;

    for (let i = 29; i >= 0; i--) {
      const target = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = target.toISOString().split("T")[0];
      const hasRecord = daysMap[dateStr] !== undefined;
      const compliant = hasRecord ? daysMap[dateStr] : true;
      streakList.push({ date: dateStr, compliant });
      if (streakActive && compliant) consecutive++;
      else streakActive = false;
    }

    return {
      streakData: streakList,
      currentStreak: Math.max(consecutive, trades && trades.length > 0 ? 1 : 14),
    };
  }, [trades]);

  // Emotion vs Net PnL Data
  const emotionPerformanceData = useMemo(() => {
    if (!trades || trades.length === 0) {
      return [
        { day: "Mon", pnl: 450, emotion: 8, label: "Focused" },
        { day: "Tue", pnl: -120, emotion: 4, label: "Anxious" },
        { day: "Wed", pnl: 890, emotion: 9, label: "Flow State" },
        { day: "Thu", pnl: 210, emotion: 7, label: "Calm" },
        { day: "Fri", pnl: -450, emotion: 3, label: "Tilted" },
        { day: "Mon", pnl: 340, emotion: 8, label: "Focused" },
        { day: "Tue", pnl: 650, emotion: 8, label: "Focused" },
      ];
    }

    const recent = [...trades].slice(-7);
    return recent.map((t, idx) => {
      const pnl = Math.round(t.profit);
      const emotionTag = t.emotion || (pnl > 0 ? "Flow State" : t.followedPlan === false ? "Tilted" : "Calm");
      let emoScore = 7;
      if (emotionTag === "Flow State" || emotionTag === "Confident") emoScore = 9;
      else if (emotionTag === "Focused") emoScore = 8;
      else if (emotionTag === "Calm") emoScore = 7;
      else if (emotionTag === "Anxious" || emotionTag === "FOMO") emoScore = 4;
      else if (emotionTag === "Tilted" || emotionTag === "Revenge") emoScore = 3;

      const dayLabel = t.date ? new Date(t.date).toLocaleDateString(undefined, { weekday: "short" }) : `T-${idx + 1}`;
      return {
        day: dayLabel,
        pnl,
        emotion: emoScore,
        label: emotionTag,
      };
    });
  }, [trades]);

  const categories = [...new Set(DAILY_REVIEW_QUESTIONS.map((q) => q.category))];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 px-4 sm:px-6">
      {/* ── PRE-TRADE GATEKEEPER MODAL ────────────────────────────────────── */}
      {showChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.1)] p-6 bg-[#101014] shadow-2xl font-mono">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[rgba(255,255,255,0.07)]">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#20e0b2]/10 text-[#20e0b2] border border-[#20e0b2]/30">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black uppercase tracking-wider text-[#f4f4f5]">
                  Pre-Trade Gatekeeper
                </h2>
                <p className="text-[11px] text-[#71717a]">Psychological &amp; edge verification prior to entry</p>
              </div>
            </div>

            <div className="space-y-2.5 mb-6">
              {PRE_TRADE_QUESTIONS.map((q, i) => {
                const isChecked = gatekeeperChecked[i];
                return (
                  <label
                    key={i}
                    onClick={() => setGatekeeperChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? "border-[#20e0b2]/50 bg-[#20e0b2]/10 text-white"
                        : "border-[rgba(255,255,255,0.06)] bg-[#09090b] text-[#a1a1aa] hover:border-[rgba(255,255,255,0.15)]"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckCircle2 className="w-4 h-4 text-[#20e0b2]" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#52525b]" />
                      )}
                    </span>
                    <span className="text-xs font-bold leading-relaxed">{q}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowChecklist(false)}
                className="flex-1 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#141419] text-xs font-bold text-[#a1a1aa] hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!allGatekeeperPassed}
                onClick={() => {
                  toast.success("Gatekeeper passed! You are emotionally clear to trade.");
                  setShowChecklist(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#20e0b2] hover:bg-[#1bc9a0] text-[#09090b] shadow-[0_0_15px_rgba(32,224,178,0.25)]"
              >
                <span>Clear to Trade</span>
                <MoveRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER & PRIMARY ACTIONS ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#20e0b2] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#20e0b2] font-mono">
              Trader Reflection &amp; Growth Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#f4f4f5]">
            Review &amp; Consistency Center
          </h1>
          <p className="text-xs text-[#71717a] font-mono mt-1">
            Unified debrief ritual: Daily Scorecards, Mistake Forensics, and Prop Challenge Milestones.
          </p>
        </div>

        {/* Action Button: Pre-Trade Gatekeeper */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChecklist(true)}
            className="px-4 py-2 rounded-xl text-xs font-black font-mono uppercase tracking-wider bg-[#20e0b2] hover:bg-[#1bc9a0] text-[#09090b] shadow-[0_0_20px_rgba(32,224,178,0.2)] transition-all flex items-center gap-2"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Pre-Trade Gatekeeper</span>
          </button>
        </div>
      </div>

      {/* ── UNIFIED 3-TAB NAVIGATION BAR ──────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-[#0e0e12] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-x-auto">
        {[
          { id: "daily", label: "Daily Session Debrief", icon: Calendar, badge: "Daily Ritual" },
          { id: "mistakes", label: "Mistake & Tilt Forensics", icon: AlertTriangle, badge: "Psychology" },
          { id: "challenges", label: "Milestones & Challenges", icon: Trophy, badge: "Prop Firm" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[180px] py-2.5 px-4 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                isActive
                  ? "bg-[#20e0b2] text-[#09090b] font-black shadow-lg shadow-[#20e0b2]/10"
                  : "text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#141419]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`text-[8px] px-1.5 py-0.2 rounded border font-mono ${
                  isActive
                    ? "bg-[#09090b]/20 border-[#09090b]/30 text-[#09090b]"
                    : "bg-[#18181f] border-[rgba(255,255,255,0.06)] text-[#a1a1aa]"
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: DAILY SESSION DEBRIEF
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "daily" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Date & Target Scorecard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            {[
              { label: "Win Rate", value: `${(analytics?.winRate || 68).toFixed(0)}%`, target: "55%", pass: true },
              { label: "Profit Factor", value: `${(analytics?.profitFactor || 2.42).toFixed(2)}`, target: "2.00", pass: true },
              { label: "Total Trades Today", value: `${trades?.length || 4}`, target: "Max 5", pass: true },
              { label: "Net PnL", value: `+$${(analytics?.totalProfit || 34.2).toFixed(2)}`, target: "+2.0%", pass: true },
            ].map((stat) => (
              <div key={stat.label} className="p-3.5 rounded-xl bg-[#0e0e12] border border-[rgba(255,255,255,0.07)]">
                <span className="text-[9px] uppercase tracking-wider text-[#71717a] block">{stat.label}</span>
                <div className="text-xl font-black text-white mt-1 flex items-baseline gap-1.5">
                  <span>{stat.value}</span>
                  <span className="text-[9px] font-normal text-[#20e0b2]">✓ Target {stat.target}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Main 2-Column Debrief Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: 10-Point Self-Assessment */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-xl bg-[#0e0e12] border border-[rgba(255,255,255,0.07)] space-y-4">
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-3">
                  <span className="text-xs font-black uppercase font-mono tracking-wider text-[#f4f4f5] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#20e0b2]" /> 10-Point Session Checklist
                  </span>
                  <span className="text-[9px] font-mono text-[#71717a]">
                    Click to toggle Yes (✓) / No (✗)
                  </span>
                </div>

                {categories.map((cat) => (
                  <div key={cat} className="space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#71717a] font-mono block">
                      {cat} Pillar
                    </span>
                    <div className="space-y-1.5 font-mono">
                      {DAILY_REVIEW_QUESTIONS.filter((q) => q.category === cat).map((q) => {
                        const state = answers[q.id];
                        return (
                          <button
                            key={q.id}
                            onClick={() => toggleAnswer(q.id)}
                            className={`w-full p-2.5 rounded-lg text-left flex items-center justify-between transition-all border text-xs ${
                              state === true
                                ? "bg-[#20e0b2]/10 border-[#20e0b2]/30 text-white"
                                : state === false
                                ? "bg-[#ff5c73]/10 border-[#ff5c73]/30 text-[#ff5c73]"
                                : "bg-[#141419] border-[rgba(255,255,255,0.04)] text-[#a1a1aa] hover:border-[rgba(255,255,255,0.12)]"
                            }`}
                          >
                            <span className="leading-snug">{q.question}</span>
                            <span className="shrink-0 font-bold ml-2">
                              {state === true && <span className="text-[#20e0b2]">YES ✓</span>}
                              {state === false && <span className="text-[#ff5c73]">NO ✗</span>}
                              {state === null || state === undefined ? <span className="text-[#52525b]">—</span> : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 5 Cols: Mistakes Counter + Reflection Notes */}
            <div className="lg:col-span-5 space-y-4 font-mono">
              {/* Mistake Counter */}
              <div className="p-4 rounded-xl bg-[#0e0e12] border border-[rgba(255,255,255,0.07)] space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-[#f4f4f5] block">
                  Today's Execution Slip-Ups
                </span>
                <div className="space-y-2 text-xs">
                  {Object.entries(mistakeCounts).map(([k, count]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#141419] border border-[rgba(255,255,255,0.04)]"
                    >
                      <span className={count > 0 ? "text-[#ff5c73] font-bold" : "text-[#a1a1aa]"}>{k}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateMistakeCount(k, -1)}
                          className="w-6 h-6 rounded bg-[#1e1e26] hover:bg-[#2a2a36] text-white flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-black text-white">{count}</span>
                        <button
                          onClick={() => updateMistakeCount(k, 1)}
                          className="w-6 h-6 rounded bg-[#1e1e26] hover:bg-[#2a2a36] text-white flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reflection Notes & Tomorrow's Goal */}
              <div className="p-4 rounded-xl bg-[#0e0e12] border border-[rgba(255,255,255,0.07)] space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-[#f4f4f5] block">
                  Session Reflection &amp; Tomorrow Rule
                </span>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-[#71717a] block mb-1">
                    Notes for Journal
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#141419] border border-[rgba(255,255,255,0.07)] rounded-lg p-2.5 text-xs text-[#f4f4f5] focus:outline-none focus:border-[#20e0b2]/40 resize-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-[#20e0b2] block mb-1">
                    Tomorrow's Primary Rule
                  </label>
                  <input
                    type="text"
                    value={tomorrowGoal}
                    onChange={(e) => setTomorrowGoal(e.target.value)}
                    className="w-full bg-[#141419] border border-[rgba(255,255,255,0.07)] rounded-lg py-2 px-2.5 text-xs text-[#f4f4f5] focus:outline-none focus:border-[#20e0b2]/40"
                  />
                </div>
                <button
                  onClick={() => toast.success("Daily debrief saved successfully to journal!")}
                  className="w-full py-2.5 rounded-lg bg-[#20e0b2] hover:bg-[#1bc9a0] text-[#09090b] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Session Debrief</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: MISTAKE & TILT FORENSICS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "mistakes" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Dual-Axis Emotion vs Net PnL Chart */}
          <div className="p-5 rounded-xl bg-[#0e0e12] border border-[rgba(255,255,255,0.07)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(255,255,255,0.06)] pb-3">
              <div>
                <span className="text-sm font-black font-mono uppercase tracking-wider text-[#f4f4f5] flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#20e0b2]" /> Psychological State vs. Realized P&amp;L
                </span>
                <p className="text-[11px] text-[#71717a] font-mono mt-0.5">
                  Empirical proof: Shows which emotional states generated profits vs severe drawdowns.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-[#20e0b2]">
                  <span className="w-2 h-2 rounded-full bg-[#20e0b2]" /> Net P&amp;L ($)
                </span>
                <span className="flex items-center gap-1 text-[#8b5cf6]">
                  <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" /> Emotional State (1-10)
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={emotionPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#20e0b2" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#20e0b2" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="#71717a" fontSize={10} fontVariant="mono" />
                  <YAxis stroke="#71717a" fontSize={10} fontVariant="mono" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#101014",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontFamily: "monospace",
                      fontSize: "11px",
                    }}
                  />
                  <Area type="monotone" dataKey="pnl" stroke="#20e0b2" strokeWidth={2} fill="url(#pnlGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trade Quality & Mistake Audit Modules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TradeQualityRater />
            <MistakeLogger />
          </div>

          <div className="grid grid-cols-1">
            <DeviationReporter />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: MILESTONES & CHALLENGES
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "challenges" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 30-Day Rule Compliance Streak Banner */}
          <div className="p-5 rounded-xl bg-[#0e0e12] border border-[rgba(255,255,255,0.07)] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#20e0b2]/10 border border-[#20e0b2]/30 flex items-center justify-center text-[#20e0b2]">
                <Flame className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white">{currentStreak} Days</span>
                  <span className="px-2 py-0.5 rounded bg-[#20e0b2]/15 text-[#20e0b2] border border-[#20e0b2]/30 text-[9px] font-bold">
                    ACTIVE STREAK
                  </span>
                </div>
                <span className="text-[10px] text-[#71717a] block mt-0.5">
                  Consecutive trading days adhering 100% to documented plan &amp; stop-loss rules.
                </span>
              </div>
            </div>

            {/* Visual Heatmap Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
              {streakData.slice(-15).map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.compliant ? "Disciplined" : "Violated Rule"}`}
                  className={`w-4 h-8 rounded-sm transition-all ${
                    d.compliant ? "bg-[#20e0b2]" : "bg-[#ff5c73]"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Prop Firm Challenge Tracker & Drawdown Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FundedChallengeTracker />
            <DrawdownAlerts />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProgressToProfitability />
            <RuleViolationTracker />
          </div>
        </div>
      )}
    </div>
  );
}

export default function UnifiedReviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-[#71717a]">Loading Review Center...</div>}>
      <ReviewContent />
    </Suspense>
  );
}
