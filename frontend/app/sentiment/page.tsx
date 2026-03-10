"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Wifi,
  WifiOff,
  Activity,
  Zap,
  Globe,
  BarChart3,
  Brain,
  AlertTriangle,
} from "lucide-react";

const BRIDGE = "";

/* ─── Types ─────────────────────────────────────────────── */
interface FGPoint {
  date: string;
  value: number;
  label: string;
}
interface FGNow {
  date: string;
  value: number;
  label: string;
}
interface CStrength {
  currency: string;
  score: number;
}
interface NewsSent {
  symbol: string;
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
}

interface SentimentData {
  fearGreed: FGPoint[];
  fearGreedNow: FGNow | null;
  currencyStrength: CStrength[];
  newsSentiment: NewsSent[];
}

/* ─── Helpers ────────────────────────────────────────────── */
function fgColor(v: number) {
  if (v >= 75) return "#22c55e";
  if (v >= 55) return "#86efac";
  if (v >= 45) return "#eab308";
  if (v >= 25) return "#f97316";
  return "#ef4444";
}
function fgLabel(v: number) {
  if (v >= 75) return "Extreme Greed";
  if (v >= 55) return "Greed";
  if (v >= 45) return "Neutral";
  if (v >= 25) return "Fear";
  return "Extreme Fear";
}

const CURRENCY_COLORS: Record<string, string> = {
  USD: "#60a5fa",
  EUR: "#a78bfa",
  GBP: "#34d399",
  JPY: "#fbbf24",
  CHF: "#f87171",
  AUD: "#38bdf8",
  NZD: "#818cf8",
  CAD: "#fb923c",
};

