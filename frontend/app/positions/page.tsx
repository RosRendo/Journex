"use client";

import { useEffect, useState } from "react";
import {
  Activity, AlertCircle, TrendingUp, TrendingDown, Clock, Target,
  X, Edit2, Check, XCircle, Loader2, ChevronDown, ChevronUp,
  Wifi, WifiOff, Zap
} from "lucide-react";

import {
  fetchBridgePositions,
  closeBridgePosition,
  modifyBridgePosition
} from "@/lib/terminalApi";

interface Position {
  ticket: number;
  symbol: string;
  type: number;
  volume: number;
  price_open: number;
  sl: number;
  tp: number;
  price_current: number;
  profit: number;
  time: number;
  comment: string;
  swap: number;
}

interface Toast {
  type: "success" | "error";
  text: string;
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [closingTicket, setClosingTicket] = useState<number | null>(null);
  const [editingTicket, setEditingTicket] = useState<number | null>(null);
  const [editSl, setEditSl] = useState("");
  const [editTp, setEditTp] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchPositions = async () => {
    try {
      const data = await fetchBridgePositions();
      if (data.success) {
        setPositions(data.positions || []);
        setError("");
      } else {
        setError(data.error || "Failed to fetch positions");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to MT5 bridge");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 3000);
    return () => clearInterval(interval);
  }, []);

  const closePosition = async (ticket: number) => {
    setClosingTicket(ticket);
    try {
      const data = await closeBridgePosition(ticket);
      if (data.success) {
        showToast("success", `Position #${ticket} closed successfully.`);
        await fetchPositions();
      } else {
        showToast("error", data.error || "Close failed");
      }
    } catch {
      showToast("error", "Could not connect to MT5 bridge");
    } finally {
      setClosingTicket(null);
    }
  };

  const modifyPosition = async (ticket: number) => {
    try {
      const data = await modifyBridgePosition(
        ticket,
        editSl ? parseFloat(editSl) : undefined,
        editTp ? parseFloat(editTp) : undefined
      );
      if (data.success) {
        showToast("success", `Position #${ticket} SL/TP updated.`);
        setEditingTicket(null);
        await fetchPositions();
      } else {
        showToast("error", data.error || "Modify failed");
      }
    } catch {
      showToast("error", "Could not connect to MT5 bridge");
    }
  };

  const closeAll = async (filter?: "winners" | "losers") => {
    const targets = filter
      ? positions.filter(p => filter === "winners" ? p.profit > 0 : p.profit < 0)
      : positions;
    if (targets.length === 0) return;
    
    const confirmMessage = filter ? `Are you sure you want to close all ${filter}?` : "Are you sure you want to close ALL positions?";
    if (!window.confirm(confirmMessage)) return;

    setBulkLoading(true);
    let closed = 0;
    for (const p of targets) {
      try {
        const data = await closeBridgePosition(p.ticket);
        if (data.success) closed++;
      } catch {}
    }
    showToast("success", `Closed ${closed}/${targets.length} positions.`);
    await fetchPositions();
    setBulkLoading(false);
  };

  const totalProfit = positions.reduce((acc, p) => acc + p.profit, 0);
  const totalSwap = positions.reduce((acc, p) => acc + p.swap, 0);
  const winners = positions.filter(p => p.profit >= 0).length;
  const losers = positions.filter(p => p.profit < 0).length;

  const sorted = [...positions].sort((a, b) =>
    sortDir === "desc" ? b.profit - a.profit : a.profit - b.profit
  );

  const getPositionAge = (unixTime: number) => {
    const diff = Date.now() / 1000 - unixTime;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="space-y-6 pb-12 text-[--text-primary] relative">
      {/* Ambient glows */}
      <div className="fixed top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[--accent]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border shadow-2xl backdrop-blur animate-fade-in ${
          toast.type === "success" ? "bg-[--bull]/10 border-[--bull]/30 text-[--bull]" : "bg-[--bear]/10 border-[--bear]/30 text-[--bear]"
        }`}>
          {toast.type === "success" ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3" style={{ fontFamily: "'Syne', sans-serif" }}>
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            Live Positions
          </h1>
          <p className="text-sm mt-2 text-[--text-secondary] flex items-center gap-2">
            {loading ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Syncing with MT5...</>
            ) : error ? (
              <><WifiOff className="w-3 h-3 text-[--bear]" /><span className="text-[--bear]">MT5 Disconnected</span></>
            ) : (
              <><Wifi className="w-3 h-3 text-[--bull] animate-pulse" /><span className="text-[--bull]">Live · {positions.length} open trade{positions.length !== 1 ? "s" : ""}</span></>
            )}
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Total Float */}
          <div className={`px-5 py-3 rounded-xl border flex flex-col items-center ${
            totalProfit >= 0 ? "bg-[--bull]/10 border-[--bull]/20" : "bg-[--bear]/10 border-[--bear]/20"
          }`}>
            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Floating P/L</span>
            <span className={`text-xl font-black font-mono mt-0.5 ${totalProfit >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
              {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)}
            </span>
          </div>

          {/* Win/Loss count */}
          <div className="px-5 py-3 rounded-xl border border-white/10 bg-white/[0.02] flex gap-4">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-gray-500">Win</div>
              <div className="text-lg font-bold text-[--bull]">{winners}</div>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-gray-500">Loss</div>
              <div className="text-lg font-bold text-[--bear]">{losers}</div>
            </div>
          </div>

          {/* Bulk Actions */}
          {positions.length > 0 && (
            <div className="flex gap-2">
              <button onClick={() => closeAll("winners")} disabled={bulkLoading || winners === 0}
                className="px-3 py-2 rounded-lg text-xs font-bold border border-[--bull]/30 bg-[--bull]/10 text-[--bull] hover:bg-[--bull]/20 disabled:opacity-40 transition-all uppercase tracking-wider">
                Close Winners
              </button>
              <button onClick={() => closeAll("losers")} disabled={bulkLoading || losers === 0}
                className="px-3 py-2 rounded-lg text-xs font-bold border border-[--bear]/30 bg-[--bear]/10 text-[--bear] hover:bg-[--bear]/20 disabled:opacity-40 transition-all uppercase tracking-wider">
                Close Losers
              </button>
              <button onClick={() => closeAll()} disabled={bulkLoading}
                className="px-3 py-2 rounded-lg text-xs font-bold border border-white/20 bg-white/5 text-white hover:bg-white/10 disabled:opacity-40 transition-all uppercase tracking-wider flex items-center gap-1">
                {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Close All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[--bear]/10 border border-[--bear]/30 text-[--bear] p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">MT5 Connection Error</p>
            <p className="text-xs text-[--bear]/70 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[--border] bg-[--bg-card] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
              <tr className="text-[10px] uppercase font-bold text-gray-500 tracking-wider border-b border-[--border]">
                <th className="px-6 py-4">Ticket / Age</th>
                <th className="px-6 py-4">Symbol / Type</th>
                <th className="px-6 py-4">Volume</th>
                <th className="px-6 py-4">Open Price</th>
                <th className="px-6 py-4">Current</th>
                <th className="px-6 py-4">SL / TP</th>
                <th className="px-6 py-4 text-right cursor-pointer select-none hover:text-white transition-colors"
                  onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}>
                  P&L {sortDir === "desc" ? <ChevronDown className="w-3 h-3 inline" /> : <ChevronUp className="w-3 h-3 inline" />}
                </th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && positions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 opacity-50" />
                    <p className="text-xs uppercase tracking-widest font-bold">Connecting to MT5...</p>
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-gray-500">
                    <div className="w-14 h-14 rounded-full border border-dashed border-gray-700 flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-6 h-6 opacity-30" />
                    </div>
                    <p className="text-sm font-bold text-gray-300 mb-1">No Open Positions</p>
                    <p className="text-xs text-gray-600">Your MT5 account has no active trades right now.</p>
                  </td>
                </tr>
              ) : (
                sorted.map(pos => {
                  const isBuy = pos.type === 0;
                  const isProfitable = pos.profit >= 0;
                  const isEditing = editingTicket === pos.ticket;
                  const isClosing = closingTicket === pos.ticket;

                  return (
                    <tr key={pos.ticket}
                      className={`border-b border-[--border] hover:bg-white/[0.02] transition-colors ${
                        isProfitable ? "border-l-2 border-l-[--bull]" : "border-l-2 border-l-[--bear]"
                      }`}>
                      {/* Ticket */}
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs text-gray-400">#{pos.ticket}</div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-600 mt-1">
                          <Clock className="w-3 h-3" />
                          {getPositionAge(pos.time)} ago
                        </div>
                      </td>
                      {/* Symbol/Type */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{pos.symbol}</div>
                        <div className={`flex items-center gap-1 text-xs font-bold mt-1 ${isBuy ? "text-[--bull]" : "text-[--bear]"}`}>
                          {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isBuy ? "BUY" : "SELL"}
                        </div>
                      </td>
                      {/* Volume */}
                      <td className="px-6 py-4 font-mono text-white font-medium">{pos.volume.toFixed(2)}</td>
                      {/* Open */}
                      <td className="px-6 py-4 font-mono text-gray-300">{pos.price_open.toFixed(5)}</td>
                      {/* Current */}
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-white bg-white/5 border border-white/10 px-3 py-1 rounded-lg inline-block">
                          {pos.price_current.toFixed(5)}
                        </div>
                      </td>
                      {/* SL/TP - Editable */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-[--bear] uppercase font-bold w-6">SL</span>
                              <input type="number" step="any" value={editSl} onChange={e => setEditSl(e.target.value)}
                                placeholder={pos.sl > 0 ? pos.sl.toFixed(5) : "None"}
                                className="w-28 bg-white/5 border border-white/20 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[--bear]/50" />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-[--bull] uppercase font-bold w-6">TP</span>
                              <input type="number" step="any" value={editTp} onChange={e => setEditTp(e.target.value)}
                                placeholder={pos.tp > 0 ? pos.tp.toFixed(5) : "None"}
                                className="w-28 bg-white/5 border border-white/20 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[--bull]/50" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 text-[11px] font-mono">
                            <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${pos.sl > 0 ? "bg-[--bear]/10 text-[--bear]" : "text-gray-600"}`}>
                              <AlertCircle className="w-3 h-3" />{pos.sl > 0 ? pos.sl.toFixed(5) : "No SL"}
                            </span>
                            <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${pos.tp > 0 ? "bg-[--bull]/10 text-[--bull]" : "text-gray-600"}`}>
                              <Target className="w-3 h-3" />{pos.tp > 0 ? pos.tp.toFixed(5) : "No TP"}
                            </span>
                          </div>
                        )}
                      </td>
                      {/* P&L */}
                      <td className={`px-6 py-4 text-right font-mono font-bold ${isProfitable ? "text-[--bull]" : "text-[--bear]"}`}>
                        <div className="text-base">{isProfitable ? "+" : ""}{pos.profit.toFixed(2)}</div>
                        {pos.swap !== 0 && (
                          <div className="text-[10px] text-gray-500 font-normal">Swap: {pos.swap.toFixed(2)}</div>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button onClick={() => modifyPosition(pos.ticket)}
                                className="p-1.5 rounded-lg bg-[--bull]/20 border border-[--bull]/30 text-[--bull] hover:bg-[--bull]/30 transition-colors">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { setEditingTicket(null); setEditSl(""); setEditTp(""); }}
                                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingTicket(pos.ticket); setEditSl(""); setEditTp(""); }}
                                title="Modify SL/TP"
                                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => {
                                  if (window.confirm(`Are you sure you want to close position #${pos.ticket}?`)) {
                                    closePosition(pos.ticket);
                                  }
                                }} 
                                disabled={isClosing}
                                title="Close Position"
                                className="px-3 py-1.5 rounded-lg bg-[--bear]/10 border border-[--bear]/30 text-[--bear] hover:bg-[--bear]/20 transition-colors disabled:opacity-50 text-[10px] uppercase font-bold flex items-center gap-1">
                                {isClosing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><X className="w-3.5 h-3.5" /> Close</>}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        {sorted.length > 0 && (
          <div className="px-6 py-4 border-t border-[--border] flex items-center justify-between text-xs text-gray-500" style={{ backgroundColor: "rgba(255,255,255,0.01)" }}>
            <span>{sorted.length} position{sorted.length !== 1 ? "s" : ""}</span>
            <div className="flex gap-6">
              <span>Swap: <span className="font-mono text-gray-300">{totalSwap.toFixed(2)}</span></span>
              <span>Net Float: <span className={`font-mono font-bold ${totalProfit >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
                {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)}
              </span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
