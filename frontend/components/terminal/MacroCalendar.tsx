"use client";

import { useEffect, useState } from "react";
import { fetchMacroCalendar } from "../../lib/terminalApi";
import { countdown, impactColor } from "../../lib/format";

export default function MacroCalendar() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMacroCalendar(7)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div className="px-3 py-2 text-[11px] text-zinc-500 font-mono">Loading…</div>;

  // group by date
  const groups: Record<string, any[]> = {};
  data.forEach((e: any) => {
    const d = e.time_iso.slice(0, 10);
    groups[d] = groups[d] || [];
    groups[d].push(e);
  });
  const days = Object.keys(groups).sort();

  return (
    <div data-testid="macro-calendar-tab" className="h-full overflow-y-auto scroll-thin">
      {days.map((d) => (
        <div key={d}>
          <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-3 py-1 text-[10px] uppercase tracking-widest text-amber-500 font-mono">
            {d}
          </div>
          <table className="w-full text-[11px]">
            <tbody>
              {groups[d].map((e: any, i: number) => (
                <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                  <td className="px-3 py-1.5 w-20 font-mono text-zinc-400">
                    {e.time_iso.slice(11, 16)}
                  </td>
                  <td className="px-2 py-1.5 w-12 font-mono text-zinc-300">{e.country}</td>
                  <td className={`px-2 py-1.5 w-16 uppercase tracking-widest text-[9px] ${impactColor(e.impact)}`}>
                    {e.impact}
                  </td>
                  <td className="px-2 py-1.5 text-zinc-100">{e.title}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-zinc-400 w-20">
                    F: {e.forecast}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-zinc-500 w-20">
                    P: {e.previous}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-zinc-300 w-16">
                    ±{e.expected_move_pips}p
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-amber-500 w-20">
                    {countdown(e.time_iso)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
