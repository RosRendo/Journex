import { useEffect, useState } from "react";
import { api } from "../../lib/terminalApi";
import { Zap, TrendingUp, TrendingDown } from "lucide-react";

interface Signal {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  entry_price: number;
  sl: number;
  tp: number;
  confidence: number;
  reason: string;
  timestamp: string;
}

interface SignalWidgetProps {
  onExecute: (signal: Signal) => void;
}

export default function SignalWidget({ onExecute }: SignalWidgetProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSignals = async () => {
    try {
      console.log("Fetching signals...");
      const res = await api.get("/terminal/signals");
      console.log("Signals response:", res.data);
      if (res.data && res.data.success) {
        setSignals(res.data.signals);
      }
    } catch (e) {
      console.error("Failed to load signals", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-3 border-b border-zinc-800 text-[11px] text-zinc-500 font-mono animate-pulse">
        Scanning for signals...
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <section data-testid="widget-signals" className="border-b border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center justify-between px-2 h-7 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase flex items-center gap-1 text-purple-400">
            <Zap className="w-3 h-3" /> Live Signals
          </span>
        </div>
        <div className="p-3 text-[11px] text-zinc-500 font-mono text-center">
          No active signals found.
        </div>
      </section>
    );
  }

  return (
    <section data-testid="widget-signals" className="border-b border-zinc-800 bg-zinc-950/50">
      <div className="flex items-center justify-between px-2 h-7 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase flex items-center gap-1 text-purple-400">
          <Zap className="w-3 h-3" /> Live Signals
        </span>
      </div>
      <div className="p-2 space-y-2">
        {signals.slice(0, 3).map((sig) => {
          const isBuy = sig.type === "BUY";
          return (
            <div
              key={sig.id}
              className={`p-2 rounded border bg-black/40 backdrop-blur-sm relative overflow-hidden group ${
                isBuy ? "border-emerald-500/30 hover:border-emerald-500/60" : "border-red-500/30 hover:border-red-500/60"
              } transition-colors`}
            >
              <div className="absolute top-0 right-0 p-1 opacity-20 group-hover:opacity-100 transition-opacity">
                 {isBuy ? <TrendingUp className="w-8 h-8 text-emerald-500" /> : <TrendingDown className="w-8 h-8 text-red-500" />}
              </div>
              <div className="flex justify-between items-start mb-1 relative z-10">
                <span className="font-bold text-[12px] text-zinc-200">{sig.symbol}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isBuy ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {sig.type} @ {sig.entry_price}
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 mb-2 leading-tight relative z-10 pr-6">
                {sig.reason}
              </div>
              <div className="flex justify-between items-center relative z-10">
                <div className="flex gap-3 text-[10px] font-mono">
                  <span className="text-red-400/80">SL: {sig.sl}</span>
                  <span className="text-emerald-400/80">TP: {sig.tp}</span>
                </div>
                <button
                  onClick={() => onExecute(sig)}
                  className={`px-3 py-1 rounded text-[10px] font-bold shadow-lg transition-all ${
                    isBuy
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50"
                      : "bg-red-600 hover:bg-red-500 text-white shadow-red-900/50"
                  }`}
                >
                  EXECUTE
                </button>
              </div>
              {/* Confidence bar */}
              <div className="absolute bottom-0 left-0 h-[2px] bg-zinc-800 w-full">
                <div 
                  className={`h-full ${isBuy ? "bg-emerald-500" : "bg-red-500"}`} 
                  style={{ width: `${sig.confidence}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
