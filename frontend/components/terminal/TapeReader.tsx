"use client";

import { useMemo } from "react";
import { useMultiPriceStream } from "../../hooks/useMultiPriceStream";

/**
 * TapeReader — time-and-sales style scrolling tick feed.
 * Reads from the multi-symbol WS and shows the last N ticks with up/down color cues.
 */
export default function TapeReader({ symbols }: { symbols?: string[] }) {
  const symList = useMemo(
    () => (symbols && symbols.length ? symbols : ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"]),
    [symbols],
  );
  const { tape, status } = useMultiPriceStream(symList, { tapeLimit: 60 });

  const fmtTime = (iso: string | undefined, ts: number | undefined) => {
    const d = iso ? new Date(iso) : (ts ? new Date(ts) : new Date());
    return d.toLocaleTimeString("en-GB", { hour12: false });
  };

  return (
    <div data-testid="tape-reader" className="h-full flex flex-col text-[11px] font-mono">
      <div className="shrink-0 px-3 py-1 border-b border-zinc-800 bg-zinc-950 flex items-center gap-3">
        <span className="text-[9px] uppercase tracking-widest text-amber-500 font-bold">
          Tape · Time &amp; Sales
        </span>
        <span
          data-testid="tape-status"
          className={`text-[9px] uppercase tracking-widest ${
            status === "open"
              ? "text-emerald-500"
              : status === "connecting"
              ? "text-amber-500"
              : "text-red-500"
          }`}
        >
          ● {status}
        </span>
        <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
          {symList.join(" · ")}
        </span>
        <span className="ml-auto text-[9px] text-zinc-600">{tape.length} ticks</span>
      </div>
      <div className="grid grid-cols-[80px_80px_1fr_1fr_1fr_60px] px-3 py-1 text-[9px] uppercase tracking-widest text-zinc-500 border-b border-zinc-900 sticky top-0 bg-zinc-950">
        <span>Time</span>
        <span>Symbol</span>
        <span className="text-right">Bid</span>
        <span className="text-right">Ask</span>
        <span className="text-right">Mid</span>
        <span className="text-right">Dir</span>
      </div>
      <div className="flex-1 overflow-y-auto scroll-thin">
        {tape.length === 0 ? (
          <div className="px-3 py-3 text-[10px] text-zinc-600">Waiting for ticks…</div>
        ) : (
          tape.map((t, i) => {
            const up = (t.dir ?? 0) > 0;
            const down = (t.dir ?? 0) < 0;
            const color = up ? "text-emerald-500" : down ? "text-red-500" : "text-zinc-400";
            return (
              <div
                key={`${t.symbol}-${t.ts}-${i}`}
                data-testid={`tape-row-${i}`}
                className="grid grid-cols-[80px_80px_1fr_1fr_1fr_60px] px-3 py-0.5 border-b border-zinc-950 hover:bg-zinc-900/40"
              >
                <span className="text-zinc-500">{fmtTime(t.time, t.ts)}</span>
                <span className="font-bold text-zinc-100">{t.symbol}</span>
                <span className="text-right text-zinc-300">{t.bid}</span>
                <span className="text-right text-zinc-300">{t.ask}</span>
                <span className={`text-right ${color}`}>{t.mid}</span>
                <span className={`text-right ${color}`}>
                  {up ? "▲" : down ? "▼" : "·"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
