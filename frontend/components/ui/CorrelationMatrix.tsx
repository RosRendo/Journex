"use client";
import { useMemo } from "react";
import { AlertCircle } from "lucide-react";

const ASSETS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US30", "US100"];

// Static correlation matrix (rows x cols)
// Realistic average multi-month correlations
const MATRIX: Record<string, Record<string, number>> = {
  EURUSD: { EURUSD: 1.0, GBPUSD: 0.85, USDJPY: -0.45, XAUUSD: 0.35, US30: 0.25, US100: 0.30 },
  GBPUSD: { EURUSD: 0.85, GBPUSD: 1.0, USDJPY: -0.40, XAUUSD: 0.20, US30: 0.30, US100: 0.35 },
  USDJPY: { EURUSD: -0.45, GBPUSD: -0.40, USDJPY: 1.0, XAUUSD: -0.30, US30: 0.45, US100: 0.50 },
  XAUUSD: { EURUSD: 0.35, GBPUSD: 0.20, USDJPY: -0.30, XAUUSD: 1.0, US30: -0.15, US100: -0.10 },
  US30:   { EURUSD: 0.25, GBPUSD: 0.30, USDJPY: 0.45, XAUUSD: -0.15, US30: 1.0, US100: 0.92 },
  US100:  { EURUSD: 0.30, GBPUSD: 0.35, USDJPY: 0.50, XAUUSD: -0.10, US30: 0.92, US100: 1.0 },
};

function getColorInfo(val: number) {
  if (val === 1.0) return { bg: "transparent", color: "var(--text-tertiary)" }; // diagonal
  if (val >= 0.8) return { bg: "rgba(0,200,150,0.8)", color: "#000" };      // Highly Pos
  if (val >= 0.5) return { bg: "rgba(0,200,150,0.3)", color: "var(--text-primary)" }; // Pos
  if (val > -0.2 && val < 0.5) return { bg: "rgba(255,255,255,0.02)", color: "var(--text-secondary)" }; // Neutral
  if (val <= -0.5) return { bg: "rgba(255,77,106,0.8)", color: "#fff" };    // Highly Neg
  return { bg: "rgba(255,77,106,0.3)", color: "var(--text-primary)" };      // Neg
}

function getDesc(val: number) {
  if (val === 1.0) return "Identical asset";
  if (val >= 0.8) return "Very High Positive. Trading both = doubling your risk exposure.";
  if (val >= 0.5) return "Positive Correlation. Often move together.";
  if (val > -0.2 && val < 0.5) return "Neutral. Independent movement.";
  if (val <= -0.5) return "Highly Negative. Hedging each other.";
  return "Negative Correlation. Usually move inversely.";
}

export function CorrelationMatrix({ openPositions = [] }: { openPositions?: { pair: string; direction: "buy" | "sell" }[] }) {
  
  // Find high correlation conflicts in open positions
  const conflicts = useMemo(() => {
    const pairs = openPositions.map(p => p.pair);
    const conflictsList: { p1: string; p2: string; val: number }[] = [];
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const p1 = pairs[i];
        const p2 = pairs[j];
        if (p1 in MATRIX && p2 in MATRIX[p1]) {
          const val = MATRIX[p1][p2];
          // If both are same direction and highly pos, or opposite and highly neg -> conflict
          const dir1 = openPositions[i].direction;
          const dir2 = openPositions[j].direction;
          const isSameDir = dir1 === dir2;
          
          if ((isSameDir && val >= 0.8) || (!isSameDir && val <= -0.8)) {
            conflictsList.push({ p1, p2, val });
          }
        }
      }
    }
    return conflictsList;
  }, [openPositions]);

  return (
    <div className="w-full flex flex-col">
      {conflicts.length > 0 && (
        <div className="mb-4 flex items-center gap-2 p-2.5 rounded-lg border text-[11px] font-bold"
          style={{ background: "rgba(255,77,106,0.1)", borderColor: "rgba(255,77,106,0.25)", color: "#ff4d6a" }}>
          <AlertCircle size={14} />
          <span>
            ⚠ RISK CONFLICT: {conflicts[0].p1} + {conflicts[0].p2} open — {Math.abs(Math.round(conflicts[0].val * 100))}% {conflicts[0].val > 0 ? "correlated" : "inversely correlated"}
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
        <table className="w-full text-center border-collapse">
          <thead>
            <tr>
              <th className="p-2 border-b border-r" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}></th>
              {ASSETS.map((a) => (
                <th key={a} className="p-2 text-[10px] font-bold text-[--text-secondary] border-b" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
                  {a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((row) => (
              <tr key={row}>
                <th className="p-2 text-[10px] font-bold text-[--text-secondary] border-r text-left" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
                  {row}
                </th>
                {ASSETS.map((col) => {
                  const val = MATRIX[row]?.[col] ?? 0;
                  const ui = getColorInfo(val);
                  return (
                    <td key={col} className="p-0 border group relative cursor-help transition-all" style={{ borderColor: "var(--border)", background: ui.bg }}>
                      <div className="flex items-center justify-center p-2 text-[11px] font-mono font-bold" style={{ color: ui.color }}>
                        {val === 1.0 ? "—" : (val > 0 ? "+" : "") + val.toFixed(2)}
                      </div>
                      
                      {/* Tooltip */}
                      {val !== 1.0 && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 p-2 rounded bg-[#111118] border border-[--border] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 text-left pointer-events-none">
                          <div className="text-[11px] font-bold text-[--text-primary] mb-1">{row} vs {col}: {val.toFixed(2)}</div>
                          <p className="text-[10px] text-[--text-secondary]">{getDesc(val)}</p>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
