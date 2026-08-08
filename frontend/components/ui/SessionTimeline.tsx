"use client";
import React, { useState, useEffect } from "react";

// Session definitions (UTC hours)
const SESSIONS = [
  { name: "Sydney",   open: 22, close: 7,  color: "#4a9eff" },
  { name: "Tokyo",    open: 0,  close: 9,  color: "#f5a623" },
  { name: "London",   open: 8,  close: 17, color: "#10b981" },
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

  const toPercent = (h: number) => (h / 24) * 100;
  const nowPct = toPercent(nowFrac);

  const tzOffset: Record<string, number> = { "UTC": 0, "GMT+7": 7, "GMT+8": 8, "GMT+9": 9 };
  const localH = (utcH + tzOffset[tz]) % 24;
  const localTimeStr = `${String(localH).padStart(2, "0")}:${String(utcM).padStart(2, "0")}`;
  const utcTimeStr = `${String(utcH).padStart(2, "0")}:${String(utcM).padStart(2, "0")}`;

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-[#111118] overflow-hidden shadow-xl font-mono text-[10px]">
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
                      background: isOpen ? s.color : "#3f3f46",
                      boxShadow: isOpen ? `0 0 8px ${s.color}` : "none",
                    }}
                  />
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                      {s.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="text-[8px] font-black uppercase px-1 rounded-sm"
                        style={{
                          color: isOpen ? s.color : isPreMarket ? "#f59e0b" : "#71717a",
                          background: isOpen ? `${s.color}15` : isPreMarket ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.02)",
                        }}
                      >
                        {isOpen ? "OPEN" : isPreMarket ? "PRE" : "CLOSED"}
                      </span>
                      <span className="text-[8px] text-zinc-550">
                        {isOpen ? `closes ${countdown}` : `opens ${countdown}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Right: TZ selector + times */}
            <div className="ml-auto flex items-center gap-3 text-zinc-500 font-bold">
              <div className="flex gap-1 bg-black/25 border border-zinc-850 rounded-lg p-0.5 text-[8px] font-black">
                {(["UTC", "GMT+7", "GMT+8", "GMT+9"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTz(t)}
                    className={`px-1.5 py-0.5 rounded transition-all ${tz === t ? "bg-white/10 text-white" : "text-zinc-550 hover:text-zinc-350"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="text-right leading-tight">
                <div className="text-white">{localTimeStr} {tz}</div>
                <div className="text-zinc-600 mt-0.5">{utcTimeStr} UTC</div>
              </div>
            </div>
          </div>

          {/* Row 2: Timeline Bar */}
          <div className="relative h-7 rounded-lg overflow-hidden bg-black/25 border border-zinc-850">
            {SESSIONS.map((s) => {
              const startH = s.open;
              const endH = s.close;
              if (startH < endH) {
                const left = toPercent(startH);
                const width = toPercent(endH - startH);
                return (
                  <div
                    key={s.name + "a"}
                    className="absolute top-0 h-full flex items-center justify-center font-bold"
                    style={{ left: `${left}%`, width: `${width}%`, background: `${s.color}15`, borderLeft: `1px solid ${s.color}30` }}
                  >
                    <span className="text-[7.5px] uppercase tracking-wider" style={{ color: s.color }}>{s.name}</span>
                  </div>
                );
              } else {
                const w1 = toPercent(24 - startH);
                const w2 = toPercent(endH);
                return (
                  <React.Fragment key={s.name}>
                    <div className="absolute top-0 h-full flex items-center justify-center font-bold" style={{ left: `${toPercent(startH)}%`, width: `${w1}%`, background: `${s.color}15`, borderLeft: `1px solid ${s.color}30` }}>
                      <span className="text-[7.5px] uppercase tracking-wider" style={{ color: s.color }}>{s.name}</span>
                    </div>
                    <div className="absolute top-0 h-full" style={{ left: "0%", width: `${w2}%`, background: `${s.color}15` }} />
                  </React.Fragment>
                );
              }
            })}

            {/* Current time marker */}
            <div
              className="absolute top-0 h-full w-0.5 z-10 bg-white"
              style={{ left: `${nowPct}%`, boxShadow: "0 0 5px #fff" }}
            />
          </div>

          {/* Hour labels */}
          <div className="flex justify-between mt-1.5 text-[8px] text-zinc-600 font-bold">
            {[0, 4, 8, 12, 16, 20, 24].map((h) => (
              <span key={h}>
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
