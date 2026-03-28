"use client";
import React from "react";

interface MeterProps {
  type: "flow" | "bearing" | "pulse";
}

// Shared slider component
function SliderZone({
  zones,
  position, // 0-1
}: {
  zones: { label: string; color: string }[];
  position: number;
}) {
  const pct = Math.max(0, Math.min(1, position)) * 100;

  return (
    <div className="mt-3">
      {/* Track */}
      <div className="relative h-2 rounded-full overflow-hidden flex">
        {zones.map((z, i) => (
          <div key={i} className="flex-1 h-full" style={{ background: z.color + "60" }} />
        ))}
        {/* Indicator dot */}
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-white"
          style={{
            left: `${pct}%`,
            transform: "translate(-50%, -50%)",
            background: pct < 33 ? "#ff4d6a" : pct < 66 ? "#00c896" : "#ff4d6a",
            boxShadow: "0 0 6px rgba(255,255,255,0.4)",
          }}
        />
      </div>
      {/* Zone labels */}
      <div className="flex mt-1">
        {zones.map((z, i) => (
          <div key={i} className="flex-1 text-center text-[8px] font-bold uppercase" style={{ color: "var(--text-tertiary)" }}>
            {z.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Mini sparkline SVG for Bearing card
function Sparkline({ type }: { type: "choppy" | "bullish" | "bearish" | "ranging" }) {
  const points: Record<string, [number, number][]> = {
    choppy: [[0,40],[10,20],[20,50],[30,15],[40,45],[50,30],[60,55],[70,25],[80,60],[90,35],[100,50]],
    bullish: [[0,60],[20,50],[40,40],[60,30],[80,20],[100,10]],
    bearish: [[0,10],[20,20],[40,30],[60,40],[80,50],[100,60]],
    ranging: [[0,35],[15,25],[30,35],[45,25],[60,35],[75,25],[90,35],[100,30]],
  };

  const pts = points[type] ?? points.choppy;
  const svgPts = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const color = type === "bullish" ? "#00c896" : type === "bearish" ? "#ff4d6a" : type === "ranging" ? "#a0a0b8" : "#ff4d6a";

  return (
    <svg viewBox="0 0 100 70" className="w-full mt-3" style={{ height: 60 }} preserveAspectRatio="none">
      <polyline points={svgPts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

const CONFIGS = {
  flow: {
    title: "Flow",
    status: "HEALTHY",
    statusColor: "var(--bull)",
    description: "Normal participation — tape is well-structured",
    bullets: [
      "Volume within the expected range",
      "Fills should execute at quoted prices",
      "Flow conditions support standard position sizing",
    ],
    sliderPos: 0.5,
    zones: [
      { label: "Thin", color: "#ff4d6a" },
      { label: "Healthy", color: "#00c896" },
      { label: "Crowded", color: "#ff4d6a" },
    ],
  },
  bearing: {
    title: "Bearing",
    status: "CHOPPY DOWN",
    statusColor: "var(--bear)",
    description: "Price structure erratic with downward bias",
    bullets: [
      "Trend structure is not well-defined",
      "Avoid breakout entries — risk of fakeout",
      "Reduce position sizing until clarity returns",
    ],
    sparklineType: "choppy" as const,
  },
  pulse: {
    title: "Pulse",
    status: "TRADABLE",
    statusColor: "var(--accent)",
    description: "Volatility within tradable range — ATR normal",
    bullets: [
      "ATR aligns with recent session averages",
      "Spreads are tight, conditions favorable",
      "Pulse supports standard risk parameters",
    ],
    sliderPos: 0.45,
    zones: [
      { label: "Quiet", color: "#4a9eff" },
      { label: "Tradable", color: "#00c896" },
      { label: "Wild", color: "#ff4d6a" },
    ],
  },
};

export function ConditionMeter({ type, symbol = "XAUUSDm" }: MeterProps & { symbol?: string }) {
  const [liveData, setLiveData] = React.useState<any>(null);

  React.useEffect(() => {
    let active = true;
    const fetchAi = async () => {
      try {
        const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL ?? "http://localhost:5003";
        const aiKey = localStorage.getItem("ai_key");
        const aiProvider = localStorage.getItem("ai_provider") || "openai";
        const res = await fetch(`${BRIDGE}/api/ai-analysis?symbol=${symbol}${aiKey ? `&ai_key=${aiKey}&provider=${aiProvider}` : ""}`);
        if (res.ok && active) {
          const json = await res.json();
          if (json.success && json.analysis && json.analysis[type]) {
            setLiveData(json.analysis[type]);
          }
        }
      } catch (err) {}
    };
    
    fetchAi();
    const interval = setInterval(fetchAi, 60000); // 1 min refresh
    return () => { active = false; clearInterval(interval); };
  }, [type, symbol]);

  const baseCfg = CONFIGS[type];
  
  // Merge live data with base config
  const status = liveData?.label || baseCfg.status;
  const statusColor = liveData?.color || baseCfg.statusColor;
  const bullets = liveData?.bullets || baseCfg.bullets;
  const sliderPos = liveData?.score !== undefined ? liveData.score / 100 : ("sliderPos" in baseCfg ? baseCfg.sliderPos : 0.5);

  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-3 animate-fade-up relative overflow-hidden"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
          {baseCfg.title}
        </div>
        {liveData && (
          <div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ color: statusColor, background: statusColor }} title="Live MT5 AI Data Active"></div>
        )}
      </div>

      {/* Status */}
      <div
        className="text-[26px] font-bold leading-none truncate"
        style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: statusColor }}
      >
        {status}
      </div>

      {/* Slider (Flow & Pulse) or Sparkline (Bearing) */}
      {type === "bearing" ? (
        <Sparkline type={status.toLowerCase().includes("bullish") ? "bullish" : status.toLowerCase().includes("bearish") ? "bearish" : status.toLowerCase().includes("ranging") ? "ranging" : "choppy"} />
      ) : (
        <SliderZone zones={(baseCfg as any).zones || []} position={sliderPos} />
      )}

      {/* Description */}
      <p className="text-[12px] leading-relaxed mt-1" style={{ color: "var(--text-secondary)" }}>
        {liveData ? `${baseCfg.title} analysis actively monitoring MT5 data streams.` : baseCfg.description}
      </p>

      {/* Bullets */}
      <div className="space-y-1">
        {bullets.map((b: string, i: number) => (
          <div key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: statusColor }}>•</span>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
