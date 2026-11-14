import Link from "next/link";
import { TrendingUp, ShieldCheck } from "lucide-react";

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#showcase", label: "Workspace" },
  { href: "#how", label: "Architecture" },
  { href: "#pricing", label: "Pricing" },
];

const APP_LINKS = [
  { href: "/dashboard", label: "Cockpit" },
  { href: "/signals", label: "Setup Scanner" },
  { href: "/macro/XAUUSD", label: "COMEX Order Flow" },
  { href: "/journal", label: "Trade Journal" },
  { href: "/analytics", label: "Analytics" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#070709] px-5 py-14 sm:px-8 relative z-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#20e0b2]/10 border border-[#20e0b2]/30 shadow-[0_0_12px_rgba(32,224,178,0.25)]">
                <TrendingUp className="h-4 w-4 text-[#20e0b2]" strokeWidth={2.5} />
              </span>
              <span className="text-[16px] font-bold tracking-tight text-white flex items-center gap-2">
                Journex
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-[#20e0b2] border border-[#20e0b2]/20 font-bold">
                  MT5 DESK
                </span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              The institutional execution cockpit and quantitative analytical journal for high-performing MetaTrader 5 operators.
            </p>
            <div className="flex items-center gap-2 text-[10.5px] font-mono text-[#20e0b2]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-pulse" />
              <span>Real MT5 Bridge: Operational</span>
            </div>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-8 sm:flex-row sm:gap-14">
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-bold">
                Platform
              </p>
              <ul className="space-y-2">
                {NAV.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="text-[13px] text-zinc-400 transition-colors hover:text-[#20e0b2]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 font-bold">
                Cockpit Modules
              </p>
              <ul className="space-y-2">
                {APP_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-zinc-400 transition-colors hover:text-[#20e0b2]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-12 border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="max-w-3xl text-[11px] leading-relaxed text-zinc-500">
            Risk disclosure: Trading leveraged forex, CFDs, and financial derivatives carries significant risk of capital loss.
            Journex provides real-time mathematical telemetry and journaling infrastructure; none of our tools constitute financial or investment advice.
          </p>
          <p className="text-[11px] font-mono text-zinc-500 shrink-0">
            © {new Date().getFullYear()} Journex Terminal. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
