"use client";

import { useState, useEffect } from "react";
import { usePanicMode, PanicTrigger } from "./providers/PanicModeProvider";
import {
  ShieldAlert, Clock, Eye, XCircle, Lock, AlertTriangle,
  TrendingDown, BrainCircuit, Activity, ArrowRight
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTimeLeft(until: Date): string {
  const ms = until.getTime() - Date.now();
  if (ms <= 0) return "00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const TRIGGER_ICONS: Record<PanicTrigger, React.ElementType> = {
  daily_loss_exceeded: TrendingDown,
  consecutive_losses: Activity,
  max_risk_exceeded: ShieldAlert,
  tilt_detected: BrainCircuit,
  manual: Lock,
};

const TRIGGER_LABELS: Record<PanicTrigger, string> = {
  daily_loss_exceeded: "Daily Loss Exceeded",
  consecutive_losses: "Consecutive Losses Detected",
  max_risk_exceeded: "Risk Limit Exceeded",
  tilt_detected: "Tilt Behaviour Detected",
  manual: "Manual Account Lock",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function PanicModeOverlay() {
  const { panic, dismissPanic, lockAccount, isLocked } = usePanicMode();
  const [timeLeft, setTimeLeft] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!panic.lockedUntil) return;
    const update = () => setTimeLeft(formatTimeLeft(panic.lockedUntil!));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [panic.lockedUntil]);

  if (!panic.active) return null;

  const TriggerIcon = TRIGGER_ICONS[panic.trigger || "manual"];
  const isHardLocked = panic.viewOnly && panic.lockedUntil;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      {/* Backdrop — dark red tint */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        style={{ background: "radial-gradient(ellipse at center, rgba(239,68,68,0.08) 0%, rgba(0,0,0,0.85) 70%)" }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{
          background: "linear-gradient(160deg, #0f0a0a 0%, #130909 100%)",
          border: "1px solid rgba(239,68,68,0.3)",
          boxShadow: "0 0 80px rgba(239,68,68,0.2), 0 0 0 1px rgba(239,68,68,0.15)"
        }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #ef4444, #dc2626, #b91c1c)" }} />

        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <TriggerIcon className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 mb-1">
                ⚠ Panic Mode Activated
              </div>
              <h2 className="text-xl font-bold text-white">
                {TRIGGER_LABELS[panic.trigger || "manual"]}
              </h2>
            </div>
          </div>

          {/* AI Warning Message */}
          <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-sm text-red-200 leading-relaxed">{panic.message}</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Daily Loss</div>
              <div className="text-2xl font-bold font-mono text-red-400">
                -{panic.dailyLossPct.toFixed(2)}%
              </div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Consecutive Losses</div>
              <div className="text-2xl font-bold font-mono text-red-400">
                {panic.consecutiveLosses}
              </div>
            </div>
          </div>

          {/* Hard lock countdown */}
          {isHardLocked && (
            <div className="rounded-xl p-4 mb-6 flex items-center gap-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <Lock className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-red-300 font-semibold mb-0.5">Account Locked — View Only Mode</div>
                <div className="text-xs text-red-400/70">Trading resumes in <span className="font-mono font-bold text-white">{timeLeft}</span></div>
              </div>
              <div className="ml-auto text-3xl font-black font-mono text-red-400">{timeLeft}</div>
            </div>
          )}

          {/* AI Insight box */}
          <div className="rounded-xl p-4 mb-6 flex items-start gap-3" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
            <BrainCircuit className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-purple-200/80 leading-relaxed">
              {panic.consecutiveLosses >= 3
                ? `Statistically, traders with ${panic.consecutiveLosses} consecutive losses have a 68% chance of making another loss if they continue trading immediately. A break resets your focus.`
                : panic.dailyLossPct >= 3
                  ? `You have lost ${panic.dailyLossPct.toFixed(1)}% today. Historical data shows most additional trades after this threshold increase losses by 40%.`
                  : "Step away. Your best trades happen with a clear mind, not under pressure to recover."}
            </p>
          </div>

          {/* Action Buttons */}
          {!isHardLocked ? (
            <div className="space-y-3">
              {/* Lock account voluntarily */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 6].map(h => (
                  <button
                    key={h}
                    onClick={() => lockAccount(h)}
                    className="py-2.5 rounded-xl text-xs font-bold text-red-300 transition-all hover:scale-105"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
                  >
                    <Lock className="w-3 h-3 mx-auto mb-1" />
                    Lock {h}h
                  </button>
                ))}
              </div>

              {/* View only (no lock timer) */}
              <button
                onClick={() => { lockAccount(0.001); setTimeout(() => dismissPanic, 100); }}
                className="w-full py-3 rounded-xl text-sm font-bold text-gray-300 transition-all hover:bg-white/5 flex items-center justify-center gap-2"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Eye className="w-4 h-4" />
                View Only Mode
              </button>

              {/* Override / Ignore */}
              {!confirmed ? (
                <button
                  onClick={() => setConfirmed(true)}
                  className="w-full py-3 rounded-xl text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  I understand the risk — continue trading
                </button>
              ) : (
                <button
                  onClick={dismissPanic}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  <ArrowRight className="w-4 h-4" />
                  Confirm — Resume Trading (High Risk)
                </button>
              )}
            </div>
          ) : (
            <div className="py-3 rounded-xl text-center text-sm text-gray-500" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Eye className="w-4 h-4 inline mr-2 opacity-50" />
              Trading is disabled. You can still view charts, journal, and analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
