"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { submitOrder } from "../../lib/terminalApi";

const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "NZDUSD", "USDCHF", "USDCAD", "XAUUSD", "AUDJPY", "EURJPY"];

interface OrderTicketProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSymbol?: string;
  initialData?: {
    symbol?: string;
    side?: "BUY" | "SELL";
    sl?: number;
    tp?: number;
  };
  onSubmitted?: (trade: any) => void;
}

export default function OrderTicket({ open, onOpenChange, defaultSymbol, initialData, onSubmitted }: OrderTicketProps) {
  const [symbol, setSymbol] = useState(initialData?.symbol || defaultSymbol || "EURUSD");
  const [side, setSide] = useState(initialData?.side || "BUY");
  const [volume, setVolume] = useState<string | number>(0.1);
  const [sl, setSl] = useState(initialData?.sl ? String(initialData.sl) : "");
  const [tp, setTp] = useState(initialData?.tp ? String(initialData.tp) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData && open) {
      if (initialData.symbol) setSymbol(initialData.symbol);
      if (initialData.side) setSide(initialData.side);
      if (initialData.sl !== undefined) setSl(String(initialData.sl));
      if (initialData.tp !== undefined) setTp(String(initialData.tp));
    }
  }, [initialData, open]);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        symbol,
        side,
        volume: Number(volume),
        sl: sl !== "" ? Number(sl) : null,
        tp: tp !== "" ? Number(tp) : null,
      };
      const trade = await submitOrder(payload);
      onSubmitted?.(trade);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="order-ticket-dialog"
        className="bg-black border border-zinc-800 rounded-none max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-[11px] uppercase tracking-[0.2em] text-amber-500">
            Order Ticket
          </DialogTitle>
          <DialogDescription className="text-[10px] text-zinc-500 font-mono">
            Paper trade saved to local journal. SL / TP optional.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <label className="col-span-2 flex flex-col gap-1 text-[10px]">
            <span className="text-zinc-500 uppercase tracking-widest">Symbol</span>
            <select
              data-testid="order-symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
            >
              {SYMBOLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <button
              data-testid="order-side-buy"
              onClick={() => setSide("BUY")}
              className={`py-2 text-xs uppercase tracking-widest border transition-colors ${
                side === "BUY"
                  ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              Buy
            </button>
            <button
              data-testid="order-side-sell"
              onClick={() => setSide("SELL")}
              className={`py-2 text-xs uppercase tracking-widest border transition-colors ${
                side === "SELL"
                  ? "border-red-500 text-red-500 bg-red-500/10"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              Sell
            </button>
          </div>
          <label className="flex flex-col gap-1 text-[10px]">
            <span className="text-zinc-500 uppercase tracking-widest">Volume (lots)</span>
            <input
              data-testid="order-volume"
              type="number"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px]">
            <span className="text-zinc-500 uppercase tracking-widest">Stop Loss</span>
            <input
              data-testid="order-sl"
              type="number"
              step="0.00001"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              placeholder="—"
              className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px]">
            <span className="text-zinc-500 uppercase tracking-widest">Take Profit</span>
            <input
              data-testid="order-tp"
              type="number"
              step="0.00001"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              placeholder="—"
              className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
            />
          </label>
        </div>

        {error && (
          <div className="text-[11px] text-red-500 font-mono mt-2">{error}</div>
        )}

        <DialogFooter className="mt-3 gap-2 flex-row justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="text-[11px] uppercase tracking-widest border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 text-zinc-100"
          >
            Cancel
          </button>
          <button
            data-testid="order-submit"
            onClick={onSubmit}
            disabled={submitting}
            className={`text-[11px] uppercase tracking-widest border px-3 py-1.5 ${
              side === "BUY"
                ? "border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"
                : "border-red-500 text-red-500 hover:bg-red-500/10"
            }`}
          >
            {submitting ? "Sending…" : `${side} ${symbol} @ Market`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
