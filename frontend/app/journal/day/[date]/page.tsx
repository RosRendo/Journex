"use client";

import { useCsvTrades } from "@/hooks/useCsvTrades";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getPairDigits } from "@/lib/format";
import { TradeReplayModal } from "@/components/journal/TradeReplayModal";

export default function DayReviewPage() {
  const { date } = useParams();
  const router = useRouter();
  const dateStr = (Array.isArray(date) ? date[0] : date) || "";
  
  const { trades, loading } = useCsvTrades();
  const [selectedTrade, setSelectedTrade] = useState<any>(null);
  const [replayTradeId, setReplayTradeId] = useState<number | null>(null);

  const dayTrades = useMemo(() => {
    if (!trades) return [];
    return trades.filter(t => {
      const d = new Date(t.date);
      const tDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return tDateStr === dateStr;
    });
  }, [trades, dateStr]);

  const totalProfit = dayTrades.reduce((sum, t) => sum + t.profit, 0);
  const winCount = dayTrades.filter(t => t.profit > 0).length;
  const winRate = dayTrades.length > 0 ? (winCount / dayTrades.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Daily Review</h1>
        <p className="text-zinc-400 mt-1">{new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl border bg-zinc-900/50 border-zinc-800">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Net P&L</div>
          <div className={`text-3xl font-black font-mono tracking-tight ${totalProfit >= 0 ? "text-[var(--bull)]" : "text-[var(--bear)]"}`}>
            {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)}
          </div>
        </div>
        <div className="p-6 rounded-2xl border bg-zinc-900/50 border-zinc-800">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Total Trades</div>
          <div className="text-3xl font-black font-mono tracking-tight text-white">{dayTrades.length}</div>
        </div>
        <div className="p-6 rounded-2xl border bg-zinc-900/50 border-zinc-800">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Win Rate</div>
          <div className="text-3xl font-black font-mono tracking-tight text-white">{winRate.toFixed(0)}%</div>
        </div>
      </div>

      <div className="flex items-start gap-8">
        <div className="flex-1 space-y-4">
          <h2 className="text-lg font-bold text-white mb-4">Trades Executed</h2>
          {dayTrades.length === 0 ? (
            <div className="text-zinc-500 text-sm">No trades found for this day.</div>
          ) : (
            dayTrades.map((trade, idx) => {
              const isWin = trade.profit > 0;
              const isSelected = selectedTrade?.id === trade.id;
              return (
                <div
                  key={trade.id}
                  onClick={() => setSelectedTrade(trade)}
                  className="group p-5 rounded-2xl border transition-all cursor-pointer backdrop-blur-md relative overflow-hidden"
                  style={{
                    background: isSelected ? "var(--bg-elevated)" : "var(--bg-card)",
                    borderColor: isSelected ? "var(--accent)" : "var(--border)",
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity" style={{ background: isWin ? "var(--bull)" : "var(--bear)" }} />
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-5">
                      <div className="w-1.5 h-12 rounded-full" style={{ background: isWin ? "var(--bull)" : "var(--bear)" }} />
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[16px]" style={{ color: "var(--text-primary)" }}>{trade.pair}</span>
                          <span className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest" style={{ background: "var(--bg-input)", color: "var(--text-secondary)" }}>
                            {trade.direction}
                          </span>
                        </div>
                        <div className="text-[12px] font-mono mt-1.5 flex items-center gap-2" style={{ color: "var(--text-tertiary)" }}>
                          <Clock className="w-3 h-3" /> {new Date(trade.date).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-tertiary)" }}>Entry</div>
                        <div className="font-mono font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>{trade.entry.toFixed(getPairDigits(trade.pair))}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-tertiary)" }}>P&L</div>
                        <div className="font-mono font-black text-[18px] tracking-tight" style={{ color: isWin ? "var(--bull)" : "var(--bear)" }}>
                          {isWin ? "+" : ""}{trade.profit.toFixed(2)}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" style={{ color: "var(--text-tertiary)" }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <AnimatePresence>
          {selectedTrade && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="w-[400px] shrink-0 sticky top-8 space-y-4"
            >
              <div className="p-6 rounded-3xl border bg-zinc-900/80 border-zinc-800 shadow-2xl backdrop-blur-xl">
                <h3 className="text-xl font-bold text-white mb-6">Trade Details</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                    <span className="text-sm text-zinc-400">Instrument</span>
                    <span className="font-bold text-white">{selectedTrade.pair}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                    <span className="text-sm text-zinc-400">Direction</span>
                    <span className="font-bold text-white">{selectedTrade.direction}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                    <span className="text-sm text-zinc-400">Time</span>
                    <span className="font-mono text-white">{new Date(selectedTrade.date).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                    <span className="text-sm text-zinc-400">Net Result</span>
                    <span className={`font-mono font-bold ${selectedTrade.profit > 0 ? "text-[var(--bull)]" : "text-[var(--bear)]"}`}>
                      {selectedTrade.profit > 0 ? "+" : ""}{selectedTrade.profit.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setReplayTradeId(selectedTrade.id)}
                  className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 font-bold transition-all text-xs tracking-wider"
                >
                  <Play className="w-4 h-4" /> REPLAY TRADE
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {replayTradeId !== null && (
          <TradeReplayModal 
            tradeId={replayTradeId} 
            onClose={() => setReplayTradeId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
