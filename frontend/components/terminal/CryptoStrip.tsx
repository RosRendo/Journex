"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/terminalApi";

function WidgetHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 h-7 bg-zinc-900 border-b border-zinc-800 shrink-0">
      <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-500">
        {title}
      </span>
      {right}
    </div>
  );
}

export default function CryptoStrip() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api.get("/crypto/prices")
        .then((res) => {
          if (cancelled) return;
          setItems(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => { if (!cancelled) setItems([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <section data-testid="widget-crypto" className="border-b border-zinc-800">
      <WidgetHeader
        title="Crypto (CoinGecko)"
        right={
          <span className="text-[9px] uppercase tracking-widest text-zinc-500">
            {loading ? "…" : `${items.length} live`}
          </span>
        }
      />
      {!loading && items.length === 0 && (
        <div className="px-2 py-1.5 text-[10px] text-zinc-500 font-mono">
          ○ No crypto symbols in MT5 — add BTCUSD/ETHUSD to enable
        </div>
      )}
      <table className="w-full text-[11px]">
        <tbody>
          {items.map((c) => {
            const up = (c.change_pct ?? 0) >= 0;
            return (
              <tr
                key={c.symbol}
                data-testid={`crypto-${c.symbol}`}
                className="border-b border-zinc-900 hover:bg-zinc-900/50"
              >
                <td className="px-2 py-1.5 font-bold text-zinc-100">{c.symbol}</td>
                <td className="px-1 py-1.5 text-right font-mono text-zinc-100">
                  ${typeof c.price === "number" ? c.price.toLocaleString() : "—"}
                </td>
                <td
                  className={`px-2 py-1.5 text-right font-mono text-[10px] ${
                    up ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {up ? "▲" : "▼"}
                  {Math.abs(c.change_pct ?? 0).toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
