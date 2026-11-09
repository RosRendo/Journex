"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[JOURNEX UNCAUGHT CLIENT ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full bg-[#070709] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden select-none">
      {/* Ambient error glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[rgba(255,92,115,0.06)] rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-[rgba(255,92,115,0.2)] flex items-center justify-center shadow-[0_0_30px_rgba(255,92,115,0.15)] text-[#ff5c73]">
          <AlertTriangle className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#ff5c73]">
            Telemetry Error Intercepted
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            System Interruption
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans pt-1">
            An unexpected client render state occurred. Your active orders, broker credentials, and trading journal records remain completely safe.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3 font-mono text-xs">
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#20e0b2] text-zinc-950 font-bold hover:bg-[#20e0b2]/90 transition-all shadow-[0_0_20px_rgba(32,224,178,0.25)] active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" /> Re-arm Desk
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-zinc-300 font-semibold hover:bg-white/[0.08] hover:text-white transition-all active:scale-[0.98]"
          >
            <LayoutDashboard className="w-4 h-4 text-zinc-400" /> Return to Radar
          </Link>
        </div>
      </div>
    </div>
  );
}

