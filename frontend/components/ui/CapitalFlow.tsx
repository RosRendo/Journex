import React, { useState } from "react";
import { Info, Loader2 } from "lucide-react";

interface CapitalFlowProps {
  data?: { label: string, value: number }[];
  loading?: boolean;
}

export function CapitalFlow({ data = [], loading = false }: CapitalFlowProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const MAX_VAL = data.length > 0 ? Math.max(...data.map((a) => Math.abs(a.value)), 1) : 1;

  return (
    <div className="rounded-lg border p-5 flex flex-col h-full bg-[#101014] border-[rgba(255,255,255,0.07)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 font-mono">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
              Capital Flow
            </span>
            <Info className="w-3 h-3 cursor-help text-zinc-600" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[8px] text-zinc-600">↻ Last Update 08:00</span>
            <span className="flex items-center gap-1 text-[8px] font-bold text-[#20e0b2]">
              <span className="w-1 h-1 rounded-full bg-[#20e0b2] animate-pulse inline-block" />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 flex flex-col justify-between gap-1 font-mono">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-zinc-650 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[10px] text-zinc-500">
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
                className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors"
                style={{ background: isHovered ? "rgba(255,255,255,0.02)" : "transparent" }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Label */}
                <span className="text-[10px] font-bold w-[58px] flex-shrink-0 text-zinc-300">
                  {asset.label}
                </span>

                {/* Bar container with center axis */}
                <div className="flex-1 relative h-3 flex items-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-[1px] bg-zinc-800" />
                  </div>
                  {/* Center divider */}
                  <div className="absolute left-1/2 w-px h-full bg-zinc-800" />
                  {/* Bar */}
                  {isPos ? (
                    <div
                      className="absolute top-0.5 bottom-0.5 rounded-sm transition-all duration-1000 bg-[#20e0b2]"
                      style={{
                        left: "50%",
                        width: `${pct / 2}%`,
                        opacity: 0.85,
                      }}
                    />
                  ) : (
                    <div
                      className="absolute top-0.5 bottom-0.5 rounded-sm transition-all duration-1000 bg-[#ff5c73]"
                      style={{
                        right: "50%",
                        width: `${pct / 2}%`,
                        opacity: 0.85,
                      }}
                    />
                  )}
                </div>

                {/* Value */}
                <span
                  className={`text-[10px] font-bold w-[38px] text-right flex-shrink-0 ${isPos ? "text-[#20e0b2]" : "text-[#ff5c73]"}`}
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
