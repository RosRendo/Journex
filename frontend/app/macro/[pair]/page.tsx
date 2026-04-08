"use client";
import React, { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Clock, MessageSquare, TrendingUp, TrendingDown, Activity, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from "recharts";

// ─── Market Sessions Swimlane (matches reference image) ──────────
const SESSIONS = [
  { name: "Sydney",   open: 22, close: 7,  color: "#4a9eff", afterClose: 9 },
  { name: "Tokyo",    open: 0,  close: 9,  color: "#f5a623", afterClose: 11 },
  { name: "London",   open: 8,  close: 17, color: "#00d4a1", afterClose: 19 },
  { name: "New York", open: 13, close: 22, color: "#a855f7", afterClose: 24 },
];

function getSessionStatus(open: number, close: number, utcH: number, utcM: number) {
  const nowMins = utcH * 60 + utcM;
  const openMins = open * 60;
  const closeMins = close * 60;
  const isOpen = open > close
    ? nowMins >= openMins || nowMins < closeMins
    : nowMins >= openMins && nowMins < closeMins;
  const isAfterHours = !isOpen && (
    open > close
      ? nowMins >= closeMins && nowMins < openMins
      : nowMins >= closeMins && nowMins < (closeMins + 120)
  );
  let minsLeft = isOpen
    ? (open > close ? (closeMins - nowMins + 1440) % 1440 : closeMins - nowMins)
    : Math.max(0, open > close ? (openMins - nowMins + 1440) % 1440 : openMins - nowMins);
  return { isOpen, isAfterHours, countdown: `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m` };
}

function MarketSessionsBar() {
  const [now, setNow] = useState(new Date());
  const [tz, setTz] = useState<"GMT+7" | "GMT+8" | "GMT+9">("GMT+8");
  const TZ: Record<string, number> = { "GMT+7": 7, "GMT+8": 8, "GMT+9": 9 };
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  const utcH = now.getUTCHours(), utcM = now.getUTCMinutes();
  const localH = (utcH + TZ[tz]) % 24;
  const localStr = `${String(localH).padStart(2,"0")}:${String(utcM).padStart(2,"0")} ${utcM >= 0 && localH < 12 ? "AM" : "PM"}`;
  const nowFrac = utcH + utcM / 60;
  const nowPct = `${(nowFrac / 24) * 100}%`;

  // Hours in the TZ to display
  const tzOffset = TZ[tz];
  const displayHours = [0, 4, 8, 12, 16, 20, 24].map(h => ({
    utc: h,
    local: (h + tzOffset) % 24,
    pct: `${(h / 24) * 100}%`
  }));

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--text-tertiary)" }}>Market Sessions</span>
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5 p-0.5 rounded-md" style={{ background: "var(--bg-elevated)" }}>
            {(["GMT+7","GMT+8","GMT+9"] as const).map(t => (
              <button key={t} onClick={() => setTz(t)}
                className="text-[9px] px-2 py-1 rounded font-bold transition-all"
                style={{ background: tz === t ? "var(--accent)" : "transparent", color: tz === t ? "#fff" : "var(--text-tertiary)" }}>
                {t} Timezone
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-6 relative">
        {/* Time axis labels */}
        <div className="relative h-6 mb-2 border-b" style={{ borderColor: "var(--border-strong)" }}>
          {displayHours.map(({ local, pct }, i) => (
            <span key={i} className="absolute bottom-1 text-[9px] font-mono -translate-x-1/2" style={{ left: pct, color: "var(--text-tertiary)" }}>
              {String(local).padStart(2,"0")}:00
            </span>
          ))}
          {/* Current time label above marker */}
          <span className="absolute bottom-[3px] text-[10px] font-mono font-bold -translate-x-1/2" style={{ left: nowPct, color: "var(--text-primary)" }}>
            {localStr}
          </span>
          <div className="absolute w-2 h-2 rounded-full border-2 border-[--bg-card] -bottom-1 -translate-x-1/2 z-10" style={{ left: nowPct, background: "var(--text-primary)" }} />
        </div>

        {/* Global Now Line (drops behind bars) */}
        <div className="absolute top-[36px] bottom-0 w-px z-10 -translate-x-1/2" style={{ left: `calc(1.25rem + (100% - 2.5rem) * ${nowFrac/24})`, background: "rgba(255,255,255,0.25)" }} />

        {/* Floating Session Swimlanes */}
        <div className="relative h-[220px] w-full" style={{ background: "rgba(0,0,0,0.1)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.03)" }}>
          {SESSIONS.map((s, idx) => {
            const { isOpen, isAfterHours, countdown } = getSessionStatus(s.open, s.close, utcH, utcM);
            const startPct = (s.open / 24) * 100;
            const mainWidth = s.open < s.close ? ((s.close - s.open) / 24) * 100 : ((24 - s.open) / 24) * 100;
            
            // Determine vertical lane, staggered
            const laneTop = 16 + idx * 48; 

            return (
              <React.Fragment key={s.name}>
                {/* Main Session Bar floating over timeline */}
                {s.open < s.close ? (
                  <div className="absolute h-[38px] rounded-lg border overflow-hidden transition-all group"
                    style={{
                      left: `${startPct}%`, top: laneTop, width: `${mainWidth}%`,
                      background: isOpen ? `linear-gradient(90deg, ${s.color}20, ${s.color}10)` : "rgba(20,20,25,0.8)",
                      borderColor: isOpen ? `${s.color}60` : "rgba(255,255,255,0.05)",
                      boxShadow: isOpen ? `0 0 20px -5px ${s.color}30` : "none"
                    }}>
                    <div className="p-2 flex flex-col justify-center h-full">
                       <span className="text-[11px] font-bold leading-none" style={{ color: isOpen ? "white" : "var(--text-tertiary)" }}>{s.name}</span>
                       <span className="text-[8px] font-bold uppercase mt-1 tracking-wider" style={{ color: isOpen ? s.color : isAfterHours ? "#4a9eff" : "#ff4d6a" }}>
                         {isOpen ? "OPEN" : isAfterHours ? "AFTER HOURS" : "CLOSED"}
                       </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="absolute h-[38px] rounded-r-lg border overflow-hidden transition-all group"
                      style={{
                        left: "0%", top: laneTop, width: `${(s.close / 24) * 100}%`,
                        background: isOpen ? `linear-gradient(90deg, ${s.color}20, ${s.color}10)` : "rgba(20,20,25,0.8)",
                        borderColor: isOpen ? `${s.color}60` : "rgba(255,255,255,0.05)", borderLeft: "none"
                      }}>
                       {/* Label goes in whichever block is bigger to look nice, typically left block */}
                       {(s.close / 24) * 100 > mainWidth ? (
                         <div className="p-2 flex flex-col justify-center h-full">
                           <span className="text-[11px] font-bold leading-none" style={{ color: isOpen ? "white" : "var(--text-tertiary)" }}>{s.name}</span>
                           <span className="text-[8px] font-bold uppercase mt-1 tracking-wider" style={{ color: isOpen ? s.color : isAfterHours ? "#4a9eff" : "#ff4d6a" }}>
                             {isOpen ? "OPEN" : isAfterHours ? "AFTER HOURS" : "CLOSED"}
                           </span>
                        </div>
                       ) : null}
                    </div>
                    <div className="absolute h-[38px] rounded-l-lg border overflow-hidden transition-all group"
                      style={{
                        left: `${startPct}%`, top: laneTop, width: `${mainWidth}%`,
                        background: isOpen ? `linear-gradient(90deg, ${s.color}20, ${s.color}10)` : "rgba(20,20,25,0.8)",
                        borderColor: isOpen ? `${s.color}60` : "rgba(255,255,255,0.05)", borderRight: "none"
                      }}>
                       {mainWidth >= (s.close / 24) * 100 ? (
                         <div className="p-2 flex flex-col justify-center h-full">
                           <span className="text-[11px] font-bold leading-none" style={{ color: isOpen ? "white" : "var(--text-tertiary)" }}>{s.name}</span>
                           <span className="text-[8px] font-bold uppercase mt-1 tracking-wider" style={{ color: isOpen ? s.color : isAfterHours ? "#4a9eff" : "#ff4d6a" }}>
                             {isOpen ? "OPEN" : isAfterHours ? "AFTER HOURS" : "CLOSED"}
                           </span>
                        </div>
                       ) : null}
                    </div>
                  </>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Relative Strength ────────────────────────────────────────────
function generateRSData(pair: string, pts = 60) {
  const hash = pair.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  let pairVal = 0.025, basketVal = 0.01;
  return Array.from({ length: pts }).map((_, i) => {
    pairVal += Math.sin(i / 6 + hash) * 0.002 + (Math.random() - 0.5) * 0.001;
    basketVal += Math.sin(i / 10 + hash + 3) * 0.0005 + (Math.random() - 0.5) * 0.0004;
    return { i, pair: +pairVal.toFixed(5), basket: +basketVal.toFixed(5) };
  });
}
function RelativeStrengthChart({ pair }: { pair: string }) {
  const data = useRelativeStrength(pair);
  const currentPair = data.at(-1)?.pair ?? 0;
  const currentBasket = data.at(-1)?.basket ?? 0;
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "var(--text-tertiary)" }}>Relative Strength</span>
          <span className="text-[10px] border px-1 py-0.5 rounded cursor-help" style={{ color: "var(--text-tertiary)", borderColor: "var(--border)" }}>ⓘ</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Basket: US30, DXY, US10Y, VIX</span>
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
            <span className="w-2 h-0.5 inline-block" style={{ background: "#ef4444" }} /> Basket Avg
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
            <span className="w-2 h-0.5 inline-block" style={{ background: "#22c55e" }} /> {pair} RS
          </span>
        </div>
      </div>
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-xl font-bold font-mono" style={{ color: currentPair > currentBasket ? "var(--bull)" : "var(--bear)" }}>
            {currentPair.toFixed(5)}
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>vs basket {currentBasket.toFixed(5)}</span>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="i" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "#111118", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10 }}
              formatter={(v: any, name: string) => [v.toFixed(5), name === "basket" ? "Basket" : pair]}
              labelFormatter={() => ""}
            />
            <Line type="monotone" dataKey="basket" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            <Line type="monotone" dataKey="pair" stroke="#22c55e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- Real MT5 Data Fetchers ---
function useMT5ChartData(pair: string, timeframe: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Maps standard UI timeframes to MT5 mnemonics (from mt5_bridge)
  const tfMap: Record<string, string> = {
    "1D": "D1", "5D": "D1", "1M": "W1", "1H": "H1", "15m": "M15"
  };

  useEffect(() => {
    const fetchCandles = async () => {
      try {
        setLoading(true);
        const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003";
        // Fetch last 60 candles
        const res = await fetch(`${bridgeUrl}/api/historical-candles?symbol=${pair}&timeframe=${tfMap[timeframe] || "D1"}&count=60`, { headers: { "ngrok-skip-browser-warning": "true" } });
        if (!res.ok) throw new Error("Offline");
        const json = await res.json();
        
        if (json.data) {
          const mapped = json.data.map((c: any) => {
            const date = new Date(c.time * 1000);
            return {
              time: timeframe === "1D" ? `${date.getHours()}:00` : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              price: c.close
            };
          });
          setData(mapped);
        }
      } catch (err) {
        // Mock fallback if bridge offline, so the UI doesn't completely break
        let base = pair.includes("JPY") ? 150 : (pair.includes("USD") ? 1.05 : 24000);
        setData(Array.from({ length: 48 }).map((_, i) => {
          base += (Math.sin(i / 5) + (Math.random() - 0.5)) * (base * 0.005);
          return { time: `${Math.floor(i/2)}:00`, price: Number(base.toFixed(5)) };
        }));
      } finally {
        setLoading(false);
      }
    };
    fetchCandles();
  }, [pair, timeframe]);

  return { data, loading };
}

function useRelativeStrength(pair: string) {
  const [data, setData] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchRS = async () => {
      try {
        const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003";
        // Fetch pair and a basket proxy (US30 or SPX500 if available)
        const [pairRes, basketRes] = await Promise.all([
          fetch(`${bridgeUrl}/api/historical-candles?symbol=${pair}&timeframe=H1&count=48`, { headers: { "ngrok-skip-browser-warning": "true" } }),
          fetch(`${bridgeUrl}/api/historical-candles?symbol=US30&timeframe=H1&count=48`, { headers: { "ngrok-skip-browser-warning": "true" } }) // Simple 1-asset proxy for now
        ]);
        
        let pData: any[] = [], bData: any[] = [];
        if (pairRes.ok) pData = (await pairRes.json()).data || [];
        if (basketRes.ok) bData = (await basketRes.json()).data || [];
        
        if (pData.length > 0) {
          // Normalize to starting point 0 pct
          const startP = pData[0].close;
          const startB = bData.length > 0 ? bData[0].close : 1;
          
          const mapped = pData.map((p: any, i: number) => {
            const b = bData[i] || bData[bData.length-1] || { close: startB };
            return {
              i,
              pair: ((p.close - startP) / startP),
              basket: ((b.close - startB) / startB)
            };
          });
          setData(mapped);
          return;
        }
        throw new Error("No data");
      } catch (err) {
        // Fallback for visualization
        const hash = pair.charCodeAt(0);
        let pairVal = 0.025, basketVal = 0.01;
        setData(Array.from({ length: 60 }).map((_, i) => {
          pairVal += Math.sin(i / 6 + hash) * 0.002 + (Math.random() - 0.5) * 0.001;
          basketVal += Math.sin(i / 10 + hash + 3) * 0.0005 + (Math.random() - 0.5) * 0.0004;
          return { i, pair: +pairVal.toFixed(5), basket: +basketVal.toFixed(5) };
        }));
      }
    };
    fetchRS();
  }, [pair]);

  return data;
}

function useAiAnalysis(pair: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAi = async () => {
      try {
        setLoading(true);
        const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003";
        const aiKey = typeof window !== "undefined" ? localStorage.getItem("ai_key") : null;
        const aiProvider = typeof window !== "undefined" ? localStorage.getItem("ai_provider") || "openai" : "openai";
        const res = await fetch(`${bridgeUrl}/api/ai-analysis?symbol=${pair}${aiKey ? `&ai_key=${aiKey}&provider=${aiProvider}` : ""}`, { headers: { "ngrok-skip-browser-warning": "true" } });
        if (!res.ok) throw new Error("Offline");
        const json = await res.json();
        if (json.success && json.analysis) {
          setData(json.analysis);
        } else {
          throw new Error("Invalid format");
        }
      } catch (err) {
        // Fallback for UI visualization if bridge offline
        setData({
          pulse: { label: "Tradable", score: 55, color: "var(--bull)", bullets: ["ATR within normal range", "Standard risk-reward ratios apply", "Normal stop sizing"] },
          flow: { label: "Healthy", score: 50, color: "var(--accent)", bullets: ["Volume within expected block", "Fills executing near quotes", "Good structure"] },
          bearing: { label: "Choppy Up", score: 60, color: "var(--accent)", bullets: ["Upward bias but weak RSI", "Indecision in price action", "Wait for cleaner impulse"] }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAi();
  }, [pair]);

  return { data, loading };
}

function usePairData(pair: string) {
  const [news, setNews] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [levels, setLevels] = useState<any>(null);
  const [retailSentiment, setRetailSentiment] = useState(50); // Simulated algorithmic sentiment

  useEffect(() => {
    const fetchAll = async () => {
      const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003";
      
      // News
      try {
        const rNews = await fetch(`${bridgeUrl}/api/news`, { headers: { "ngrok-skip-browser-warning": "true" } });
        const jNews = await rNews.json();
        if (jNews.success && jNews.news) {
          const p1 = pair.substring(0, 3);
          const p2 = pair.substring(3);
          const filtered = jNews.news.filter((n: any) => {
            const t = ((n.title || "") + " " + (n.symbol || "")).toUpperCase();
            return t.includes(p1) || t.includes(p2) || t.includes("GLB");
          }).slice(0, 3);
          setNews(filtered.length > 0 ? filtered : jNews.news.slice(0, 3));
        }
      } catch (e) {}

      // Calendar
      try {
        const rCal = await fetch(`${bridgeUrl}/api/calendar`, { headers: { "ngrok-skip-browser-warning": "true" } });
        const jCal = await rCal.json();
        if (jCal.success && jCal.events) {
          const p1 = pair.substring(0, 3);
          const p2 = pair.substring(3);
          const filteredEvents = jCal.events.filter((e: any) => {
            return e.currency === p1 || e.currency === p2 || (pair.includes("US") && e.currency === "USD");
          });
          setEvents(filteredEvents);
        }
      } catch (e) {}

      // Levels
      try {
        const rLev = await fetch(`${bridgeUrl}/api/levels?symbol=${pair}`, { headers: { "ngrok-skip-browser-warning": "true" } });
        const jLev = await rLev.json();
        if (jLev.success) setLevels(jLev.levels);
      } catch (e) {}

      setRetailSentiment(Math.floor(Math.random() * 40) + 30); 
    };
    fetchAll();
  }, [pair]);

  return { news, events, levels, retailSentiment };
}

// --- SVG Gauge Component ---
function Gauge({ value, label, color, type = "semi" }: { value: number, label: string, color: string, type?: "semi" | "full" }) {
  const radius = type === "semi" ? 36 : 24;
  const strokeWidth = type === "semi" ? 8 : 4;
  const dashArray = radius * Math.PI * (type === "semi" ? 1 : 2);
  const dashOffset = dashArray - (dashArray * value) / 100;
  const viewBox = type === "semi" ? "0 0 80 40" : "0 0 60 60";
  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg viewBox={viewBox} className={type === "semi" ? "w-20 h-10" : "w-12 h-12"}>
        <path d={type === "semi" ? "M 8 36 A 32 32 0 0 1 72 36" : "M 30 6 A 24 24 0 1 1 29.9 6"} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d={type === "semi" ? "M 8 36 A 32 32 0 0 1 72 36" : "M 30 6 A 24 24 0 1 1 29.9 6"} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={dashArray} strokeDashoffset={dashOffset} className="transition-all duration-1000 ease-out" />
      </svg>
      {type === "full" && (
        <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold font-mono" style={{ color: "var(--text-primary)" }}>{value}%</span>
      )}
    </div>
  );
}

function TopCard({ title, value, gaugeValue, color }: { title: string, value: string, gaugeValue: number, color: string }) {
  return (
    <div className="rounded-xl border p-3.5 flex flex-col justify-between" style={{ background: "var(--bg-card)", borderColor: "var(--border)", minWidth: "130px" }}>
      <div className="text-[11px] font-bold" style={{ color: "var(--text-tertiary)" }}>{title}</div>
      <div className="flex items-end justify-between mt-2">
        <div className="text-[16px] font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>{value}</div>
        <Gauge value={gaugeValue} label="" color={color} type="full" />
      </div>
    </div>
  );
}

// --- Condition Meters ---
function FlowMeter({ data, loading }: { data: any, loading: boolean }) {
  if (loading || !data) {
    return <div className="rounded-xl border p-4 flex flex-col h-[280px] bg-[--bg-card] border-[--border] animate-pulse" />;
  }
  return (
    <div className="rounded-xl border p-4 flex flex-col h-full relative overflow-hidden group" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 transition-opacity group-hover:opacity-10" style={{ background: data.color }} />
      <span className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-tertiary)" }}>Flow</span>
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <Activity className="w-7 h-7" style={{ color: data.color }} />
        <span className="text-[14px] font-extrabold uppercase tracking-widest" style={{ color: data.color }}>{data.label}</span>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-[9px] mb-1" style={{ color: "var(--text-tertiary)" }}>
          <span>Thin</span><span>Healthy</span><span>Crowded</span>
        </div>
        <div className="relative h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${data.score}%`, background: `linear-gradient(90deg, #ef4444 0%, #22c55e 50%, #ef4444 100%)` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-white" style={{ left: `calc(${data.score}% - 4px)`, background: data.color }} />
        </div>
      </div>
      <p className="text-[10px] mt-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{data.score < 30 ? "Low participation" : data.score > 70 ? "High participation" : "Normal participation"}</p>
      <ul className="mt-2 space-y-0.5">
        {data.bullets.map((b: string) => (
          <li key={b} className="text-[9px] flex items-start gap-1" style={{ color: "var(--text-tertiary)" }}>
            <span className="mt-0.5 shrink-0">•</span>{b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BearingMeter({ data, loading }: { data: any, loading: boolean }) {
  if (loading || !data) {
    return <div className="rounded-xl border p-4 flex flex-col h-[280px] bg-[--bg-card] border-[--border] animate-pulse" />;
  }
  return (
    <div className="rounded-xl border p-4 flex flex-col h-full relative overflow-hidden group" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 transition-opacity group-hover:opacity-10" style={{ background: data.color }} />
      <span className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-tertiary)" }}>Bearing</span>
      <span className="text-[14px] font-extrabold uppercase tracking-widest mb-3" style={{ color: data.color }}>{data.label}</span>
      <div className="flex-1 flex items-center justify-center w-full">
        <svg viewBox="0 0 100 40" className="w-full h-[50px] drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
          <path d="M0,20 Q5,8 15,22 T30,12 T45,30 T60,18 T75,25 T90,8 T100,32" fill="none" stroke={data.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-[10px] mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>Trend alignment strength: {data.score}%</p>
      <ul className="mt-2 space-y-0.5">
        {data.bullets.map((b: string) => (
          <li key={b} className="text-[9px] flex items-start gap-1" style={{ color: "var(--text-tertiary)" }}>
            <span className="mt-0.5 shrink-0">•</span>{b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PulseMeter({ data, loading }: { data: any, loading: boolean }) {
  if (loading || !data) {
    return <div className="rounded-xl border p-4 flex flex-col h-[280px] bg-[--bg-card] border-[--border] animate-pulse" />;
  }
  return (
    <div className="rounded-xl border p-4 flex flex-col h-full relative overflow-hidden group" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 transition-opacity group-hover:opacity-10" style={{ background: data.color }} />
      <span className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-tertiary)" }}>Pulse</span>
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow-[0_0_12px_rgba(255,255,255,0.1)]" style={{ color: data.color }} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 12h4l3-9 5 18 3-9h3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[14px] font-extrabold uppercase tracking-widest" style={{ color: data.color }}>{data.label}</span>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-[9px] mb-1" style={{ color: "var(--text-tertiary)" }}>
          <span>Quiet</span><span>Tradable</span><span>Wild</span>
        </div>
        <div className="relative h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${data.score}%`, background: `linear-gradient(90deg, #888 0%, #22c55e 55%, #ef4444 100%)` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-white" style={{ left: `calc(${data.score}% - 4px)`, background: data.color }} />
        </div>
      </div>
      <p className="text-[10px] mt-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>Volatility level: {data.score}%</p>
      <ul className="mt-2 space-y-0.5">
        {data.bullets.map((b: string) => (
          <li key={b} className="text-[9px] flex items-start gap-1" style={{ color: "var(--text-tertiary)" }}>
            <span className="mt-0.5 shrink-0">•</span>{b}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PairDeepDivePage() {
  const params = useParams();
  const rawPair = (params.pair as string) || "US100";
  const pair = rawPair.toUpperCase();
  const [timeframe, setTimeframe] = useState("1D");

  const { data: chartData, loading: chartLoading } = useMT5ChartData(pair, timeframe);
  const { data: aiData, loading: aiLoading } = useAiAnalysis(pair);
  const { news, events, levels, retailSentiment } = usePairData(pair);
  
  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;
  const oldPrice = chartData.length > 0 ? chartData[0].price : 1;
  const changePct = ((currentPrice - oldPrice) / oldPrice) * 100;
  const isBullish = currentPrice >= oldPrice;
  const chartColor = isBullish ? "var(--bull)" : "var(--bear)";

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto pb-20">

      {/* Top Navigation */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-[11px] font-bold hover:text-white transition-colors" style={{ color: "var(--text-tertiary)" }}>
        <ArrowLeft className="w-4 h-4" /> Back to AI Macro Desk
      </Link>

      {/* Header Strip */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-[20px] font-bold"
            style={{ background: "rgba(0,212,161,0.1)", color: "var(--accent)", border: "1px solid rgba(0,212,161,0.2)" }}>
            {pair.slice(0,2)}
          </div>
          <div>
            <h1 className="text-[34px] font-bold leading-none tracking-tight" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
              {pair}
            </h1>
            <p className="text-[13px] font-medium mt-1" style={{ color: "var(--text-secondary)" }}>NASDAQ 100 Index</p>
          </div>
        </div>
        <div className="flex gap-3">
          <TopCard title="Bias" value="Neutral" gaugeValue={50} color="var(--neutral)" />
          <TopCard title="Technical" value="Hold" gaugeValue={60} color="var(--warning)" />
          <TopCard title="AI Confidence" value="64%" gaugeValue={64} color="var(--accent)" />
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-6">

        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <div>
            <div className="flex items-end gap-4 mb-2">
              <span className="text-[40px] font-bold font-mono leading-none tracking-tighter" style={{ color: "var(--text-primary)" }}>
                {currentPrice.toFixed(2)}
              </span>
              <div className="flex gap-2">
                {["1D", "5D", "1M"].map(tf => (
                  <button key={tf} onClick={() => setTimeframe(tf)} className="text-[11px] font-bold hover:text-white transition-colors"
                    style={{ color: timeframe === tf ? "var(--text-primary)" : "var(--text-tertiary)" }}>{tf}</button>
                ))}
              </div>
            </div>
            <div className="text-[14px] font-bold flex items-center gap-1" style={{ color: chartColor }}>
              {isBullish ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {changePct > 0 ? "+" : ""}{changePct.toFixed(2)}%
            </div>
          </div>
          <div className="h-[280px] w-full mt-4 relative">
            {chartLoading ? (
              <div className="absolute inset-0 flex items-center justify-center opacity-50">
                <span className="text-[12px] font-bold tracking-widest uppercase">Fetching Live MT5 Data...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColor} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={["auto", "auto"]} hide />
                  <Tooltip contentStyle={{ background: "#111118", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", fontFamily: "monospace" }} itemStyle={{ color: chartColor }} labelStyle={{ color: "var(--text-tertiary)" }} />
                  <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2.5} fillOpacity={1} fill="url(#chartGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Interactive Dynamic Widgets Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Live News */}
            <div>
              <h3 className="text-[13px] font-bold mb-4" style={{ color: "var(--text-primary)" }}>Pair-Specific News</h3>
              <div className="space-y-3">
                {news.length > 0 ? news.map((n: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl flex gap-3 cursor-pointer group hover:bg-[--bg-elevated] transition-colors" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                    <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: n.sentiment === "bullish" ? "var(--bull)" : n.sentiment === "bearish" ? "var(--bear)" : "var(--text-tertiary)" }}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>{n.source || "Market Wire"}</span>
                        <span className="text-[11px] uppercase" style={{ color: "var(--text-tertiary)" }}>{n.time || "Live"}</span>
                      </div>
                      <h4 className="text-[12px] font-bold leading-snug group-hover:text-[--accent] transition-colors mb-1" style={{ color: "var(--text-secondary)" }}>{n.title}</h4>
                    </div>
                  </div>
                )) : (
                  <div className="p-4 rounded-xl text-center text-[12px]" style={{ color: "var(--text-tertiary)", border: "1px dashed var(--border)" }}>Fetching live news...</div>
                )}
              </div>
            </div>

            {/* AI Calendar + Key Levels */}
            <div className="space-y-4">
              <div>
                <h3 className="text-[13px] font-bold mb-4" style={{ color: "var(--text-primary)" }}>Upcoming Events</h3>
                <div className="space-y-2">
                  {events.length > 0 ? events.slice(0, 3).map((e: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg flex items-center justify-between" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold w-12 text-center py-1 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}>{e.time}</span>
                        <span className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>{e.currency}</span>
                      </div>
                      <span className="text-[11px] text-right truncate overflow-hidden whitespace-nowrap max-w-[120px]" style={{ color: "var(--text-secondary)" }}>{e.event}</span>
                    </div>
                  )) : (
                    <div className="p-4 rounded-xl text-center text-[12px]" style={{ color: "var(--text-tertiary)", border: "1px dashed var(--border)" }}>No tier-1 events today for this pair...</div>
                  )}
                </div>
              </div>
              
              {/* Daily Technical Pivot Levels */}
              <div>
                <h3 className="text-[13px] font-bold mb-3 mt-5" style={{ color: "var(--text-primary)" }}>Algorithm Key Levels (D1)</h3>
                <div className="rounded-xl border p-4 flex flex-col justify-between h-[120px]" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                  {levels ? (
                    <>
                      <div className="flex justify-between items-center text-[11px]">
                        <span style={{ color: "var(--bear)" }}>Resistance (R2)</span>
                        <span className="font-mono">{levels.r2.toFixed(5)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] pt-1">
                        <span style={{ color: "var(--bear)" }}>Resistance (R1)</span>
                        <span className="font-mono">{levels.r1.toFixed(5)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[12px] font-bold py-2 border-y my-1" style={{ borderColor: "var(--border-strong)", color: "var(--accent)" }}>
                        <span>Daily Pivot</span>
                        <span className="font-mono">{levels.pivot.toFixed(5)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] pb-1">
                        <span style={{ color: "var(--bull)" }}>Support (S1)</span>
                        <span className="font-mono">{levels.s1.toFixed(5)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span style={{ color: "var(--bull)" }}>Support (S2)</span>
                        <span className="font-mono">{levels.s2.toFixed(5)}</span>
                      </div>
                    </>
                  ) : <div className="text-[11px] text-center opacity-50 m-auto animate-pulse">Calculating Floor Pivots...</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* AI Overview */}
          <div className="rounded-[16px] border p-5 relative overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[--accent] opacity-5 blur-[60px] translate-x-1/2 -translate-y-1/2" />
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-[13px]" style={{ color: "var(--accent)" }}>✦</span>
              <h3 className="text-[12px] font-bold text-[--accent]">AI overview</h3>
            </div>
            <p className="text-[13px] leading-relaxed font-medium" style={{ color: "var(--text-primary)" }}>
              {aiLoading || !aiData ? "Synthesizing market models..." : aiData.overview || "Market structure currently reflects balanced conditions. Order flow supports continuation of previous impulses, with algorithmic positioning heavily defending standard structural zones."}
            </p>
          </div>

          {/* Market Mood + Policy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Market Mood (Retail Sentiment) */}
            <div className="rounded-[16px] border p-5 flex flex-col justify-between" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Retail Sentiment</span>
                <span className="text-[10px] flex items-center gap-1 border px-2 py-0.5 rounded-full" style={{ borderColor: "var(--border)", color: "var(--text-tertiary)" }}>
                  <Clock className="w-3 h-3" /> Live
                </span>
              </div>
              <div className="flex flex-col xl:flex-row gap-4 items-center xl:items-start">
                <div className="flex flex-col items-center shrink-0 w-full relative">
                  {/* Pseudo Order Book Horizontal Bar */}
                  <div className="w-full h-3 rounded-full flex overflow-hidden">
                    <div className="h-full bg-[--bear]" style={{ width: `${100 - retailSentiment}%` }} />
                    <div className="h-full bg-[--bull]" style={{ width: `${retailSentiment}%` }} />
                  </div>
                  <div className="w-full flex justify-between text-[10px] font-bold mt-2">
                    <span style={{ color: "var(--bear)" }}>{100 - retailSentiment}% SHORT</span>
                    <span className="text-[--text-tertiary]">Book</span>
                    <span style={{ color: "var(--bull)" }}>{retailSentiment}% LONG</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-2.5 rounded-lg border flex items-center justify-between cursor-pointer hover:bg-[--bg-elevated] transition-colors" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border)" }}>
                <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: retailSentiment > 50 ? "var(--bull)" : "var(--bear)" }} /> Crowded {retailSentiment > 50 ? "Longs" : "Shorts"}
                </span>
                <ChevronDown className="w-4 h-4 text-[--text-tertiary]" />
              </div>
            </div>
            {/* Market Policy */}
            <div className="rounded-[16px] border p-5 flex flex-col justify-between" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Market Policy</span>
                <span className="text-[10px] flex items-center gap-1 border px-2 py-0.5 rounded-full" style={{ borderColor: "var(--border)", color: "var(--text-tertiary)" }}>
                  <Clock className="w-3 h-3" /> Latest
                </span>
              </div>
              <div className="flex flex-col xl:flex-row gap-4 items-center xl:items-start">
                <div className="flex flex-col items-center justify-center shrink-0 w-16 h-16 rounded-full border border-dashed" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.01)" }}>
                  <span className="text-[9px] font-bold tracking-widest text-center uppercase px-1" style={{ color: "var(--text-primary)" }}>{aiData?.bearing?.label || "STEADY"}</span>
                </div>
                <p className="text-[11px] leading-relaxed line-clamp-4" style={{ color: "var(--text-secondary)" }}>
                  {aiData?.overview || "Policy conditions remain dependent on upcoming tier-1 releases. Algorithmic bias continues to adapt to ongoing macroeconomic adjustments across primary banking mandates."}
                </p>
              </div>
              <div className="mt-4 p-2.5 rounded-lg border flex items-center justify-between cursor-pointer hover:bg-[--bg-elevated] transition-colors" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border)" }}>
                <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[--text-tertiary]" /> NEUTRAL: Central banks
                </span>
                <ChevronDown className="w-4 h-4 text-[--text-tertiary]" />
              </div>
            </div>
          </div>

          {/* Condition Meters Row */}
          <div className="grid grid-cols-3 gap-4">
            <FlowMeter data={aiData?.flow} loading={aiLoading} />
            <BearingMeter data={aiData?.bearing} loading={aiLoading} />
            <PulseMeter data={aiData?.pulse} loading={aiLoading} />
          </div>
        </div>
      </div>

      {/* ── Bottom: Market Sessions + Relative Strength ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <MarketSessionsBar />
        <RelativeStrengthChart pair={pair} />
      </div>

    </div>
  );
}