/* ─── Custom tooltip for F&G chart ─────────────────────── */
function FGTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value as number;
  return (
    <div className="bg-[#0f0f0f] border border-border rounded-xl p-3 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-lg" style={{ color: fgColor(v) }}>
        {v}
      </p>
      <p style={{ color: fgColor(v) }}>{fgLabel(v)}</p>
    </div>
  );
}
/* ─── Custom tooltip for news sentiment ─────────────────── */
function NewsSentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f0f0f] border border-border rounded-xl p-3 text-xs space-y-1">
      <p className="text-muted-foreground font-bold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p
          key={p.name}
          style={{ color: p.fill }}
          className="flex items-center gap-2"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.fill }}
          />
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function SentimentPage() {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPoll, setLastPoll] = useState<string | null>(null);
  const [bridgeOn, setBridgeOn] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BRIDGE}/api/sentiment`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        setBridgeOn(true);
        setLastPoll(new Date().toLocaleTimeString());
        setError(null);
      } else {
        throw new Error("API returned failure");
      }
    } catch (e: any) {
      setBridgeOn(false);
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 120_000); // refresh every 2 min
    return () => clearInterval(id);
  }, [fetchData]);

  const fg = data?.fearGreedNow;
  const fgValue = fg?.value ?? 0;
  const fgAngle = (fgValue / 100) * 180 - 90; // gauge needle angle

  /* ─── LOADING / ERROR ──────────────────────────────────── */
  if (!data && loading)
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-gray-700">
        <Activity className="w-10 h-10 animate-pulse text-purple-500/30" />
        <p className="text-sm">Fetching sentiment data…</p>
        <p className="text-xs text-gray-800">
          Fear &amp; Greed API · MT5 currency strength · RSS news sentiment
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 space-y-6 relative">
      {/* Ambient glow */}
      <div className="fixed top-0 left-[20%] w-[60%] h-[250px] bg-violet-900/6 blur-[160px] rounded-full pointer-events-none z-0" />

      {/* ── Header ──────────────────────────────────────── */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-violet-400" /> Market Sentiment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Fear &amp; Greed (alternative.me) · Currency Strength (MT5 live) ·
            News Sentiment (RSS) · refreshes every 2 min
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border
            ${bridgeOn ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-red-500/30 text-red-400 bg-red-500/10"}`}
          >
            {bridgeOn ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {bridgeOn ? `Live · ${lastPoll}` : "Bridge offline"}
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:border-border/50 text-muted-foreground hover:text-foreground transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
        </div>
      </div>

      {!bridgeOn && error && (
        <div className="relative z-10 bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Bridge offline — run{" "}
          <code className="bg-background hover:bg-muted text-foreground px-1.5 py-0.5 rounded">
            python mt5_bridge.py
          </code>{" "}
          in{" "}
          <code className="bg-background hover:bg-muted text-foreground px-1.5 py-0.5 rounded">
            d:\Forex\dashboardkiller
          </code>
        </div>
      )}

      {/* ── Top stats row ───────────────────────────────── */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Fear & Greed",
            value: fg ? `${fgValue} · ${fgLabel(fgValue)}` : "—",
            Icon: Brain,
            color: fg ? fgColor(fgValue) : "#6b7280",
          },
          {
            label: "Strongest",
            value: data?.currencyStrength?.[0]?.currency ?? "—",
            Icon: TrendingUp,
            color: "#22c55e",
          },
          {
            label: "Weakest",
            value: data?.currencyStrength?.slice(-1)[0]?.currency ?? "—",
            Icon: TrendingDown,
            color: "#ef4444",
          },
          {
            label: "News Sources",
            value: `${data?.newsSentiment?.length ?? 0} pairs tracked`,
            Icon: Globe,
            color: "#a78bfa",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[#0b0b0b] border border-border rounded-xl p-4 flex items-center gap-3"
          >
            <s.Icon className="w-5 h-5 shrink-0" style={{ color: s.color }} />
            <div>
              <p className="text-sm font-bold text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Fear & Greed gauge + 30-day chart ──────────── */}
      <div className="relative z-10 grid md:grid-cols-[260px_1fr] gap-5">
        {/* Gauge card */}
        <div className="bg-[#0b0b0b] border border-border rounded-2xl p-6 flex flex-col items-center justify-center">
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">
            Fear &amp; Greed Index
          </p>
          {/* SVG Gauge */}
          <svg viewBox="0 0 200 120" className="w-full max-w-[220px]">
            {/* Background arcs */}
            {[
              { color: "#7f1d1d", d: "M 20 100 A 80 80 0 0 1 44 44" },
              { color: "#92400e", d: "M 44 44 A 80 80 0 0 1 100 20" },
              { color: "#713f12", d: "M 100 20 A 80 80 0 0 1 156 44" },
              { color: "#14532d", d: "M 156 44 A 80 80 0 0 1 180 100" },
            ].map((arc, i) => (
              <path
                key={i}
                d={arc.d}
                stroke={arc.color}
                strokeWidth="16"
                fill="none"
                strokeLinecap="round"
                opacity="0.7"
              />
            ))}
            {/* Labels */}
            <text x="12" y="115" fontSize="8" fill="#6b7280">
              Extreme Fear
            </text>
            <text x="140" y="115" fontSize="8" fill="#6b7280">
              Extreme Greed
            </text>
            {/* Needle */}
            <g transform={`rotate(${fgAngle}, 100, 100)`}>
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="28"
                stroke={fgColor(fgValue)}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="5" fill={fgColor(fgValue)} />
            </g>
            {/* Value */}
            <text
              x="100"
              y="95"
              textAnchor="middle"
              fontSize="26"
              fontWeight="bold"
              fill={fgColor(fgValue)}
            >
              {fgValue}
            </text>
          </svg>
          <p
            className="text-sm font-bold mt-1"
            style={{ color: fgColor(fgValue) }}
          >
            {fgLabel(fgValue)}
          </p>
          <p className="text-[11px] text-gray-600 mt-1">Updated {fg?.date}</p>
          {/* Zone legend */}
          <div className="mt-4 w-full space-y-1">
            {[
              { range: "0–24", label: "Extreme Fear", c: "#ef4444" },
              { range: "25–44", label: "Fear", c: "#f97316" },
              { range: "45–55", label: "Neutral", c: "#eab308" },
              { range: "56–74", label: "Greed", c: "#86efac" },
              { range: "75–100", label: "Extreme Greed", c: "#22c55e" },
            ].map((z) => (
              <div
                key={z.range}
                className="flex items-center justify-between text-[10px]"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: z.c }}
                  />
                  <span className="text-muted-foreground">{z.label}</span>
                </div>
                <span className="text-gray-700 font-mono">{z.range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 30-day area chart */}
        <div className="bg-[#0b0b0b] border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Fear &amp; Greed — 30 Day History
              </h2>
              <p className="text-[11px] text-gray-600">
                source: alternative.me/fng
              </p>
            </div>
            <div className="flex gap-2 text-[10px]">
              {[
                ["#ef4444", "Fear"],
                ["#eab308", "Neutral"],
                ["#22c55e", "Greed"],
              ].map(([c, l]) => (
                <span
                  key={l}
                  className="flex items-center gap-1 text-muted-foreground"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: c }}
                  />
                  {l}
                </span>
              ))}
            </div>
          </div>
          {data?.fearGreed?.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={data.fearGreed}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fgGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<FGTooltip />} />
                {/* Fear zone band 0-25 */}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#fgGrad)"
                  dot={(props) => {
                    const v = props.payload?.value as number;
                    if (v === undefined) return <></>;
                    return (
                      <circle
                        key={props.key}
                        cx={props.cx}
                        cy={props.cy}
                        r={3}
                        fill={fgColor(v)}
                        stroke="none"
                      />
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-gray-700 text-sm">
              No data
            </div>
          )}
        </div>
      </div>

      {/* ── Currency Strength ───────────────────────────── */}
      <div className="relative z-10 bg-[#0b0b0b] border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" /> Currency Strength
              Meter
            </h2>
            <p className="text-[11px] text-gray-600">
              Derived from live MT5 tick data — spread-weighted directional bias
            </p>
          </div>
        </div>
        {data?.currencyStrength?.length ? (
          <div className="space-y-3">
            {data.currencyStrength.map((c) => {
              const maxScore = Math.max(
                ...data.currencyStrength.map((x) => Math.abs(x.score)),
              );
              const pct = Math.min(
                (Math.abs(c.score) / (maxScore || 1)) * 100,
                100,
              );
              const positive = c.score >= 0;
              const barColor = CURRENCY_COLORS[c.currency] ?? "#6b7280";
              return (
                <div key={c.currency} className="flex items-center gap-3">
                  <span
                    className="w-10 text-right text-xs font-bold font-mono"
                    style={{ color: barColor }}
                  >
                    {c.currency}
                  </span>
                  <div className="flex-1 h-5 bg-background hover:bg-muted text-foreground rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
                      }}
                    />
                  </div>
                  <span
                    className={`w-16 text-xs tabular-nums font-mono text-right ${positive ? "text-green-400" : "text-red-400"}`}
                  >
                    {positive ? "+" : ""}
                    {c.score}
                  </span>
                  <span className="text-[10px] text-gray-600 w-14">
                    {positive ? "▲ Strong" : "▼ Weak"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-700 text-sm">
            MT5 not connected — currency strength requires the bridge.
          </div>
        )}
      </div>

      {/* ── News Sentiment ──────────────────────────────── */}
      <div className="relative z-10 bg-[#0b0b0b] border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" /> News-Based
              Sentiment by Symbol
            </h2>
            <p className="text-[11px] text-gray-600">
              Bullish / Bearish / Neutral article counts from ForexLive ·
              FXStreet · MarketWatch · Reuters
            </p>
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-green-500" /> Bullish
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-red-500" /> Bearish
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-muted/80" /> Neutral
            </span>
          </div>
        </div>
        {data?.newsSentiment?.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data.newsSentiment}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 40, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1a1a1a"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <YAxis
                type="category"
                dataKey="symbol"
                tick={{ fontSize: 10, fill: "#e2e8f0", fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                content={<NewsSentTooltip />}
                cursor={{ fill: "#ffffff06" }}
              />
              <Bar
                dataKey="bullish"
                name="Bullish"
                stackId="a"
                fill="#22c55e"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="neutral"
                name="Neutral"
                stackId="a"
                fill="#374151"
              />
              <Bar
                dataKey="bearish"
                name="Bearish"
                stackId="a"
                fill="#ef4444"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-12 text-center text-gray-700 text-sm">
            <Activity className="w-6 h-6 mx-auto mb-2 animate-pulse opacity-30" />
            No news sentiment data yet.
          </div>
        )}
      </div>

      {/* ── Overall market mood row ─────────────────────── */}
      <div className="relative z-10 grid sm:grid-cols-3 gap-4">
        {(() => {
          const ns = data?.newsSentiment ?? [];
          const totalBullish = ns.reduce((a, x) => a + x.bullish, 0);
          const totalBearish = ns.reduce((a, x) => a + x.bearish, 0);
          const totalNeutral = ns.reduce((a, x) => a + x.neutral, 0);
          const grandTotal = totalBullish + totalBearish + totalNeutral || 1;
          const bullPct = Math.round((totalBullish / grandTotal) * 100);
          const bearPct = Math.round((totalBearish / grandTotal) * 100);
          const neutPct = 100 - bullPct - bearPct;
          return [
            {
              label: "Overall Bullish",
              pct: bullPct,
              color: "#22c55e",
              Icon: TrendingUp,
            },
            {
              label: "Overall Neutral",
              pct: neutPct,
              color: "#6b7280",
              Icon: Minus,
            },
            {
              label: "Overall Bearish",
              pct: bearPct,
              color: "#ef4444",
              Icon: TrendingDown,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-[#0b0b0b] border border-border rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <item.Icon className="w-4 h-4" style={{ color: item.color }} />
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <p
                className="text-3xl font-bold tabular-nums"
                style={{ color: item.color }}
              >
                {item.pct}%
              </p>
              <div className="mt-3 h-1.5 w-full bg-background hover:bg-muted text-foreground rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${item.pct}%`, background: item.color }}
                />
              </div>
              <p className="text-[10px] text-gray-700 mt-2">
                Based on {ns.length} tracked symbols across 4 RSS feeds
              </p>
            </div>
          ));
        })()}
      </div>

      {/* Spacer */}
      <div className="h-4" />
    </div>
  );
}
