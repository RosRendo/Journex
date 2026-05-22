// Number / price / time formatters shared across terminal widgets.

export const fmtPrice = (p: number | null | undefined, digits = 5): string => {
  if (p === null || p === undefined || Number.isNaN(p)) return "—";
  return Number(p).toFixed(digits);
};

export const fmtPct = (v: number | null | undefined, digits = 2, sign = true): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const s = Number(v).toFixed(digits);
  return sign && v > 0 ? `+${s}%` : `${s}%`;
};

export const fmtMoney = (v: number | null | undefined, digits = 0): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  return `${sign}$${abs.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
};

export const fmtSignedMoney = (v: number | null | undefined, digits = 2): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const sign = v >= 0 ? "+" : "-";
  const abs = Math.abs(v);
  return `${sign}$${abs.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
};

export const fmtPips = (p: number | null | undefined): string => {
  if (p === null || p === undefined || Number.isNaN(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${Number(p).toFixed(1)}`;
};

export const utcClock = (d = new Date()): string => {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} UTC`;
};

export const countdown = (iso: string): string => {
  const target = new Date(iso).getTime();
  const now = Date.now();
  const ms = target - now;
  if (ms <= 0) return "LIVE";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
};

export const timeAgo = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
};

export const biasColor = (bias: string | null | undefined): string => {
  switch ((bias || "").toLowerCase()) {
    case "bearish":
    case "bearish_jpy":
      return "text-red-500";
    case "bullish":
    case "bullish_setup":
    case "bullish_usd":
      return "text-emerald-500";
    case "neutral":
      return "text-zinc-400";
    default:
      return "text-zinc-400";
  }
};

export const biasArrow = (bias: string | null | undefined): string => {
  const b = (bias || "").toLowerCase();
  if (b.startsWith("bear")) return "▼";
  if (b.startsWith("bull")) return "▲";
  return "↔";
};

export const impactColor = (impact: string | null | undefined): string => {
  switch ((impact || "").toLowerCase()) {
    case "high":
      return "text-red-500";
    case "med":
    case "medium":
      return "text-amber-500";
    case "low":
      return "text-emerald-500";
    default:
      return "text-zinc-400";
  }
};
