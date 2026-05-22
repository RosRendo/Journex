"use client";

import { useMemo } from "react";

/**
 * Volume Profile overlay — computes volume per price-bucket from candles and
 * renders horizontal bars on the right edge of the chart container.
 */
export default function VolumeProfile({ candles, bucketCount = 24 }) {
  const data = useMemo(() => {
    if (!candles || candles.length === 0) return null;
    let minP = Infinity, maxP = -Infinity;
    for (const c of candles) {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    }
    if (!isFinite(minP) || !isFinite(maxP) || maxP === minP) return null;
    const buckets = new Array(bucketCount).fill(0);
    const range = maxP - minP;
    const step = range / bucketCount;
    for (const c of candles) {
      const lo = Math.max(0, Math.floor((c.low - minP) / step));
      const hi = Math.min(bucketCount - 1, Math.floor((c.high - minP) / step));
      const spread = Math.max(1, hi - lo + 1);
      const perBucket = c.volume / spread;
      for (let i = lo; i <= hi; i++) buckets[i] += perBucket;
    }
    const maxV = Math.max(...buckets);
    // POC (Point of Control) = bucket with highest volume
    const pocIdx = buckets.indexOf(maxV);
    const pocPrice = minP + (pocIdx + 0.5) * step;
    return { buckets, minP, maxP, step, maxV, pocPrice };
  }, [candles, bucketCount]);

  if (!data) return null;

  return (
    <div
      data-testid="volume-profile"
      className="absolute top-0 right-0 bottom-0 w-24 pointer-events-none flex flex-col"
      style={{ background: "linear-gradient(to left, rgba(0,0,0,0.55), rgba(0,0,0,0))" }}
    >
      <div className="text-[8px] uppercase tracking-widest text-amber-500 text-right pr-2 pt-1">
        Volume Profile
      </div>
      <svg viewBox={`0 0 100 ${bucketCount * 4}`} preserveAspectRatio="none" className="flex-1 w-full">
        {data.buckets.map((v, i) => {
          const wRatio = v / data.maxV;
          const isPoc = i === data.buckets.indexOf(data.maxV);
          const y = (bucketCount - 1 - i) * 4;
          return (
            <g key={i}>
              <rect
                x={100 - wRatio * 90}
                y={y + 0.4}
                width={wRatio * 90}
                height={3.2}
                fill={isPoc ? "#f59e0b" : "rgba(6,182,212,0.55)"}
              />
            </g>
          );
        })}
      </svg>
      <div className="text-[8px] font-mono text-amber-500 text-right pr-2 pb-1">
        POC {data.pocPrice.toFixed(candles[0].close > 50 ? 2 : 5)}
      </div>
    </div>
  );
}
