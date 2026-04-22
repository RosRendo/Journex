"use client";
import { useState } from "react";
import { Crosshair, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Loader2, ChevronDown } from "lucide-react";

const SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "US30", "NAS100"];

interface ToastMsg {
  type: "success" | "error";
  text: string;
}

export function QuickTradeEntry() {
  const [symbol, setSymbol] = useState("XAUUSD");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [lotSize, setLotSize] = useState("0.10");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [comment, setComment] = useState("TradeKiller Dashboard");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL ?? "http://localhost:5003";
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotSize || parseFloat(lotSize) <= 0) return;
    setLoading(true);
    setToast(null);

    try {
      // 1. Place trade on MT5
      const res = await fetch(`${BRIDGE_URL}/api/trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({
          symbol,
          direction,
          lot_size: parseFloat(lotSize),
          sl: sl ? parseFloat(sl) : 0,
          tp: tp ? parseFloat(tp) : 0,
          comment,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        // 2. Save to database for journal persistence
        try {
          await fetch(`${API_URL}/api/trades`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pair: symbol,
              direction: direction.toLowerCase(),
              entry: data.entry_price || 0,
              sl: sl ? parseFloat(sl) : null,
              tp: tp ? parseFloat(tp) : null,
              lot: parseFloat(lotSize),
              date: new Date().toISOString(),
              ticket: data.ticket,
              status: "open"
            }),
          });
        } catch (dbErr) {
          console.error("Failed to save trade to DB:", dbErr);
        }
        
        setToast({ type: "success", text: `✓ ${direction} ${lotSize} lots of ${symbol} — Ticket #${data.ticket}` });
        setSl(""); setTp("");
      } else {
        setToast({ type: "error", text: data.error || "Order placement failed." });
      }
    } catch (err) {
      setToast({ type: "error", text: "Could not connect to MT5 bridge." });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 6000);
    }
  };

  return (
    <div className="rounded-xl border border-[--border] bg-[--bg-card] p-6 h-full flex flex-col shadow-lg animate-fade-in relative overflow-hidden group">
      {/* Glow */}
      <div className={`absolute top-0 left-0 w-[250px] h-[250px] blur-[100px] rounded-full pointer-events-none transition-colors duration-500 ${direction === "BUY" ? "bg-[--bull]/8" : "bg-[--bear]/8"}`} />

      {/* Header */}
      <div className="flex items-center gap-2 mb-6 relative z-10">
        <Crosshair className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Quick Trade Entry</h2>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-gray-500 border border-white/10 rounded px-2 py-0.5">Market Order</span>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 relative z-10">
        {/* BUY / SELL Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-lg">
          <button
            type="button"
            onClick={() => setDirection("BUY")}
            className={`py-3 rounded-md text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              direction === "BUY"
                ? "bg-[--bull] text-black shadow-[0_0_20px_rgba(0,220,130,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Buy
          </button>
          <button
            type="button"
            onClick={() => setDirection("SELL")}
            className={`py-3 rounded-md text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              direction === "SELL"
                ? "bg-[--bear] text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <TrendingDown className="w-4 h-4" /> Sell
          </button>
        </div>

        {/* Symbol dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Symbol</label>
          <div className="relative">
            <select
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-bold focus:outline-none focus:border-[--accent] appearance-none cursor-pointer"
            >
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Lot Size */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Lot Size</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={lotSize}
              onChange={e => setLotSize(e.target.value)}
              required
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono font-bold focus:outline-none focus:border-[--accent]"
              placeholder="0.10"
            />
            {/* Quick presets */}
            {["0.01", "0.05", "0.10", "0.50"].map(v => (
              <button key={v} type="button" onClick={() => setLotSize(v)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${lotSize === v ? "bg-[--accent]/20 border-[--accent] text-[--accent]" : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* SL / TP Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[--bear]/70">Stop Loss</label>
            <input
              type="number"
              step="any"
              value={sl}
              onChange={e => setSl(e.target.value)}
              placeholder="Optional"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[--bear]/50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[--bull]/70">Take Profit</label>
            <input
              type="number"
              step="any"
              value={tp}
              onChange={e => setTp(e.target.value)}
              placeholder="Optional"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-[--bull]/50"
            />
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium animate-fade-in ${
            toast.type === "success"
              ? "bg-[--bull]/10 border-[--bull]/30 text-[--bull]"
              : "bg-[--bear]/10 border-[--bear]/30 text-[--bear]"
          }`}>
            {toast.type === "success"
              ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
            <span className="text-xs">{toast.text}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={`mt-auto w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
            direction === "BUY"
              ? "bg-gradient-to-r from-[--bull] to-emerald-600 text-black shadow-[0_0_20px_rgba(0,220,130,0.3)] hover:shadow-[0_0_30px_rgba(0,220,130,0.5)]"
              : "bg-gradient-to-r from-[--bear] to-red-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]"
          }`}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Placing Order...</>
            : <>{direction === "BUY" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}Execute {direction} {symbol}</>}
        </button>
      </form>
    </div>
  );
}
