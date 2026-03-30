"use client";
import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003";

interface CalEvent {
  time: string;
  event: string;
  currency: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string | null;
}

// Which currencies matter for each pair
const PAIR_CURRENCIES: Record<string, string[]> = {
  EURUSD: ["EUR", "USD"], GBPUSD: ["GBP", "USD"], USDJPY: ["USD", "JPY"],
  XAUUSD: ["USD"], USOIL: ["USD"], US30: ["USD"], US100: ["USD"],
  AUDUSD: ["AUD", "USD"], USDCAD: ["USD", "CAD"], USDCHF: ["USD", "CHF"],
  GBPJPY: ["GBP", "JPY"], EURJPY: ["EUR", "JPY"], NZDUSD: ["NZD", "USD"],
};

function computeSecs(utcTime: string): number {
  const [h, m] = utcTime.replace(" UTC", "").split(":").map(Number);
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0)
  );
  return Math.floor((target.getTime() - Date.now()) / 1000);
}

function fmtCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

export function NewsCountdown({ pair = "XAUUSD" }: { pair?: string }) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [tick, setTick] = useState(0);

  const relevantCurrencies = PAIR_CURRENCIES[pair] ?? ["USD"];

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${BRIDGE}/api/calendar`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = await res.json();
      if (data.success && data.events) {
        setEvents(data.events.filter((e: CalEvent) =>
          e.impact === "high" && relevantCurrencies.includes(e.currency)
        ));
      }
    } catch { /* bridge offline */ }
  }, [pair]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchEvents();
    const refresh = setInterval(fetchEvents, 5 * 60 * 1000);
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { clearInterval(refresh); clearInterval(timer); };
  }, [fetchEvents]);

  // Sort upcoming events ascending
  const upcoming = events
    .map((ev) => ({ ...ev, secs: computeSecs(ev.time) }))
    .filter((ev) => ev.secs > 0)
    .sort((a, b) => a.secs - b.secs);

  const next = upcoming[0];
  const rest = upcoming.slice(1, 3);

  // Determine state
  const bgStyle = (() => {
    if (!next) return { bg: "rgba(0,200,150,0.08)", border: "rgba(0,200,150,0.25)", dot: "#00c896", label: "Clear", labelColor: "#00c896" };
    if (next.secs < 30 * 60) return { bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.30)", dot: "#ef4444", label: "URGENT", labelColor: "#ef4444" };
    if (next.secs < 2 * 3600) return { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", dot: "#f59e0b", label: "UPCOMING", labelColor: "#f59e0b" };
    return { bg: "rgba(0,200,150,0.06)", border: "rgba(0,200,150,0.20)", dot: "#00c896", label: "CLEAR", labelColor: "#00c896" };
  })();

  return (
    <div className="rounded-xl p-3.5 space-y-2.5 transition-all duration-500"
      style={{ background: bgStyle.bg, border: `1px solid ${bgStyle.border}` }}>

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: bgStyle.dot, boxShadow: next && next.secs < 30 * 60 ? `0 0 8px ${bgStyle.dot}` : "none" }}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: bgStyle.labelColor }}>
            News Risk
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          {relevantCurrencies.join(" / ")}
        </span>
      </div>

      {next ? (
        <>
          <div>
            <div className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>
              {next.currency} — {next.event}
            </div>
            <div className="text-[28px] font-bold font-mono leading-tight mt-1"
              style={{ color: bgStyle.labelColor, fontFamily: "var(--font-display, Syne, sans-serif)" }}>
              {fmtCountdown(next.secs)}
            </div>
            <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
              📅 {next.time} • Forecast: {next.forecast} • Prev: {next.previous}
            </div>
          </div>

          {rest.length > 0 && (
            <div className="pt-2 border-t space-y-1" style={{ borderColor: "var(--border)" }}>
              {rest.map((ev, i) => (
                <div key={i} className="flex justify-between items-center text-[11px]">
                  <span style={{ color: "var(--text-secondary)" }}>{ev.currency} — {ev.event}</span>
                  <span className="font-mono" style={{ color: "var(--text-tertiary)" }}>{fmtCountdown(ev.secs)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" style={{ color: "#00c896" }} />
          <div>
            <div className="text-[13px] font-bold" style={{ color: "#00c896" }}>No high-impact events next 4h</div>
            <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Clear to trade this pair</div>
          </div>
        </div>
      )}
    </div>
  );
}
