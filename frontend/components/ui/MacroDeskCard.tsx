"use client";
import React, { useState } from "react";
import { Settings, RefreshCw, ChevronDown } from "lucide-react";
import Link from "next/link";

type Bias = "BULLISH" | "BEARISH" | "NEUTRAL";

interface PairCard {
  pair: string;
  fullName: string;
  change: string;
  bias: Bias;
  confidence: number;
  lastUpdate: string;
  analysis: string;
  bullets: string[];
}

const PAIR_NAMES: Record<string, string> = {
  "EUR/USD": "Euro / US Dollar",
  "GBP/JPY": "British Pound / Yen",
  "XAU/USD": "Gold / US Dollar",
  "USD/JPY": "US Dollar / Yen",
  "GBP/USD": "British Pound / US Dollar",
  "US30": "Dow Jones",
  "US100": "Nasdaq 100"
};

const FALLBACK_PAIRS: PairCard[] = [
  {
    pair: "XAUUSD", fullName: "Gold / US Dollar", change: "−0.86%", bias: "NEUTRAL",
    confidence: 64,
    lastUpdate: "Offline fallback",
    analysis: "MT5 Bridge Offline. Please start the python backend. Gold is consolidating near key resistance at $2,320.",
    bullets: ["Bridge Offline", "Resistance: $2,320", "Support: $2,290"],
  },
  {
    pair: "GBPUSD", fullName: "British Pound / US Dollar", change: "+0.12%", bias: "BULLISH",
    confidence: 71,
    lastUpdate: "Offline fallback",
    analysis: "MT5 Bridge Offline. Cable is showing bullish momentum above the 1.2700 level.",
    bullets: ["Bridge Offline", "Target: 1.2780", "Key risk: US PCE data"],
  }
];

