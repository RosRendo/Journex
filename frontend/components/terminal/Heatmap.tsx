"use client";

import { useEffect, useState } from "react";
import { fetchHeatmap } from "../../lib/terminalApi";

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

function cellColor(v: number) {
  // -1..+1 → red..neutral..emerald
  const abs = Math.min(1, Math.abs(v));
  if (v > 0) return `rgba(16,185,129,${0.15 + abs * 0.7})`;
  if (v < 0) return `rgba(239,68,68,${0.15 + abs * 0.7})`;
  return "rgba(82,82,91,0.4)";
}

export default function Heatmap() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchHeatmap()
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data)
    return (
      <section className="border-b border-zinc-800">
        <WidgetHeader title="Heatmap" />
        <div className="p-2 text-[10px] font-mono text-zinc-500">Loading…</div>
      </section>
    );

  return (
    <section data-testid="widget-heatmap" className="border-b border-zinc-800">
      <WidgetHeader
        title="Correlation Heatmap"
        right={
          <span className="text-[9px] uppercase tracking-widest text-zinc-500">
            10×10
          </span>
        }
      />
      <div className="p-1.5 overflow-x-auto no-scrollbar">
        <table className="border-separate" style={{ borderSpacing: 1 }}>
          <thead>
            <tr>
              <th className="text-[8px] font-normal text-zinc-600 px-1" />
              {data.symbols.map((s: string) => (
                <th
                  key={s}
                  className="text-[8px] font-mono font-normal text-zinc-500 px-0.5"
                  style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((row: any) => (
              <tr key={row.symbol}>
                <td className="text-[9px] font-mono text-zinc-400 pr-1 text-right">
                  {row.symbol}
                </td>
                {row.values.map((cell: any) => (
                  <td
                    key={cell.symbol}
                    title={`${row.symbol} ↔ ${cell.symbol}: ${cell.corr}`}
                    style={{ background: cellColor(cell.corr), width: 18, height: 18 }}
                    className="text-[8px] font-mono text-zinc-100 text-center align-middle"
                  >
                    {cell.symbol === row.symbol ? "" : cell.corr.toFixed(1).replace("0.", ".")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
