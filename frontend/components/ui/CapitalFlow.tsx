import React, { useState, useEffect } from "react";
import { Info, Loader2 } from "lucide-react";
import { resolveLocalUrl } from "@/lib/utils";

const BRIDGE = resolveLocalUrl(process.env.NEXT_PUBLIC_BRIDGE_URL ?? "/api/bridge");

interface CapitalFlowProps {
  data?: { label: string, value: number }[];
  loading?: boolean;
}

export function CapitalFlow({ data = [], loading = false }: CapitalFlowProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const MAX_VAL = data.length > 0 ? Math.max(...data.map((a) => Math.abs(a.value)), 1) : 1;

  return (
    <div
      className="rounded-xl border p-5 flex flex-col h-full"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
              Capital Flow
            </span>
            <Info className="w-3 h-3 cursor-help" style={{ color: "var(--text-tertiary)" }} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>↻ Last Update 08:00</span>
            <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "var(--accent)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[--accent] animate-pulse inline-block" />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 flex flex-col justify-between gap-1">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-[--text-tertiary] animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[11px] text-[--text-tertiary]">
            No data available
          </div>
        ) : (
          data.map((asset, i) => {
            const pct = (Math.abs(asset.value) / MAX_VAL) * 100;
            const isPos = asset.value >= 0;
            const isHovered = hoveredIdx === i;

            return (
              <div
                key={asset.label}
                className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                style={{ background: isHovered ? "var(--bg-elevated)" : "transparent" }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Label */}
                <span
                  className="text-[11px] font-bold w-[58px] flex-shrink-0"
                  style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono, monospace)" }}
                >
                  {asset.label}
                </span>

                {/* Bar container with center axis */}
                <div className="flex-1 relative h-4 flex items-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-[1px]" style={{ background: "var(--border-strong)" }} />
                  </div>
                  {/* Center divider */}
                  <div className="absolute left-1/2 w-px h-full" style={{ background: "var(--border-strong)" }} />
                  {/* Bar */}
                  {isPos ? (
                    <div
                      className="absolute top-1 bottom-1 rounded-r transition-all duration-1000"
                      style={{
                        left: "50%",
                        width: `${pct / 2}%`,
                        background: "var(--bull)",
                        opacity: 0.85,
                      }}
                    />
                  ) : (
                    <div
                      className="absolute top-1 bottom-1 rounded-l transition-all duration-1000"
                      style={{
                        right: "50%",
                        width: `${pct / 2}%`,
                        background: "var(--bear)",
                        opacity: 0.85,
                      }}
                    />
                  )}
                </div>

                {/* Value */}
                <span
                  className="text-[11px] font-bold w-[38px] text-right flex-shrink-0"
                  style={{
                    color: isPos ? "var(--bull)" : "var(--bear)",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {isPos ? "+" : ""}{asset.value.toFixed(2)}%
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
