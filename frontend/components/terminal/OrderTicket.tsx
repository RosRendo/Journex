"use client";

import { useState, useEffect } from "react";
import { usePanicMode } from "@/components/providers/PanicModeProvider";
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
  const { isLocked, panic } = usePanicMode();
  const [side, setSide] = useState(initialData?.side || "BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");
  const [entry, setEntry] = useState("");
  const [volume, setVolume] = useState<string | number>(0.1);
  const [sl, setSl] = useState(initialData?.sl ? String(initialData.sl) : "");
  const [tp, setTp] = useState(initialData?.tp ? String(initialData.tp) : "");
  const [autoBe, setAutoBe] = useState(false);
  const [trailingStop, setTrailingStop] = useState(false);
  const [copyTrade, setCopyTrade] = useState(false);
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
        order_type: orderType,
        entry: orderType !== "MARKET" && entry !== "" ? Number(entry) : undefined,
        volume: Number(volume),
        sl: sl !== "" ? Number(sl) : null,
        tp: tp !== "" ? Number(tp) : null,
        auto_be: autoBe,
        trailing_stop: trailingStop,
        copyTrade
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
          <div className="col-span-2 grid grid-cols-3 gap-1 mb-1">
            {(["MARKET", "LIMIT", "STOP"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`py-1 text-[10px] uppercase tracking-widest border transition-colors ${
                  orderType === type
                    ? "border-amber-500 text-amber-500 bg-amber-500/10"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
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
          {orderType !== "MARKET" && (
            <label className="flex flex-col gap-1 text-[10px] col-span-2">
              <span className="text-zinc-500 uppercase tracking-widest">Entry Price</span>
              <input
                type="number"
                step="0.00001"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="Required for Limit/Stop"
                className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
              />
            </label>
          )}
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
          <div className="col-span-2 flex flex-wrap items-center justify-between gap-4 mt-2 px-1">
            <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer">
              <input type="checkbox" checked={autoBe} onChange={(e) => setAutoBe(e.target.checked)} className="accent-amber-500" />
              <span className="uppercase tracking-widest">Auto Break-Even</span>
            </label>
            <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer">
              <input type="checkbox" checked={trailingStop} onChange={(e) => setTrailingStop(e.target.checked)} className="accent-amber-500" />
              <span className="uppercase tracking-widest">Trailing Stop</span>
            </label>
            {orderType === "MARKET" && (
              <label className="flex items-center gap-2 text-[10px] text-amber-500 cursor-pointer font-bold w-full mt-1 border border-amber-500/20 bg-amber-500/5 p-2 rounded">
                <input type="checkbox" checked={copyTrade} onChange={(e) => setCopyTrade(e.target.checked)} className="accent-amber-500" />
                <span className="uppercase tracking-widest">Enable Multi-Account Copy Trading</span>
              </label>
            )}
          </div>
        </div>

        {error && (
          <div className="text-[11px] text-red-500 font-mono mt-2">{error}</div>
        )}

        <DialogFooter className="mt-3 gap-2 flex-row justify-end">
          {isLocked && (
            <div className="w-full text-center text-[11px] text-red-400 font-bold uppercase tracking-widest py-1.5 rounded border border-red-500/30 bg-red-500/10 mb-1">
              🔒 Account Locked — Trading Disabled
            </div>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className="text-[11px] uppercase tracking-widest border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 text-zinc-100"
          >
            Cancel
          </button>
          <button
            data-testid="order-submit"
            onClick={onSubmit}
            disabled={submitting || isLocked}
            className={`text-[11px] uppercase tracking-widest border px-3 py-1.5 ${
              isLocked
                ? "border-zinc-700 text-zinc-600 cursor-not-allowed"
                : side === "BUY"
                  ? "border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"
                  : "border-red-500 text-red-500 hover:bg-red-500/10"
            }`}
          >
            {isLocked ? "🔒 Locked" : submitting ? "Sending…" : `${side} ${symbol} @ ${orderType === "MARKET" ? "Market" : entry || "..."}`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
