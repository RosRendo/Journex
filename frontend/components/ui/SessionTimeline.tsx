"use client";
import React, { useState, useEffect } from "react";

// Session definitions (UTC hours)
const SESSIONS = [
  { name: "Sydney",   open: 22, close: 7,  color: "#4a9eff" },
  { name: "Tokyo",    open: 0,  close: 9,  color: "#f5a623" },
  { name: "London",   open: 8,  close: 17, color: "#00d4a1" },
  { name: "New York", open: 13, close: 22, color: "#a855f7" },
];

function getSessionStatus(open: number, close: number, utcH: number, utcM: number) {
  const nowMins = utcH * 60 + utcM;
  const openMins = open * 60;
  const closeMins = close * 60;

  let isOpen: boolean;
  if (open > close) { // wraps midnight
    isOpen = nowMins >= openMins || nowMins < closeMins;
  } else {
    isOpen = nowMins >= openMins && nowMins < closeMins;
  }

  const preMarketStart = openMins - 30;
  const isPreMarket = !isOpen && (nowMins >= Math.max(0, preMarketStart) && nowMins < openMins);

  // Countdown
  let minsLeft: number;
  if (isOpen) {
    minsLeft = open > close
      ? (closeMins - nowMins + 1440) % 1440
      : closeMins - nowMins;
  } else {
    minsLeft = open > close
      ? (openMins - nowMins + 1440) % 1440
      : openMins - nowMins;
    if (minsLeft < 0) minsLeft += 1440;
  }

  const h = Math.floor(minsLeft / 60);
  const m = minsLeft % 60;
  return { isOpen, isPreMarket, countdown: `${h}h ${m}m` };
}

export function SessionTimeline() {
  const [now, setNow] = useState(new Date());
  const [tz, setTz] = useState<"UTC" | "GMT+7" | "GMT+8" | "GMT+9">("UTC");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const utcH = now.getUTCHours();
  const utcM = now.getUTCMinutes();
  const nowFrac = utcH + utcM / 60; // 0-24

  // Timeline bar: 24 hours, each session as a block
  const toPercent = (h: number) => (h / 24) * 100;
  const nowPct = toPercent(nowFrac);

  const tzOffset: Record<string, number> = { "UTC": 0, "GMT+7": 7, "GMT+8": 8, "GMT+9": 9 };
  const localH = (utcH + tzOffset[tz]) % 24;
  const localTimeStr = `${String(localH).padStart(2, "0")}:${String(utcM).padStart(2, "0")}`;
  const utcTimeStr = `${String(utcH).padStart(2, "0")}:${String(utcM).padStart(2, "0")}`;

  return (
    <div className="rounded-xl border flex flex-col overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="overflow-x-auto scrollbar-none w-full">
        <div className="min-w-[650px] p-4">
          {/* Row 1: Session Pills */}
      <div className="flex flex-wrap gap-4 mb-4">
        {SESSIONS.map((s) => {
          const { isOpen, isPreMarket, countdown } = getSessionStatus(s.open, s.close, utcH, utcM);
          return (
            <div key={s.name} className="flex items-center gap-2.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: isOpen ? s.color : "var(--text-tertiary)",
                  boxShadow: isOpen ? `0 0 8px ${s.color}` : "none",
                  animation: isOpen ? "pulse-glow 2s infinite" : "none",
                }}
              />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                  {s.name}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] font-bold uppercase px-1 py-0.5 rounded"
                    style={{
                      color: isOpen ? s.color : isPreMarket ? "var(--warning)" : "var(--text-tertiary)",
                      background: isOpen ? `${s.color}18` : isPreMarket ? "rgba(245,166,35,0.12)" : "rgba(255,255,255,0.05)",
                    }}
                  >
                    {isOpen ? "OPEN" : isPreMarket ? "PRE" : "CLOSED"}
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                    {isOpen ? `closes ${countdown}` : `opens ${countdown}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Right: TZ selector + times */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex gap-0.5 bg-[--bg-elevated] rounded-lg p-0.5">
            {(["UTC", "GMT+7", "GMT+8", "GMT+9"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTz(t)}
                className="text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors"
                style={{
                  background: tz === t ? "var(--accent)" : "transparent",
                  color: tz === t ? "#000" : "var(--text-tertiary)",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="font-mono text-[11px] text-right leading-tight">
            <div style={{ color: "var(--text-primary)" }}>{localTimeStr} {tz}</div>
            <div style={{ color: "var(--text-tertiary)" }}>{utcTimeStr} UTC</div>
          </div>
        </div>
      </div>

      {/* Row 2: Timeline Bar */}
      <div className="relative h-8 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
        {SESSIONS.map((s) => {
          const startH = s.open;
          const endH = s.close;
          if (startH < endH) {
            const left = toPercent(startH);
            const width = toPercent(endH - startH);
            return (
              <div
                key={s.name + "a"}
                className="absolute top-0 h-full flex items-center justify-center"
                style={{ left: `${left}%`, width: `${width}%`, background: `${s.color}30`, borderLeft: `2px solid ${s.color}60` }}
              >
                <span className="text-[8px] font-bold" style={{ color: s.color }}>{s.name}</span>
              </div>
            );
          } else {
            // Wraps midnight: two segments
            const w1 = toPercent(24 - startH);
            const w2 = toPercent(endH);
            return (
              <React.Fragment key={s.name}>
                <div className="absolute top-0 h-full flex items-center justify-center" style={{ left: `${toPercent(startH)}%`, width: `${w1}%`, background: `${s.color}30`, borderLeft: `2px solid ${s.color}60` }}>
                  <span className="text-[8px] font-bold" style={{ color: s.color }}>{s.name}</span>
                </div>
                <div className="absolute top-0 h-full" style={{ left: "0%", width: `${w2}%`, background: `${s.color}30` }} />
              </React.Fragment>
            );
          }
        })}

        {/* Current time marker */}
        <div
          className="absolute top-0 h-full w-0.5 z-10"
          style={{ left: `${nowPct}%`, background: "#fff", boxShadow: "0 0 6px #fff" }}
        />
      </div>

      {/* Hour labels */}
      <div className="flex justify-between mt-1">
        {[0, 4, 8, 12, 16, 20, 24].map((h) => (
          <span key={h} className="text-[8px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            {String(h).padStart(2, "0")}:00
          </span>
        ))}
      </div>
        </div>
      </div>
    </div>
  );
}
