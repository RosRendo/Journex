"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Clock, Globe } from "lucide-react";
import { resolveLocalUrl } from "@/lib/utils";

const BRIDGE = resolveLocalUrl(process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge");

interface CalEvent {
  time: string;        // "HH:MM UTC"
  event: string;
  currency: string;
  impact: string;      // "high" | "medium" | "low"
  forecast: string;
  previous: string;
  actual: string | null;
}

// Currency flag emoji map
const FLAG: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", AUD: "🇦🇺",
  CAD: "🇨🇦", CHF: "🇨🇭", NZD: "🇳🇿", CNY: "🇨🇳", ALL: "🌐",
};

function useCountdown(targetUtcTime: string) {
  const [secs, setSecs] = useState<number>(() => computeSecs(targetUtcTime));

  useEffect(() => {
    const id = setInterval(() => setSecs(computeSecs(targetUtcTime)), 1000);
    return () => clearInterval(id);
  }, [targetUtcTime]);

  return secs;
}

function computeSecs(utcTime: string): number {
  const [h, m] = utcTime.replace(" UTC", "").split(":").map(Number);
  const now = new Date();
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0)
  );
  return Math.floor((target.getTime() - Date.now()) / 1000);
}

function fmtCountdown(secs: number): string {
  if (secs < 0) return "Passed";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function EventRow({ ev, showLocal }: { ev: CalEvent; showLocal: boolean }) {
  const secs = useCountdown(ev.time);
  const isPast = secs < 0;
  const isUrgent = secs >= 0 && secs < 30 * 60;
  const isWarn = secs >= 30 * 60 && secs < 2 * 3600;

  const localTime = (() => {
    const [h, m] = ev.time.replace(" UTC", "").split(":").map(Number);
    const d = new Date();
    d.setUTCHours(h, m, 0, 0);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  })();

  const impactColor =
    ev.impact === "high" ? "#ef4444" :
    ev.impact === "medium" ? "#f59e0b" : "#6b7280";

  const actualColor = (() => {
    if (!ev.actual || !ev.forecast || ev.forecast === "—") return "var(--text-primary)";
    const a = parseFloat(ev.actual), f = parseFloat(ev.forecast);
    if (!isNaN(a) && !isNaN(f)) return a >= f ? "#00c896" : "#ff4d6a";
    return "var(--text-primary)";
  })();

  return (
    <tr
      className="border-b transition-colors"
      style={{
        borderColor: "var(--border)",
        background: isPast ? "transparent" : isUrgent ? "rgba(239,68,68,0.06)" : isWarn ? "rgba(245,158,11,0.04)" : "transparent",
        opacity: isPast ? 0.45 : 1,
      }}
    >
      <td className="py-3 px-3 whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-mono font-bold" style={{ color: "var(--text-primary)" }}>
            {showLocal ? localTime : ev.time.replace(" UTC", "")}
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            {showLocal ? "Local" : "UTC"}
          </span>
        </div>
      </td>

      <td className="py-3 px-3">
        <span className="text-[13px] font-bold">
          {FLAG[ev.currency] ?? "🏳️"} {ev.currency}
        </span>
      </td>

      <td className="py-3 px-3 max-w-[240px]">
        <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
          {ev.event}
        </span>
      </td>

      <td className="py-3 px-3 text-center">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ background: impactColor }}
          title={ev.impact}
        />
      </td>

      <td className="py-3 px-3 text-right">
        <span className="text-[12px] font-mono" style={{ color: "var(--text-secondary)" }}>
          {ev.forecast}
        </span>
      </td>

      <td className="py-3 px-3 text-right">
        <span className="text-[12px] font-mono" style={{ color: "var(--text-secondary)" }}>
          {ev.previous}
        </span>
      </td>

      <td className="py-3 px-3 text-right">
        {ev.actual ? (
          <span className="text-[12px] font-mono font-bold" style={{ color: actualColor }}>
            {ev.actual}
          </span>
        ) : (
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>—</span>
        )}
      </td>

      <td className="py-3 px-3 text-right whitespace-nowrap">
        {isPast ? (
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Done</span>
        ) : (
          <span
            className={`text-[11px] font-bold font-mono ${isUrgent ? "animate-pulse" : ""}`}
            style={{ color: isUrgent ? "#ef4444" : isWarn ? "#f59e0b" : "var(--text-secondary)" }}
          >
            {fmtCountdown(secs)}
          </span>
        )}
      </td>
    </tr>
  );
}

