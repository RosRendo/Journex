"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, Bell, Newspaper, Minimize2, PanelRightClose, RefreshCcw } from "lucide-react";
import { useBridgeUrl } from "@/hooks/useBridgeUrl";

interface Position {
  ticket: string;
  pair: string;
  side: "BUY" | "SELL";
  entry: number;
  pl: number;
  plPct: number;
}

export function RightSidebar() {
  const { bridgeUrl } = useBridgeUrl();
  const [activeTab, setActiveTab] = useState<"positions" | "alerts" | "news">("positions");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1280) {
      setIsOpen(true);
    }
  }, []);
  
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const fetchPositions = useCallback(async () => {
    if (!bridgeUrl) return;
    try {
      const res = await fetch(`${bridgeUrl}/api/positions`, { headers: { "ngrok-skip-browser-warning": "true" } });
      if (!res.ok) throw new Error("Bridge offline");
      const data = await res.json();
      
      const mapped: Position[] = (data.positions || [])
        .filter((p: any) => p.pair && p.pair !== "N/A") // Skip dummy positions
        .map((p: any) => {
        const pl = typeof p.pnl === "number" && !isNaN(p.pnl) ? p.pnl : 0;
        return {
          ticket: String(p.ticket ?? ""),
          pair: p.pair ?? "N/A",
          side: p.direction === "Long" ? "BUY" : "SELL",
          entry: typeof p.entry === "number" ? p.entry : 0,
          pl,
          plPct: (pl / 1000) * 100,
        };
      });
      setPositions(mapped.sort((a,b) => b.pl - a.pl));
      setError(null);
    } catch (err: any) {
      setError("Bridge Disconnected");
    } finally {
      setLoading(false);
    }
  }, [bridgeUrl]);

  const fetchNews = useCallback(async () => {
    if (news.length === 0) setNewsLoading(true);
    if (!bridgeUrl) return;
    try {
      const res = await fetch(`${bridgeUrl}/api/news`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const data = await res.json();
      if (data.success && data.news) {
        setNews(data.news);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setNewsLoading(false);
    }
  }, [bridgeUrl]);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  useEffect(() => {
    fetchNews();
    const newsInterval = setInterval(fetchNews, 60000);
    return () => clearInterval(newsInterval);
  }, [fetchNews]);

  return (
    <>
      {/* Toggle Button (Visible when closed) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#111118] border-l border-y border-zinc-800/40 p-2.5 rounded-l-xl text-zinc-500 hover:text-white z-50 shadow-xl cursor-pointer transition-all hover:-translate-x-1"
        >
          <TrendingUp className="w-4 h-4 text-emerald-450" />
        </button>
      )}

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-transparent z-40 xl:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Toggle Button for Mobile */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="xl:hidden fixed top-24 right-0 bg-[#111118] border border-zinc-800/40 border-r-0 rounded-l-xl p-2 z-40 text-zinc-500 shadow-lg hover:text-white"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      )}

      {/* Sidebar Panel */}
      <div className={`
        ${isOpen ? "flex animate-in slide-in-from-right xl:animate-none" : "hidden"} 
        fixed xl:relative xl:w-[300px]
        w-[280px] h-full flex-col right-0 top-0 bottom-0 bg-[#111118] border-l border-zinc-800/40 flex-shrink-0 z-50 shadow-2xl xl:shadow-none
      `}>
      
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800/40 flex-shrink-0 bg-black/25">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-300 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Monitor
        </h2>
        <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
          <PanelRightClose className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800/40 text-[9px] font-bold uppercase tracking-widest bg-black/10 p-1 gap-1 font-mono">
        <button 
          onClick={() => setActiveTab("positions")} 
          className={`flex-1 py-1.5 text-center rounded-lg transition-all ${activeTab === "positions" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
        >
          Positions
        </button>
        <button 
          onClick={() => setActiveTab("alerts")} 
          className={`flex-1 py-1.5 text-center rounded-lg transition-all ${activeTab === "alerts" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
        >
          Alerts
        </button>
        <button 
          onClick={() => setActiveTab("news")} 
          className={`flex-1 py-1.5 text-center rounded-lg transition-all ${activeTab === "news" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
        >
          News
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-4 bg-black/10">
        
        {/* Positions View */}
        {activeTab === "positions" && (
          <div className="space-y-3 relative font-mono text-[10px]">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-2 text-[9px] font-bold">
                <RefreshCcw className="w-3.5 h-3.5" /> MT5 Bridge Offline
              </div>
            )}
            
            {loading && positions.length === 0 && !error ? (
              <div className="text-center py-10 opacity-50">
                <RefreshCcw className="w-4 h-4 mx-auto mb-2 animate-spin text-zinc-550" />
                <span className="text-[9px] font-bold text-zinc-500">Syncing with MT5...</span>
              </div>
            ) : positions.length === 0 && !error ? (
              <div className="text-center py-10 text-zinc-550 italic">
                <span>No Open Positions</span>
              </div>
            ) : (
              positions.map(pos => (
                <div key={pos.ticket} className="border border-zinc-850 rounded-xl p-4 bg-black/25 hover:border-emerald-500/20 transition-all group cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-white">#{pos.pair}</span>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${pos.side === "BUY" ? "bg-emerald-500/10 text-emerald-450 text-emerald-450" : "bg-red-500/10 text-red-400"}`}>
                        {pos.side}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-bold ${pos.pl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {pos.pl >= 0 ? "+" : ""}${Math.abs(pos.pl).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <div>
                      <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Entry: </span>
                      <span className="text-[11px] font-bold text-zinc-300">{pos.entry}</span>
                    </div>
                    {/* Decorative Sparkline */}
                    <div className="w-16 h-4 opacity-50 relative overflow-hidden">
                      <svg viewBox="0 0 100 20" className="w-full h-full" preserveAspectRatio="none">
                        <path 
                          d={pos.pl >= 0 ? "M0,20 L20,15 L40,18 L60,8 L80,12 L100,2" : "M0,2 L20,8 L40,6 L60,15 L80,12 L100,20"} 
                          fill="none" 
                          stroke={pos.pl >= 0 ? "#10b981" : "#ef4444"} 
                          strokeWidth="2" 
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Alerts View */}
        {activeTab === "alerts" && (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full text-zinc-550 font-mono font-bold">
            <Bell className="w-6 h-6 text-zinc-650 mb-3" />
            <p className="text-[9px] uppercase tracking-widest">No trigger warnings</p>
          </div>
        )}

        {/* News View */}
        {activeTab === "news" && (
          <div className="space-y-3 font-mono">
            {newsLoading && news.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <RefreshCcw className="w-4 h-4 mx-auto mb-2 animate-spin text-zinc-550" />
                <span className="text-[9px] text-zinc-500 font-bold">Fetching live news...</span>
              </div>
            ) : news.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center h-full text-zinc-550 font-bold">
                <Newspaper className="w-6 h-6 text-zinc-650 mb-3" />
                <p className="text-[9px] uppercase tracking-widest">No recent news</p>
              </div>
            ) : (
              news.map(item => (
                <a key={item.id} href={item.link} target="_blank" rel="noreferrer" className="block border border-zinc-850 rounded-xl p-3 bg-black/25 hover:border-blue-500/20 transition-all group">
                  <div className="flex justify-between items-start mb-2 text-[8px] text-zinc-500 font-bold">
                    <span>{item.source} • {item.time}</span>
                    {item.isHot && <span className="bg-orange-500/10 text-orange-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">HOT</span>}
                  </div>
                  <h3 className="text-[11px] font-bold text-zinc-300 leading-snug line-clamp-3 mb-2 group-hover:text-white transition-colors font-sans">
                    {item.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded ${item.impact === "bullish" ? "bg-emerald-500/10 text-emerald-450" : item.impact === "bearish" ? "bg-red-500/10 text-red-400" : "bg-zinc-800 text-zinc-400"}`}>
                      {item.symbol} {item.impact}
                    </span>
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
