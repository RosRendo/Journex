"use client";

export default function StatusBar({ status, symbol, timeframe }) {
  const items = [
    {
      label: "Connected",
      value: status?.connected ? "✓" : "✗",
      cls: status?.connected ? "text-emerald-500" : "text-red-500",
    },
    {
      label: "MT5",
      value: status?.mt5_online ? "Online" : "Offline",
      cls: status?.mt5_online ? "text-emerald-500" : "text-red-500",
    },
    {
      label: "Backend",
      value: status?.backend ?? "—",
      cls: "text-emerald-500",
    },
    {
      label: "Latency",
      value: `${status?.latency_ms ?? "—"}ms`,
      cls: "text-zinc-300",
    },
    {
      label: "Updates",
      value: `${status?.updates_per_sec ?? "—"}/s`,
      cls: "text-amber-500",
    },
    { label: "Symbol", value: symbol, cls: "text-zinc-300" },
    { label: "TF", value: timeframe, cls: "text-zinc-300" },
  ];
  return (
    <div
      data-testid="status-bar"
      className="h-6 shrink-0 border-t border-zinc-800 bg-zinc-950 flex items-center px-3 gap-5 text-[10px] font-mono"
    >
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-1.5">
          <span className="uppercase tracking-widest text-zinc-500">{i.label}</span>
          <span className={i.cls}>{i.value}</span>
        </div>
      ))}
      <div className="flex-1" />
      <span className="uppercase tracking-widest text-zinc-600">
        © Bloomberg Terminal — Mock Data Stream
      </span>
    </div>
  );
}
