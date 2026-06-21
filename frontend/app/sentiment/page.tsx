"use client";
import React, { useState } from "react";
import { Brain, Flame, CheckCircle2, Circle, AlertTriangle, Activity, TrendingUp, TrendingDown, Clock, MoveRight } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

/* ─── Mock Data ──────────────────────────────────────────────────────────── */
const EMOTION_PERFORMANCE_DATA = [
  { day: "Mon", pnl: 450, emotion: 8, label: "Focused" },
  { day: "Tue", pnl: -120, emotion: 4, label: "Anxious" },
  { day: "Wed", pnl: 890, emotion: 9, label: "Flow State" },
  { day: "Thu", pnl: 210, emotion: 7, label: "Calm" },
  { day: "Fri", pnl: -450, emotion: 3, label: "Tilted" },
  { day: "Mon", pnl: 340, emotion: 8, label: "Focused" },
  { day: "Tue", pnl: 650, emotion: 8, label: "Focused" },
];

const STREAK_DATA = Array.from({ length: 30 }).map((_, i) => ({
  date: `2024-03-${(i + 1).toString().padStart(2, '0')}`,
  compliant: true,
  future: i > 24
}));

const PRE_TRADE_QUESTIONS = [
  "Am I trading my documented edge/setup?",
  "Is my risk strictly 1% or less of my capital?",
  "Am I emotionally neutral and not revenge trading?",
  "Are there any major upcoming news events (NFP, CPI)?",
  "Is my Take Profit at a realistic, logical structural level?"
];

/* ─── UI Components ──────────────────────────────────────────────────────── */

