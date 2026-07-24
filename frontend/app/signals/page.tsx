"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/terminalApi";
import {
  Radar,
  TrendingUp,
  TrendingDown,
  Activity,
  Crosshair,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  Bell,
  BellOff
} from "lucide-react";
import OrderTicket from "@/components/terminal/OrderTicket";

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

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Order Ticket State
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderSymbol, setOrderSymbol] = useState("XAUUSD");
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderSl, setOrderSl] = useState("");
  const [orderTp, setOrderTp] = useState("");

  // Global Alerts State
  const [alertsPaused, setAlertsPaused] = useState(true);

  const fetchAlertStatus = async () => {
    try {
      const res = await api.get("/terminal/alert-config");
      if (res.data) setAlertsPaused(res.data.alerts_paused);
    } catch (e) {
      console.error("Failed to load alert config", e);
    }
  };

  const toggleAlerts = async () => {
    try {
      const newStatus = !alertsPaused;
      setAlertsPaused(newStatus); // optimistic update
      await api.post("/terminal/alert-config", { alerts_paused: newStatus });
    } catch (e) {
      console.error("Failed to toggle alerts", e);
      setAlertsPaused(!alertsPaused); // revert on failure
    }
  };

  const fetchSignals = async () => {
    try {
      const res = await api.get("/terminal/signals");
      if (res.data && res.data.success) {
        setSignals(res.data.signals);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error("Failed to load signals", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    fetchAlertStatus();
    const interval = setInterval(fetchSignals, 10000); // 10 second polling until WS is ready
    return () => clearInterval(interval);
  }, []);

  const handleExecute = (sig: Signal) => {
    setOrderSymbol(sig.symbol);
    setOrderSide(sig.type);
    setOrderSl(sig.sl ? sig.sl.toString() : "");
    setOrderTp(sig.tp ? sig.tp.toString() : "");
    setOrderOpen(true);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full p-4 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-800/50 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Radar className="w-5 h-5 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Global Market Scanner
            </h1>
          </div>
          <p className="text-sm text-zinc-500 max-w-2xl">
            Live technical analysis engine. Automatically scans forex, crypto, and commodity markets for high-probability EMA/RSI confluences.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleAlerts}
            className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${
              alertsPaused 
                ? "bg-black/40 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
            }`}
          >
            {alertsPaused ? (
              <><BellOff className="w-3 h-3" /> Alerts Paused</>
            ) : (
              <><Bell className="w-3 h-3" /> Alerts Active</>
            )}
          </button>
          
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-black/40 px-3 py-1.5 rounded-lg border border-zinc-800">
            <Clock className="w-3 h-3 text-emerald-500" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <Radar className="w-12 h-12 text-zinc-800 animate-spin mb-4" />
          <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase animate-pulse">
            Scanning Markets...
          </p>
        </div>
      ) : signals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/20">
          <Activity className="w-12 h-12 text-zinc-700 mb-4" />
          <h3 className="text-zinc-300 font-medium mb-1">No Active Signals</h3>
          <p className="text-zinc-500 text-sm max-w-md text-center">
            The market scanner is actively monitoring but hasn't found any high-probability setups meeting your criteria right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {signals.map((sig) => {
            const isBuy = sig.type === "BUY";
            const colorClass = isBuy ? "emerald" : "red";

            return (
              <div
                key={sig.id}
                className="relative flex flex-col bg-black/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors shadow-2xl"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-zinc-800/50 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold font-mono tracking-tight text-zinc-100 flex items-center gap-2">
                      {sig.symbol}
                      <span
                        className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          isBuy
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }`}
                      >
                        {sig.type}
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> {sig.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                      Confidence
                    </div>
                    <div className="text-xl font-bold font-mono text-zinc-300">
                      {sig.confidence}%
                    </div>
                  </div>
                </div>

                {/* Card Body - Levels */}
                <div className="p-4 grid grid-cols-3 gap-2 bg-zinc-900/20 flex-1">
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1 truncate">
                      <Crosshair className="w-3 h-3 shrink-0" /> Entry
                    </span>
                    <span className="font-mono text-xs text-zinc-300 truncate">
                      {sig.entry_price.toFixed(5)}
                    </span>
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[9px] text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1 truncate">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> Stop
                    </span>
                    <span className="font-mono text-xs text-zinc-300 truncate">
                      {sig.sl ? sig.sl.toFixed(5) : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[9px] text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1 truncate">
                      <ShieldCheck className="w-3 h-3 shrink-0" /> Target
                    </span>
                    <span className="font-mono text-xs text-zinc-300 truncate">
                      {sig.tp ? sig.tp.toFixed(5) : "—"}
                    </span>
                  </div>
                </div>

                {/* Card Footer - Action */}
                <div className="p-5 pt-0 mt-2">
                  <button
                    onClick={() => handleExecute(sig)}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold tracking-wide uppercase text-xs transition-all ${
                      isBuy
                        ? "bg-emerald-500 hover:bg-emerald-400 text-emerald-950"
                        : "bg-red-500 hover:bg-red-400 text-red-950"
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    Review & Execute {sig.type}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden Order Ticket Modal */}
      <OrderTicket
        open={orderOpen}
        onOpenChange={setOrderOpen}
        initialData={{
          symbol: orderSymbol,
          side: orderSide as "BUY" | "SELL",
          sl: Number(orderSl),
          tp: Number(orderTp)
        }}
        onSubmitted={() => {
          // Could show a toast or notification here
        }}
      />
    </div>
  );
}
