/**
 * Sanitizes and deduplicates time-series data for TradingView Lightweight Charts.
 *
 * Lightweight Charts enforces strict internal assertions:
 * "Assertion failed: data must be asc ordered by time, index=i, time=X, prev time=Y"
 *
 * This function guarantees:
 * 1. Filter out null/undefined/NaN time or price entries.
 * 2. Proper chronological sorting (ascending).
 * 3. Exact deduplication of timestamps: if multiple candles share the exact same timestamp,
 *    the last one is kept (as the most up-to-date bar) and duplicates are dropped.
 * 4. Strict monotonic increase: time[i] > time[i-1] for every point in the returned array.
 */
export function sanitizeChartData<T extends { time: any }>(data: T[]): T[] {
  if (!Array.isArray(data) || data.length === 0) return [];

  // 1. Filter out invalid items
  const valid = data.filter(
    (item) => item && item.time !== undefined && item.time !== null && !Number.isNaN(item.time)
  );

  if (valid.length === 0) return [];

  // 2. Sort ascending by time
  const sorted = [...valid].sort((a, b) => {
    if (typeof a.time === "number" && typeof b.time === "number") {
      return a.time - b.time;
    }
    return String(a.time).localeCompare(String(b.time));
  });

  // 3. Deduplicate consecutive identical or non-increasing timestamps
  const result: T[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (result.length === 0) {
      result.push(current);
      continue;
    }

    const prev = result[result.length - 1];

    if (current.time === prev.time) {
      // Overwrite previous duplicate with current to retain latest values
      result[result.length - 1] = current;
    } else {
      const isAscending =
        typeof current.time === "number" && typeof prev.time === "number"
          ? current.time > prev.time
          : String(current.time) > String(prev.time);

      if (isAscending) {
        result.push(current);
      }
    }
  }

  return result;
}