function ConfidenceBar({ value, delay = 0 }: { value: number; delay?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--text-tertiary)" }}>
        Confidence
      </span>
      <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${value}%`,
            background: "var(--accent)",
            transitionDelay: `${delay}ms`,
          }}
        />
      </div>
      <span className="text-[11px] font-bold font-mono" style={{ color: "var(--accent)" }}>
        {value}%
      </span>
    </div>
  );
}

export function MacroDeskCard({ data, delay = 0 }: { data: PairCard; delay?: number }) {
  const [expanded, setExpanded] = useState(false);

  const biasColor = data.bias === "BULLISH" ? "var(--bull)" : data.bias === "BEARISH" ? "var(--bear)" : "var(--neutral)";
  const biasBg = data.bias === "BULLISH" ? "rgba(0,200,150,0.1)" : data.bias === "BEARISH" ? "rgba(255,77,106,0.1)" : "rgba(160,160,184,0.1)";
  const biasBorder = data.bias === "BULLISH" ? "rgba(0,200,150,0.25)" : data.bias === "BEARISH" ? "rgba(255,77,106,0.25)" : "rgba(160,160,184,0.25)";
  const leftBorder = data.bias === "BULLISH" ? "var(--bull)" : data.bias === "BEARISH" ? "var(--bear)" : "var(--neutral)";
  const changeColor = data.change.startsWith("+") ? "var(--bull)" : "var(--bear)";

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3 hover:border-[--border-strong] transition-all"
      style={{
        background: "linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 100%)",
        borderColor: "var(--border)",
        borderLeft: `2px solid ${leftBorder}`,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[17px] font-bold" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
            {data.pair}
          </span>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{data.fullName}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold font-mono" style={{ color: changeColor }}>{data.change}</span>
          <span
            className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border"
            style={{ color: biasColor, background: biasBg, borderColor: biasColor + "30" }}
          >
            {data.bias}
          </span>
        </div>
      </div>

      {/* Confidence */}
      <ConfidenceBar value={data.confidence} delay={delay} />

      {/* Last update */}
      <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
        ↻ Last update: {data.lastUpdate}
      </div>

      {/* AI Analysis */}
      <div className="flex gap-2.5 pl-2" style={{ borderLeft: "2px solid var(--accent)" }}>
        <div>
          <div className="text-[10px] font-bold mb-1" style={{ color: "var(--accent)" }}>✦ AI Analysis</div>
          <p
            className={`text-[12px] leading-relaxed ${!expanded ? "line-clamp-3" : ""}`}
            style={{ color: "var(--text-secondary)" }}
          >
            {data.analysis}
          </p>
        </div>
      </div>

      {/* Quick overview bullets */}
      {expanded && (
        <div className="space-y-1">
          {data.bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--accent)" }}>•</span>
              <span>{b}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[11px] font-bold transition-colors hover:bg-[--bg-elevated]"
          style={{ borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          Quick Overview
        </button>
        <Link
          href={`/macro/${data.pair}`}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-90"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          Deep Dive →
        </Link>
      </div>
    </div>
  );
}

export function AIMacroDeskSection() {
  const [pairs, setPairs] = useState<PairCard[]>(FALLBACK_PAIRS);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchTechnicals = async () => {
      try {
        const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL ?? "http://localhost:5003";
        const aiKey = localStorage.getItem("ai_key");
        const aiProvider = localStorage.getItem("ai_provider") || "openai";
        const url = `${BRIDGE}/api/technicals${aiKey ? `?ai_key=${aiKey}&provider=${aiProvider}` : ""}`;
        const res = await fetch(url, { headers: { "ngrok-skip-browser-warning": "true" } });
        const json = await res.json();
        
        if (json.success && json.signals) {
          const mapped: PairCard[] = json.signals.map((sig: any) => ({
            pair: sig.pair.replace("/", ""),
            fullName: PAIR_NAMES[sig.pair] || sig.pair,
            change: `${sig.change > 0 ? '+' : ''}${sig.change}%`,
            bias: sig.signal === "buy" ? "BULLISH" : sig.signal === "sell" ? "BEARISH" : "NEUTRAL",
            confidence: sig.strength,
            lastUpdate: "Live MT5",
            analysis: `MT5 Engine Analysis: ${sig.reason}. Current market conditions favor the ${sig.signal} side based on H4 timeframe convergence.`,
            bullets: [
              `RSI (14): ${sig.rsi.toFixed(1)}`,
              `EMA (20): ${sig.ema20.toFixed(5)}`,
              `EMA (50): ${sig.ema50.toFixed(5)}`
            ]
          }));
          setPairs(mapped);
        } else {
          setPairs(FALLBACK_PAIRS);
        }
      } catch (err) {
        setPairs(FALLBACK_PAIRS);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTechnicals();
    const interval = setInterval(fetchTechnicals, 60000); // 1 min refresh
    return () => clearInterval(interval);
  }, []);

  // Compute overall status easily
  const bullCount = pairs.filter(p => p.bias === "BULLISH").length;
  const bearCount = pairs.filter(p => p.bias === "BEARISH").length;
  const overallBias = bullCount > bearCount ? "BULLISH" : bearCount > bullCount ? "BEARISH" : "NEUTRAL";
  const overallConf = pairs.length > 0 ? Math.round(pairs.reduce((a, b) => a + b.confidence, 0) / pairs.length) : 50;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[20px]">✦</span>
            <div>
              <h2 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
                AI Macro Desk
              </h2>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Live MT5 technical analysis</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold animate-pulse" style={{ background: "rgba(160,160,184,0.12)", color: "var(--text-tertiary)", border: "1px solid rgba(160,160,184,0.2)" }}>Syncing MT5...</span>
          ) : (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-bold"
              style={{ 
                background: overallBias === "BULLISH" ? "rgba(0,200,150,0.12)" : overallBias === "BEARISH" ? "rgba(255,77,106,0.12)" : "rgba(160,160,184,0.12)", 
                color: overallBias === "BULLISH" ? "var(--bull)" : overallBias === "BEARISH" ? "var(--bear)" : "var(--neutral)",
                border: `1px solid ${overallBias === "BULLISH" ? "rgba(0,200,150,0.25)" : overallBias === "BEARISH" ? "rgba(255,77,106,0.25)" : "rgba(160,160,184,0.25)"}`
              }}
            >
              Overall: {overallBias} · {overallConf}%
            </span>
          )}
          <Settings className="w-3.5 h-3.5 cursor-pointer" style={{ color: "var(--text-tertiary)" }} />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && pairs.length === 0 ? (
          // Skeleton placeholder cards
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              {/* Header skeleton */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl" style={{ background: "var(--bg-elevated)" }} />
                  <div>
                    <div className="w-16 h-4 rounded mb-1" style={{ background: "var(--bg-elevated)" }} />
                    <div className="w-24 h-3 rounded" style={{ background: "var(--border-strong)" }} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-12 h-4 rounded mb-1 ml-auto" style={{ background: "var(--bg-elevated)" }} />
                  <div className="w-10 h-3 rounded ml-auto" style={{ background: "var(--border-strong)" }} />
                </div>
              </div>
              {/* Ring skeleton */}
              <div className="flex justify-center my-3">
                <div className="w-20 h-20 rounded-full" style={{ background: "var(--bg-elevated)" }} />
              </div>
              {/* Bullets skeleton */}
              <div className="space-y-1.5 mt-3">
                <div className="w-full h-3 rounded" style={{ background: "var(--bg-elevated)" }} />
                <div className="w-4/5 h-3 rounded" style={{ background: "var(--bg-elevated)" }} />
                <div className="w-3/5 h-3 rounded" style={{ background: "var(--bg-elevated)" }} />
              </div>
              {/* Action buttons skeleton */}
              <div className="flex gap-2 mt-3">
                <div className="flex-1 h-7 rounded-lg" style={{ background: "var(--bg-elevated)" }} />
                <div className="flex-1 h-7 rounded-lg" style={{ background: "var(--accent-dim)" }} />
              </div>
            </div>
          ))
        ) : !loading && pairs.length === 0 ? (
          // Empty state — MT5 not returning symbol data
          <div className="col-span-3 flex flex-col items-center justify-center gap-4 py-12 rounded-2xl border border-dashed" style={{ borderColor: "var(--border-strong)", background: "var(--bg-card)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ background: "var(--bg-elevated)" }}>📡</div>
            <div className="text-center max-w-sm">
              <p className="font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>No Market Data from MT5</p>
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                The AI Macro Desk needs live candle data from your MT5 terminal. Make sure MetaTrader 5 is open, logged in, and the following symbols are in the <strong>Market Watch</strong>:
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                {["EURUSD", "XAUUSD", "GBPUSD", "USDJPY", "GBPJPY"].map(s => (
                  <span key={s} className="px-2 py-0.5 rounded font-mono text-[11px] font-bold" style={{ background: "var(--bg-elevated)", color: "var(--accent)", border: "1px solid var(--border-strong)" }}>{s}</span>
                ))}
              </div>
              <p className="text-[10px] mt-3" style={{ color: "var(--text-tertiary)" }}>In MT5: View → Market Watch → right-click → Show All</p>
            </div>
          </div>
        ) : (
          pairs.map((p, i) => (
            <MacroDeskCard key={p.pair} data={p} delay={i * 100} />
          ))
        )}
      </div>
    </div>
  );
}
