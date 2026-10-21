"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Bell,
  Newspaper,
  PanelRightClose,
  RefreshCcw,
  X,
  Shield,
  Edit2,
  Check,
  Zap,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { useBridgeUrl } from "@/hooks/useBridgeUrl";
import {
  fetchBridgePositions,
  closeBridgePosition,
  modifyBridgePosition,
} from "@/lib/terminalApi";

interface Position {
  ticket: string;
  pair: string;
  side: "BUY" | "SELL";
  volume: number;
  entry: number;
  price_current?: number;
  sl?: number;
  tp?: number;
  pl: number;
  plPct: number;
}

export function RightSidebar() {
  const { bridgeUrl } = useBridgeUrl();
  const [activeTab, setActiveTab] = useState<"positions" | "alerts" | "news">("positions");
  const [isOpen, setIsOpen] = useState(false);

  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [closingTicket, setClosingTicket] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState<string | null>(null);
  const [editSl, setEditSl] = useState("");
  const [editTp, setEditTp] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Fetch live positions via Express proxy or direct bridge
  const fetchPositions = useCallback(async () => {
    try {
      let rawPositions: any[] = [];
      try {
        const proxyData = await fetchBridgePositions();
        if (proxyData?.success && Array.isArray(proxyData.positions)) {
          rawPositions = proxyData.positions;
        }
      } catch (_) {}

      // Fallback directly to bridgeUrl if proxy returned empty/failed
      if (rawPositions.length === 0 && bridgeUrl) {
        try {
          const res = await fetch(`${bridgeUrl}/api/positions`, {
            headers: { "ngrok-skip-browser-warning": "true" },
          });
          if (res.ok) {
            const data = await res.json();
            rawPositions = data.positions || [];
          }
        } catch (_) {}
      }

      const mapped: Position[] = (rawPositions || [])
        .filter((p: any) => (p.pair || p.symbol) && (p.pair || p.symbol) !== "N/A")
        .map((p: any) => {
          const pl =
            typeof p.profit === "number" && !isNaN(p.profit)
              ? p.profit
              : typeof p.pnl === "number" && !isNaN(p.pnl)
              ? p.pnl
              : 0;
          const entry =
            typeof p.price_open === "number"
              ? p.price_open
              : typeof p.entry === "number"
              ? p.entry
              : 0;
          const side =
            p.direction === "Long" || p.type === 0 || p.side === "BUY" ? "BUY" : "SELL";

          return {
            ticket: String(p.ticket ?? ""),
            pair: p.pair || p.symbol || "XAUUSD",
            side,
            volume: Number(p.volume || p.lot_size || 0.01),
            entry,
            price_current: typeof p.price_current === "number" ? p.price_current : undefined,
            sl: typeof p.sl === "number" ? p.sl : undefined,
            tp: typeof p.tp === "number" ? p.tp : undefined,
            pl,
            plPct: entry > 0 ? (pl / (entry * (p.volume || 1))) * 100 : 0,
          };
        });

      setPositions(mapped.sort((a, b) => b.pl - a.pl));
      setError(null);
    } catch (err: any) {
      setError("Bridge Disconnected");
    } finally {
      setLoading(false);
    }
  }, [bridgeUrl]);

  // Fetch news
  const fetchNews = useCallback(async () => {
    if (news.length === 0) setNewsLoading(true);
    if (!bridgeUrl) return;
    try {
      const res = await fetch(`${bridgeUrl}/api/news`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = await res.json();
      if (data.success && data.news) {
        setNews(data.news);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNewsLoading(false);
    }
  }, [bridgeUrl]);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 3000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  useEffect(() => {
    fetchNews();
    const newsInterval = setInterval(fetchNews, 60000);
    return () => clearInterval(newsInterval);
  }, [fetchNews]);

  // Close a single position
  const handleClose = async (ticket: string) => {
    const numTicket = Number(ticket);
    if (!numTicket) return;
    setClosingTicket(ticket);
    try {
      const res = await closeBridgePosition(numTicket);
      if (res?.success) {
        toast.success(`Position #${ticket} closed.`);
        await fetchPositions();
      } else {
        toast.error(res?.error || "Failed to close position");
      }
    } catch (err: any) {
      toast.error(err?.message || "Close position failed");
    } finally {
      setClosingTicket(null);
    }
  };

  // Move SL to Break-Even (entry price)
  const handleBreakEven = async (pos: Position) => {
    const numTicket = Number(pos.ticket);
    if (!numTicket || !pos.entry) return;
    try {
      const res = await modifyBridgePosition(numTicket, pos.entry, pos.tp);
      if (res?.success) {
        toast.success(`Position #${pos.ticket} SL moved to BE (${pos.entry})`);
        await fetchPositions();
      } else {
        toast.error(res?.error || "Failed to move SL to BE");
      }
    } catch (err: any) {
      toast.error(err?.message || "BE modification failed");
    }
  };

  // Modify custom SL/TP
  const handleModify = async (ticket: string) => {
    const numTicket = Number(ticket);
    if (!numTicket) return;
    try {
      const slVal = editSl ? parseFloat(editSl) : undefined;
      const tpVal = editTp ? parseFloat(editTp) : undefined;
      const res = await modifyBridgePosition(numTicket, slVal, tpVal);
      if (res?.success) {
        toast.success(`Position #${ticket} SL/TP updated.`);
        setEditingTicket(null);
        await fetchPositions();
      } else {
        toast.error(res?.error || "Modify failed");
      }
    } catch (err: any) {
      toast.error(err?.message || "Modify failed");
    }
  };

  // Close all positions
  const handleCloseAll = async (filter?: "winners" | "losers") => {
    const targets = filter
      ? positions.filter((p) => (filter === "winners" ? p.pl > 0 : p.pl < 0))
      : positions;
    if (targets.length === 0) return;

    const label = filter ? `all ${filter}` : "ALL open positions";
    if (!window.confirm(`Are you sure you want to close ${label}?`)) return;

    setBulkLoading(true);
    let closed = 0;
    for (const p of targets) {
      const numTicket = Number(p.ticket);
      if (!numTicket) continue;
      try {
        const res = await closeBridgePosition(numTicket);
        if (res?.success) closed++;
      } catch (_) {}
    }
    toast.success(`Closed ${closed}/${targets.length} positions.`);
    await fetchPositions();
    setBulkLoading(false);
  };

  // Break-Even on all winning trades
  const handleBreakEvenAll = async () => {
    const winners = positions.filter((p) => p.pl > 0 && p.entry);
    if (winners.length === 0) {
      toast.info("No profitable positions to move to BE.");
      return;
    }
    let count = 0;
    for (const p of winners) {
      const numTicket = Number(p.ticket);
      if (!numTicket) continue;
      try {
        const res = await modifyBridgePosition(numTicket, p.entry, p.tp);
        if (res?.success) count++;
      } catch (_) {}
    }
    toast.success(`Moved ${count} positions to Break-Even.`);
    await fetchPositions();
  };

  const totalPnL = positions.reduce((sum, p) => sum + p.pl, 0);
  const totalVolume = positions.reduce((sum, p) => sum + p.volume, 0);
  const hasWinners = positions.some((p) => p.pl > 0);
  const isNetPositive = totalPnL >= 0;

  return (
    <>
      {/* ── Collapsed Toggle Button on Right Edge ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1.5 px-2.5 py-3 rounded-l-xl border-l border-y shadow-2xl transition-all hover:-translate-x-1 cursor-pointer font-mono ${
            positions.length > 0
              ? isNetPositive
                ? "bg-[#0c1a14] border-emerald-500/40 text-emerald-400"
                : "bg-[#1a0e10] border-rose-500/40 text-rose-400"
              : "bg-[#111118] border-zinc-800/60 text-zinc-400 hover:text-white"
          }`}
          title="Open Live Positions & Monitor"
        >
          <div className="flex flex-col items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {positions.length > 0 && (
              <span className="text-[9px] font-black tabular-nums tracking-tighter">
                {isNetPositive ? "+" : ""}${Math.abs(totalPnL).toFixed(0)}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 xl:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Slide-Out Sidebar Panel ── */}
      <div
        className={`
        ${isOpen ? "flex animate-in slide-in-from-right xl:animate-none" : "hidden"} 
        fixed xl:relative xl:w-[320px]
        w-[300px] h-full flex-col right-0 top-0 bottom-0 bg-[#0e0e14] border-l border-white/[0.08] flex-shrink-0 z-50 shadow-2xl xl:shadow-none font-sans
      `}
      >
        {/* Header Bar */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-white/[0.06] bg-[#0c0c11] shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                positions.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
              }`}
            />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-200 font-mono">
              Live Exposure
            </h2>
            {positions.length > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-white font-mono">
                {positions.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPositions()}
              className="text-zinc-500 hover:text-white transition-colors p-1"
              title="Refresh positions"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white transition-colors p-1"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/[0.06] text-[9.5px] font-bold uppercase tracking-wider bg-black/30 p-1 gap-1 font-mono shrink-0">
          <button
            onClick={() => setActiveTab("positions")}
            className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
              activeTab === "positions"
                ? "bg-white/15 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            }`}
          >
            Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
              activeTab === "alerts"
                ? "bg-white/15 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            }`}
          >
            Alerts
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
              activeTab === "news"
                ? "bg-white/15 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            }`}
          >
            News
          </button>
        </div>

        {/* ── Content Area ── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono">
          {/* POSITIONS TAB */}
          {activeTab === "positions" && (
            <div className="space-y-3">
              {/* Summary Strip & Quick Actions */}
              {positions.length > 0 && (
                <div className="rounded-xl border border-white/[0.07] bg-[#121218] p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[8.5px] uppercase tracking-wider text-zinc-500 font-bold">
                        Floating P&L
                      </div>
                      <div
                        className={`text-lg font-black tracking-tight tabular-nums ${
                          isNetPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isNetPositive ? "+" : ""}${totalPnL.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8.5px] uppercase tracking-wider text-zinc-500 font-bold">
                        Active Lots
                      </div>
                      <div className="text-sm font-bold text-zinc-300 tabular-nums">
                        {totalVolume.toFixed(2)} Lots
                      </div>
                    </div>
                  </div>

                  {/* Bulk Execution Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/[0.05]">
                    <button
                      onClick={() => handleBreakEvenAll()}
                      disabled={!hasWinners}
                      className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-[9px] font-bold uppercase tracking-wider disabled:opacity-30 transition-all"
                      title="Move all profitable trades to Break-Even"
                    >
                      <Shield className="w-3 h-3" /> BE All
                    </button>
                    <button
                      onClick={() => handleCloseAll()}
                      disabled={bulkLoading}
                      className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[9px] font-bold uppercase tracking-wider disabled:opacity-30 transition-all"
                      title="Close all open market orders"
                    >
                      <Zap className="w-3 h-3" /> Close All
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded-lg flex items-center gap-2 text-[9px] font-bold">
                  <RefreshCcw className="w-3.5 h-3.5" /> {error}
                </div>
              )}

              {loading && positions.length === 0 && !error ? (
                <div className="text-center py-10 opacity-60">
                  <RefreshCcw className="w-4 h-4 mx-auto mb-2 animate-spin text-[#20e0b2]" />
                  <span className="text-[9.5px] font-bold text-zinc-400">Syncing MT5 Bridge...</span>
                </div>
              ) : positions.length === 0 && !error ? (
                <div className="text-center py-12 text-zinc-500 space-y-2">
                  <TrendingUp className="w-7 h-7 mx-auto opacity-30" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">No Open Positions</p>
                  <p className="text-[8.5px] text-zinc-600 font-sans">
                    Execute orders from the Terminal to see live floating trades here.
                  </p>
                </div>
              ) : (
                positions.map((pos) => {
                  const isPosProfitable = pos.pl >= 0;
                  const isEditing = editingTicket === pos.ticket;

                  return (
                    <div
                      key={pos.ticket}
                      className="border border-white/[0.07] rounded-xl p-3 bg-[#111116] hover:border-white/15 transition-all space-y-2 text-[10px]"
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-white text-[11px]">{pos.pair}</span>
                          <span
                            className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                              pos.side === "BUY"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {pos.side} {pos.volume.toFixed(2)}
                          </span>
                        </div>
                        <span
                          className={`font-black text-xs tabular-nums ${
                            isPosProfitable ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isPosProfitable ? "+" : ""}${pos.pl.toFixed(2)}
                        </span>
                      </div>

                      {/* Prices & Ticket */}
                      <div className="flex items-center justify-between text-[8.5px] text-zinc-400 pt-0.5">
                        <div>
                          <span>Entry: </span>
                          <span className="text-zinc-200 font-bold">{pos.entry}</span>
                        </div>
                        {pos.price_current && (
                          <div>
                            <span>Now: </span>
                            <span className="text-zinc-200 font-bold">{pos.price_current}</span>
                          </div>
                        )}
                        <span className="text-zinc-600">#{pos.ticket}</span>
                      </div>

                      {/* SL / TP Badges */}
                      <div className="flex items-center gap-2 text-[8px] text-zinc-500">
                        <span>SL: {pos.sl ? pos.sl : "None"}</span>
                        <span>•</span>
                        <span>TP: {pos.tp ? pos.tp : "None"}</span>
                      </div>

                      {/* Inline SL/TP Edit Drawer */}
                      {isEditing && (
                        <div className="pt-2 border-t border-white/[0.06] flex items-center gap-1.5">
                          <input
                            type="number"
                            placeholder="SL"
                            value={editSl}
                            onChange={(e) => setEditSl(e.target.value)}
                            className="w-16 px-1.5 py-1 rounded bg-black border border-white/15 text-[9px] text-white font-mono focus:outline-none"
                          />
                          <input
                            type="number"
                            placeholder="TP"
                            value={editTp}
                            onChange={(e) => setEditTp(e.target.value)}
                            className="w-16 px-1.5 py-1 rounded bg-black border border-white/15 text-[9px] text-white font-mono focus:outline-none"
                          />
                          <button
                            onClick={() => handleModify(pos.ticket)}
                            className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            title="Save SL/TP"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingTicket(null)}
                            className="p-1 rounded text-zinc-500 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Action Buttons Row */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.05] gap-1">
                        <button
                          onClick={() => handleBreakEven(pos)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[8.5px] font-bold uppercase tracking-wider border border-white/10 hover:border-sky-500/30 text-zinc-400 hover:text-sky-300 transition-all"
                          title="Snap SL to entry price"
                        >
                          <Shield className="w-2.5 h-2.5" /> BE
                        </button>

                        <button
                          onClick={() => {
                            if (isEditing) {
                              setEditingTicket(null);
                            } else {
                              setEditingTicket(pos.ticket);
                              setEditSl(pos.sl ? String(pos.sl) : "");
                              setEditTp(pos.tp ? String(pos.tp) : "");
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[8.5px] font-bold uppercase tracking-wider border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all"
                          title="Edit Stop Loss & Take Profit"
                        >
                          <Edit2 className="w-2.5 h-2.5" /> SL/TP
                        </button>

                        <button
                          onClick={() => handleClose(pos.ticket)}
                          disabled={closingTicket === pos.ticket}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[8.5px] font-bold uppercase tracking-wider border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all ml-auto disabled:opacity-40"
                          title="Liquidate position immediately"
                        >
                          <X className="w-2.5 h-2.5" /> Close
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ALERTS TAB */}
          {activeTab === "alerts" && (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full text-zinc-500 font-mono font-bold space-y-2">
              <Bell className="w-6 h-6 text-zinc-600 mb-1" />
              <p className="text-[9px] uppercase tracking-widest text-zinc-400">Alerts Standby</p>
              <p className="text-[8.5px] text-zinc-600 font-sans font-normal">
                No active threshold triggers breached.
              </p>
            </div>
          )}

          {/* NEWS TAB */}
          {activeTab === "news" && (
            <div className="space-y-2.5 font-mono text-[9px]">
              {newsLoading && news.length === 0 ? (
                <div className="text-center py-10 opacity-60">
                  <RefreshCcw className="w-4 h-4 mx-auto mb-2 animate-spin text-[#20e0b2]" />
                  <span className="text-[9px] text-zinc-400 font-bold">Fetching Live News...</span>
                </div>
              ) : news.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center h-full text-zinc-500 font-bold space-y-2">
                  <Newspaper className="w-6 h-6 text-zinc-600 mb-1" />
                  <p className="text-[9px] uppercase tracking-widest">No recent headlines</p>
                </div>
              ) : (
                news.slice(0, 15).map((item) => (
                  <a
                    key={item.id}
                    href={item.link || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="block border border-white/[0.07] rounded-xl p-2.5 bg-[#111116] hover:border-sky-500/30 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-1 text-[8px] text-zinc-500">
                      <span>{item.source || "NewsWire"}</span>
                      {item.isHot && (
                        <span className="bg-orange-500/10 text-orange-400 text-[7.5px] font-black uppercase px-1 py-0.2 rounded">
                          HOT
                        </span>
                      )}
                    </div>
                    <h3 className="text-[10px] font-bold text-zinc-300 leading-snug line-clamp-2 mb-1.5 group-hover:text-white transition-colors font-sans">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between text-[7.5px] font-bold uppercase">
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          item.impact === "bullish"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : item.impact === "bearish"
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {item.symbol || "MACRO"} {item.impact || "Neutral"}
                      </span>
                      <span className="text-zinc-600">{item.time || "Recent"}</span>
                    </div>
                  </a>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
