import Link from "next/link";
import { ArrowLeft, Compass, LayoutDashboard, Terminal } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-[#070709] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#20e0b2]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md space-y-5">
        {/* Radar Icon badge */}
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shadow-[0_0_30px_rgba(32,224,178,0.15)] text-[#20e0b2]">
          <Compass className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#20e0b2]">
            HTTP 404 · Navigation Out of Bounds
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            Module Not Found
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans pt-1">
            The requested trading desk, telemetry view, or asset pair does not exist or has been relocated in the latest release.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3 font-mono text-xs">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#20e0b2] text-zinc-950 font-bold hover:bg-[#20e0b2]/90 transition-all shadow-[0_0_20px_rgba(32,224,178,0.25)] active:scale-[0.98]"
          >
            <LayoutDashboard className="w-4 h-4" /> Live Radar
          </Link>

          <Link
            href="/terminal"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-zinc-300 font-semibold hover:bg-white/[0.08] hover:text-white transition-all active:scale-[0.98]"
          >
            <Terminal className="w-4 h-4 text-zinc-400" /> Terminal
          </Link>
        </div>
      </div>
    </div>
  );
}