export function EconomicCalendar({ selectedPair }: { selectedPair?: string }) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impactFilter, setImpactFilter] = useState<"all" | "high" | "medium">("all");
  const [currencyFilter, setCurrencyFilter] = useState<string | null>(null);
  const [showLocal, setShowLocal] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await fetch(`${BRIDGE}/api/calendar`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = await res.json();
      if (data.success && data.events) {
        setEvents(data.events);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError("No events returned from calendar API");
      }
    } catch (e: any) {
      setError(`Bridge offline: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
    const id = setInterval(fetchCalendar, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(id);
  }, [fetchCalendar]);

  // Derive unique currencies for filter
  const currencies = Array.from(new Set(events.map((e) => e.currency))).sort();

  const filtered = events.filter((ev) => {
    if (impactFilter !== "all" && ev.impact !== impactFilter) return false;
    if (currencyFilter && ev.currency !== currencyFilter) return false;
    return true;
  });

  const upcomingHighImpact = events.filter((ev) => {
    const s = computeSecs(ev.time);
    return s >= 0 && s < 4 * 3600 && ev.impact === "high";
  });

  return (
    <div className="space-y-4">
      {/* Alert banner for imminent high-impact events */}
      {upcomingHighImpact.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" }}>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <span className="text-[12px] font-bold text-red-400">
            {upcomingHighImpact.length} high-impact event{upcomingHighImpact.length > 1 ? "s" : ""} today —{" "}
            {upcomingHighImpact.map((e) => `${e.currency} ${e.event}`).join(", ")}
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Impact filter */}
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            {(["all", "high", "medium"] as const).map((f) => (
              <button key={f} onClick={() => setImpactFilter(f)}
                className="px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: impactFilter === f ? "var(--bg-card)" : "transparent",
                  color: impactFilter === f
                    ? f === "high" ? "#ef4444" : f === "medium" ? "#f59e0b" : "var(--text-primary)"
                    : "var(--text-tertiary)",
                  border: impactFilter === f ? "1px solid var(--border-strong)" : "1px solid transparent",
                }}>
                {f === "all" ? "All" : f === "high" ? "🔴 High" : "🟡 Medium"}
              </button>
            ))}
          </div>

          {/* Currency filter */}
          <div className="flex items-center gap-1 flex-wrap">
            <button onClick={() => setCurrencyFilter(null)}
              className="px-2 py-1 rounded text-[10px] font-bold transition-all"
              style={{
                background: !currencyFilter ? "var(--accent)" : "var(--bg-elevated)",
                color: !currencyFilter ? "#000" : "var(--text-secondary)",
              }}>
              ALL
            </button>
            {currencies.slice(0, 8).map((c) => (
              <button key={c} onClick={() => setCurrencyFilter(c === currencyFilter ? null : c)}
                className="px-2 py-1 rounded text-[10px] font-bold transition-all"
                style={{
                  background: currencyFilter === c ? "var(--accent)" : "var(--bg-elevated)",
                  color: currencyFilter === c ? "#000" : "var(--text-secondary)",
                }}>
                {FLAG[c] ?? ""} {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Local/UTC toggle */}
          <button onClick={() => setShowLocal((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <Globe className="w-3 h-3" />
            {showLocal ? "Local" : "UTC"}
          </button>

          {lastUpdate && (
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              Updated {lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}

          <button onClick={fetchCalendar} className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[--accent] border-t-transparent animate-spin" />
            <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>Fetching calendar…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-[13px] font-bold" style={{ color: "var(--text-secondary)" }}>Bridge Offline</span>
            <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>{error}</span>
            <button onClick={fetchCalendar} className="mt-2 px-3 py-1.5 rounded-lg text-[11px] font-bold"
              style={{ background: "var(--accent)", color: "#000" }}>
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Clock className="w-8 h-8" style={{ color: "var(--text-tertiary)" }} />
            <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>No events match this filter</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
                  {["Time", "Currency", "Event", "Impact", "Forecast", "Previous", "Actual", "Countdown"].map((h) => (
                    <th key={h} className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-left"
                      style={{ color: "var(--text-tertiary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev, i) => (
                  <EventRow key={`${ev.time}-${ev.event}-${i}`} ev={ev} showLocal={showLocal} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-center" style={{ color: "var(--text-tertiary)" }}>
        Source: ForexFactory via MT5 Bridge • Refreshes every 5 minutes
      </p>
    </div>
  );
}