function ChecklistModal({ onClose }: { onClose: () => void }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const allChecked = PRE_TRADE_QUESTIONS.every((_, i) => checked[i]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl bg-[--bg-base]" style={{ borderColor: "var(--border)" }}>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[--accent]/10 text-[--accent]">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
              Pre-Trade Checklist
            </h2>
            <p className="text-[12px] text-[--text-tertiary]">Psychology and plan verification</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {PRE_TRADE_QUESTIONS.map((q, i) => {
            const isChecked = checked[i];
            return (
              <label key={i} className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer hover:bg-[--bg-elevated] transition-all group"
                style={{ 
                  borderColor: isChecked ? "var(--accent)" : "var(--border)",
                  background: isChecked ? "rgba(0,212,161,0.05)" : "var(--bg-card)"
                }}>
                <button 
                  type="button"
                  className="mt-0.5 shrink-0 transition-colors"
                  onClick={() => setChecked(prev => ({ ...prev, [i]: !prev[i] }))}
                >
                  {isChecked ? <CheckCircle2 className="w-5 h-5 text-[--accent]" /> : <Circle className="w-5 h-5 text-[--text-tertiary] group-hover:text-[--text-secondary]" />}
                </button>
                <span className="text-[13px] font-medium leading-snug" style={{ color: isChecked ? "var(--text-primary)" : "var(--text-secondary)" }}>
                  {q}
                </span>
              </label>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-[13px] font-bold hover:bg-[--bg-elevated] transition-colors" style={{ borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}>
            Cancel
          </button>
          <button 
            disabled={!allChecked}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "var(--accent)", color: "#000" }}
            onClick={() => {
              alert("Checklist passed! You are clear to trade.");
              onClose();
            }}
          >
            Clear to Trade <MoveRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function MoodTrackerPage() {
  const [showChecklist, setShowChecklist] = useState(false);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      
      {showChecklist && <ChecklistModal onClose={() => setShowChecklist(false)} />}

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h1 className="text-[32px] font-bold tracking-tight mb-1" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
            Mood Tracker
          </h1>
          <p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
            Psychology insights, rule compliance, and emotion-driven performance.
          </p>
        </div>
        <button 
          onClick={() => setShowChecklist(true)}
          className="px-6 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(0,212,161,0.2)] hover:shadow-[0_0_25px_rgba(0,212,161,0.4)] transition-all"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          <Brain className="w-4 h-4" /> Start Pre-Trade Checklist
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Left Column: Compliance & Streaks ── */}
        <div className="space-y-6">
          
          {/* Streak Card */}
          <div className="rounded-2xl border p-6 flex flex-col items-center justify-center relative overflow-hidden text-center" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[--accent] opacity-10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 border" style={{ background: "rgba(0,212,161,0.1)", borderColor: "rgba(0,212,161,0.2)", color: "var(--accent)" }}>
              <Flame className="w-8 h-8" />
            </div>
            <div className="text-[48px] font-black font-mono leading-none tracking-tighter" style={{ color: "var(--text-primary)" }}>
              14
            </div>
            <div className="text-[12px] font-bold uppercase tracking-widest mt-2" style={{ color: "var(--text-tertiary)" }}>
              Day Compliance Streak
            </div>
            <p className="text-[12px] leading-relaxed mt-4 px-4" style={{ color: "var(--text-secondary)" }}>
              You've perfectly followed your trading plan and risk management rules for 14 consecutive trading days.
            </p>
          </div>

          {/* Compliance Heatmap */}
          <div className="rounded-2xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
             <h3 className="text-[13px] font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <CheckCircle2 className="w-4 h-4 text-[--accent]" /> 30-Day Rule Compliance
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {STREAK_DATA.map((d, i) => (
                <div 
                  key={i}
                  title={d.date}
                  className="w-[calc(20%-4.8px)] aspect-square rounded-md border"
                  style={{
                    background: d.future ? "transparent" : (d.compliant ? "var(--bull)" : "var(--bear)"),
                    borderColor: d.future ? "var(--border)" : "transparent",
                    opacity: d.future ? 0.3 : (d.compliant ? 0.8 : 0.8)
                  }}
                />
              ))}
            </div>
          </div>

        </div>

        {/* ── Right Column: Emotion vs Performance ── */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Chart */}
          <div className="rounded-2xl border p-5 h-[415px] flex flex-col" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>Emotion vs. Net P&L</h3>
                <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>Correlation between your psychological state and outcome</p>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[--accent]" /> Emotion Score (1-10)</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} /> Net P&L ($)</span>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={EMOTION_PERFORMANCE_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontFamily: "monospace" }} />
                  <YAxis yAxisId="right" orientation="right" hide domain={[0, 10]} />
                  <Tooltip 
                    cursor={{ fill: "rgba(255,255,255,0.02)" }}
                    content={({ active, payload }) => {
                       if (!active || !payload?.length) return null;
                       const data = payload[0].payload;
                       const isProfit = data.pnl >= 0;
                       return (
                         <div className="rounded-xl border p-3 shadow-xl" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
                           <p className="text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-2">{data.day}</p>
                           <p className="text-[14px] font-mono font-bold flex items-center gap-1" style={{ color: isProfit ? "var(--bull)" : "var(--bear)" }}>
                             {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                             {data.pnl >= 0 ? "+" : ""}${data.pnl}
                           </p>
                           <p className="text-[12px] font-medium mt-1 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                             <Brain className="w-3.5 h-3.5 text-[--accent]" /> State: <span className="text-[--text-primary] font-bold">{data.label} ({data.emotion}/10)</span>
                           </p>
                         </div>
                       );
                    }}
                  />
                  
                  {/* P&L Background Bars */}
                  <Bar yAxisId="left" dataKey="pnl" radius={[4, 4, 4, 4]} barSize={40}>
                    {EMOTION_PERFORMANCE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "rgba(0,212,161,0.15)" : "rgba(255,77,106,0.15)"} />
                    ))}
                  </Bar>
                  <ReferenceLine yAxisId="left" y={0} stroke="var(--border)" />
                  
                  {/* Emotion Overlay Line mapped to right Axis but drawn as a custom SVG inside Recharts or simply rendered as small floating Badges if we wanted. For simplicity we'll render it as a second Bar with high Z-index or an Area/Line. Actually, I'll just use a Line for emotion! Let's swap the import to include Line */}
                </BarChart>
              </ResponsiveContainer>

              {/* Absolute positioned Emotion nodes connecting over the bars */}
               <ResponsiveContainer width="100%" height="100%" className="absolute inset-0 pointer-events-none">
                  <AreaChart data={EMOTION_PERFORMANCE_DATA} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <YAxis hide domain={[0, 10]} />
                    <Area type="monotone" dataKey="emotion" stroke="var(--accent)" strokeWidth={3} fillOpacity={0} dot={{ stroke: "var(--bg-card)", strokeWidth: 3, fill: "var(--accent)", r: 6 }} />
                  </AreaChart>
               </ResponsiveContainer>

            </div>
          </div>

          {/* Warning Banner */}
          <div className="rounded-2xl border p-5 flex items-start gap-4" style={{ background: "rgba(255,160,0,0.05)", borderColor: "rgba(255,160,0,0.2)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,160,0,0.1)", color: "var(--warning)" }}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[13px] font-bold mb-1" style={{ color: "var(--warning)" }}>AI Pattern Detected: "Revenge Trading" Risk</h4>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                You suffered a -450 P&L drawdown on Friday while your emotional state dropped to 3/10 (Tilted). Historically, attempting to recover heavily on Mondays leads to a 68% larger loss. Start with 50% reduced position sizing today.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
