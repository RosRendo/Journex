"use client";

import { useEffect, useState } from "react";
import { fetchSentimentGauge } from "../../lib/terminalApi";

interface WidgetHeaderProps {
  title: string;
  right?: React.ReactNode;
}

function WidgetHeader({ title, right }: WidgetHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2 h-7 bg-zinc-900 border-b border-zinc-800 shrink-0">
      <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-500">
        {title}
      </span>
      {right}
    </div>
  );
}

function gaugeColor(v: number) {
  if (v > 50) return "#10b981";
  if (v > 20) return "#84cc16";
  if (v > -20) return "#a1a1aa";
  if (v > -50) return "#f59e0b";
  return "#ef4444";
}

interface SentimentComponent {
  name: string;
  value: number;
}

interface SentimentData {
  value: number;
  label: string;
  components: SentimentComponent[];
}

export default function SentimentGauge() {
  const [data, setData] = useState<SentimentData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchSentimentGauge()
        .then((d) => !cancelled && setData(d))
        .catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Map value [-100..100] → angle [-90deg..+90deg]
  const v = data?.value ?? 0;
  const angle = (v / 100) * 90;
  const color = gaugeColor(v);

  return (
    <section data-testid="widget-sentiment-gauge" className="border-b border-zinc-800">
      <WidgetHeader
        title="Sentiment Gauge"
        right={
          <span className="text-[10px] font-bold" style={{ color }}>
            {data?.label || "—"}
          </span>
        }
      />
      <div className="px-2 py-2 flex flex-col items-center">
        <div className="relative w-full h-[88px] overflow-hidden">
          {/* Half-circle arc */}
          <svg viewBox="0 0 200 110" className="w-full h-full">
            <defs>
              <linearGradient id="sentArc" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="25%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#a1a1aa" />
                <stop offset="75%" stopColor="#84cc16" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path
              d="M 15 100 A 85 85 0 0 1 185 100"
              fill="none"
              stroke="#18181b"
              strokeWidth="14"
            />
            <path
              d="M 15 100 A 85 85 0 0 1 185 100"
              fill="none"
              stroke="url(#sentArc)"
              strokeWidth="10"
              opacity="0.85"
            />
            {/* Needle */}
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="22"
              stroke={color}
              strokeWidth="2"
              transform={`rotate(${angle} 100 100)`}
              style={{ transition: "transform 600ms ease" }}
            />
            <circle cx="100" cy="100" r="4" fill={color} />
          </svg>
          <div className="absolute inset-x-0 bottom-1 flex justify-between px-2 text-[8px] uppercase tracking-widest text-zinc-500 font-mono">
            <span>-100</span>
            <span>0</span>
            <span>+100</span>
          </div>
        </div>
        <div className="text-2xl font-mono font-bold tabular-nums" style={{ color }}>
          {data ? (v > 0 ? `+${v.toFixed(0)}` : v.toFixed(0)) : "—"}
        </div>
        <div className="w-full mt-1 grid grid-cols-1 gap-0.5">
          {(data?.components || []).map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between text-[10px] font-mono"
            >
              <span className="text-zinc-500 truncate">{c.name}</span>
              <span
                className={
                  c.value > 10
                    ? "text-emerald-500"
                    : c.value < -10
                    ? "text-red-500"
                    : "text-zinc-400"
                }
              >
                {c.value > 0 ? "+" : ""}
                {c.value.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
