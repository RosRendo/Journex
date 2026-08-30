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
    <div className="rounded border border-[rgba(255,255,255,0.07)] bg-[#101014] overflow-hidden font-mono text-[9px]">
      <div className="overflow-x-auto scrollbar-none w-full">
        <div className="min-w-[620px] px-3.5 py-2">
          
          {/* Row 1: Session Pills */}
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              {SESSIONS.map((s) => {
                const { isOpen, isPreMarket, countdown } = getSessionStatus(s.open, s.close, utcH, utcM);
                return (
                  <div key={s.name} className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background: isOpen ? s.color : "#27272a"
                      }}
                    />
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-350 flex items-center gap-1.5">
                        {s.name}
                        <span
                          className="text-[7px] font-black uppercase px-1 rounded-sm leading-none"
                          style={{
                            color: isOpen ? s.color : isPreMarket ? "#f5c451" : "#71717a",
                            background: isOpen ? `${s.color}15` : isPreMarket ? "rgba(245,196,81,0.08)" : "rgba(255,255,255,0.02)",
                          }}
                        >
                          {isOpen ? "OPEN" : isPreMarket ? "PRE" : "CLOSED"}
                        </span>
                      </div>
                      <div className="text-[7.5px] text-[#71717a] mt-0.5 font-medium">
                        {isOpen ? `closes ${countdown}` : `opens ${countdown}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: TZ selector + times */}
            <div className="flex items-center gap-3 text-zinc-500 font-bold">
              <div className="flex gap-0.5 bg-black/35 border border-[rgba(255,255,255,0.07)] rounded p-0.5 text-[7px] font-black">
                {(["UTC", "GMT+7", "GMT+8", "GMT+9"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTz(t)}
                    className={`px-1.5 py-0.5 rounded transition-all ${tz === t ? "bg-white/10 text-white" : "text-[#71717a] hover:text-zinc-350"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="text-right leading-none">
                <div className="text-white text-[9px] font-bold">{localTimeStr} {tz}</div>
                <div className="text-zinc-600 text-[8px] mt-0.5">{utcTimeStr} UTC</div>
              </div>
            </div>
          </div>
 
          {/* Row 2: Timeline Bar */}
          <div className="relative h-4 rounded overflow-hidden bg-black/35 border border-[rgba(255,255,255,0.07)]">
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
                    style={{ left: `${left}%`, width: `${width}%`, background: `${s.color}0c`, borderLeft: `1px solid ${s.color}1e` }}
                  >
                    <span className="text-[7px] uppercase tracking-wider opacity-90" style={{ color: s.color }}>{s.name}</span>
                  </div>
                );
              } else {
                const w1 = toPercent(24 - startH);
                const w2 = toPercent(endH);
                return (
                  <React.Fragment key={s.name}>
                    <div className="absolute top-0 h-full flex items-center justify-center font-bold" style={{ left: `${toPercent(startH)}%`, width: `${w1}%`, background: `${s.color}0c`, borderLeft: `1px solid ${s.color}1e` }}>
                      <span className="text-[7px] uppercase tracking-wider opacity-90" style={{ color: s.color }}>{s.name}</span>
                    </div>
                    <div className="absolute top-0 h-full" style={{ left: "0%", width: `${w2}%`, background: `${s.color}0c` }} />
                  </React.Fragment>
                );
              }
            })}

            {/* Current time marker */}
            <div
              className="absolute top-0 h-full w-0.5 z-10 bg-[#20e0b2]"
              style={{ left: `${nowPct}%` }}
            />
          </div>

          {/* Hour labels */}
          <div className="flex justify-between mt-1 text-[7px] text-[#71717a] font-bold">
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
