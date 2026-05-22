"use client";
import { useState, useEffect } from "react";
import { resolveLocalUrl } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Shield, X } from "lucide-react";

export interface PreTradeChecklistProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (overridden: boolean) => void;
  pair: string;
  direction: "buy" | "sell";
  price: number | null;
  sl: number | null;
  tp: number | null;
  nextNewsMinutes: number | null;
  setupScore: number | null;
}

interface ChecklistItem {
  id: string;
  label: string;
  check: () => boolean;
  failMsg: string;
}

export function PreTradeChecklist({
  isOpen,
  onClose,
  onConfirm,
  pair,
  direction,
  price,
  sl,
  tp,
  nextNewsMinutes,
  setupScore
}: PreTradeChecklistProps) {
  const [checking, setChecking] = useState(true);
  const [results, setResults] = useState<Map<string, boolean>>(new Map());
  const [override, setOverride] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setChecking(true);
    setOverride(false);
    setResults(new Map());

    const items: ChecklistItem[] = [
      {
        id: "setup",
        label: "Setup Score ≥ 5",
        check: () => (setupScore ?? 0) >= 5,
        failMsg: "Setup below threshold"
      },
      {
        id: "news",
        label: "No news in 30 min",
        check: () => nextNewsMinutes === null || nextNewsMinutes > 30,
        failMsg: "High-impact news imminent"
      },
      {
        id: "stops",
        label: "SL/TP configured",
        check: () => sl !== null && sl > 0,
        failMsg: "No stop loss set"
      },
      {
        id: "price",
        label: "Valid entry price",
        check: () => price !== null && price > 0,
        failMsg: "No live price"
      },
      {
        id: "session",
        label: "Active session",
        check: () => {
          const h = new Date().getUTCHours();
          return (h >= 8 && h < 17) || (h >= 13 && h < 22);
        },
        failMsg: "Outside active sessions"
      }
    ];

    const timer = setTimeout(() => {
      const newResults = new Map<string, boolean>();
      items.forEach(item => {
        newResults.set(item.id, item.check());
      });
      setResults(newResults);
      setChecking(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [isOpen, setupScore, nextNewsMinutes, sl, price]);

  if (!isOpen) return null;

  const passedCount = Array.from(results.values()).filter(Boolean).length;
  const totalCount = results.size;
  const allPassed = passedCount === totalCount && !override;

  const handleConfirm = async () => {
    const answers = {
      setup_score_above_6: (setupScore ?? 0) >= 6,
      news_2hours_away: (nextNewsMinutes ?? 0) > 120,
      stops_set: sl !== null && sl > 0,
      price_valid: price !== null && price > 0,
      session_active: (() => { const h = new Date().getUTCHours(); return (h >= 8 && h < 17) || (h >= 13 && h < 22); })()
    };

    try {
      const API_URL = resolveLocalUrl(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000");
      await fetch(`${API_URL}/api/checklist/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair,
          direction,
          answers,
          override: override || !allPassed,
          timestamp: new Date().toISOString()
        }),
      });
    } catch (e) {
      console.error("Failed to submit checklist:", e);
    }

    onConfirm(override || !allPassed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[--bg-card] border border-[--border] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="p-6 border-b border-[--border] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[--accent]" />
            <h3 className="text-lg font-bold text-white">Pre-Trade Checklist</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[--bg-elevated] text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 rounded-xl border border-[--border] bg-[--bg-base]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white">{pair}</span>
              <span className={`text-sm font-bold uppercase ${direction === "buy" ? "text-[--bull]" : "text-[--bear]"}`}>
                {direction}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Entry: {price?.toFixed(2) || "—"} · SL: {sl || "—"} · TP: {tp || "—"}
            </div>
          </div>

          {checking ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[--accent]" />
              <span className="ml-3 text-sm text-gray-400">Validating setup...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(results.entries()).map(([id, passed]) => {
                const item = [
                  { id: "setup", label: "Setup Score ≥ 5" },
                  { id: "news", label: "No news in 30 min" },
                  { id: "stops", label: "SL/TP configured" },
                  { id: "price", label: "Valid entry price" },
                  { id: "session", label: "Active session" }
                ].find(x => x.id === id);
                
                return (
                  <div key={id} className="flex items-center justify-between p-3 rounded-lg bg-[--bg-base]">
                    <span className="text-sm font-medium text-gray-300">{item?.label}</span>
                    {passed ? (
                      <CheckCircle2 className="w-5 h-5 text-[--bull]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[--bear]" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!checking && !allPassed && (
            <div className="mt-4 p-3 rounded-lg bg-[--bear]/10 border border-[--bear]/20 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[--bear] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[--bear]">Some checks failed</p>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={override}
                    onChange={e => setOverride(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-500"
                  />
                  <span className="text-xs text-gray-400">Override and proceed anyway</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[--border] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-sm border border-[--border] text-gray-400 hover:text-white hover:bg-[--bg-elevated] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={checking}
            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
              allPassed || override
                ? "bg-[--accent] text-black hover:shadow-[0_0_20px_rgba(0,212,161,0.4)]"
                : "bg-[--bg-elevated] text-gray-500 cursor-not-allowed"
            }`}
          >
            {(allPassed || override) ? (
              <><CheckCircle2 className="w-4 h-4" />Confirm Trade</>
            ) : (
              "Checks Required"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}