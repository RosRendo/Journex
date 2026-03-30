"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, Bell, Newspaper, Minimize2, PanelRightClose, RefreshCcw } from "lucide-react";

interface Position {
  ticket: string;
  pair: string;
  side: "BUY" | "SELL";
  entry: number;
  pl: number;
  plPct: number;
}


export function RightSidebar() {
  const [activeTab, setActiveTab] = useState<"positions" | "alerts" | "news">("positions");
  const [isOpen, setIsOpen] = useState(false);
  
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (activeTab !== "positions") return;
    try {
      const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003";
      const res = await fetch(`${bridgeUrl}/api/positions`, { headers: { "ngrok-skip-browser-warning": "true" } });
      if (!res.ok) throw new Error("Bridge offline");
      const data = await res.json();
      
      const mapped: Position[] = (data.positions || []).map((p: any) => ({
        ticket: p.ticket,
        pair: p.symbol,
        side: p.type === 0 ? "BUY" : "SELL",
        entry: p.price_open,
        pl: p.profit,
        plPct: (p.profit / 1000) * 100
      }));
      setPositions(mapped.sort((a,b) => b.pl - a.pl));
      setError(null);
    } catch (err: any) {
      setError("Bridge Disconnected");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  return (
    <>
      {/* Mobile Toggle Button (Visible when closed on mobile) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-[--bg-card] border-l border-y border-[--border] p-2 rounded-l-xl text-[--text-secondary] hover:text-[--text-primary] z-50 shadow-xl xl:hidden"
        >
          <TrendingUp className="w-5 h-5" />
        </button>
      )}

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 xl:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Panel - Always visible inline on xl; conditionally visible fixed on mobile */}
      <div className={`
        ${isOpen ? "fixed animate-in slide-in-from-right" : "hidden"} 
        xl:flex xl:relative xl:w-[300px] xl:animate-none
        w-[280px] h-full flex flex-col right-0 top-0 bottom-0 bg-[--bg-card] border-l border-[--border] flex-shrink-0 z-50 shadow-2xl xl:shadow-none
      `}>
      
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[--border] flex-shrink-0">
        <h2 className="text-[14px] font-bold text-[--text-primary]">Live Monitor</h2>
        <button onClick={() => setIsOpen(false)} className="text-[--text-secondary] hover:text-[--text-primary] transition-colors">
          <PanelRightClose className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[--border] text-[12px] font-bold bg-[--bg-base]">
        <button 
          onClick={() => setActiveTab("positions")} 
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === "positions" ? "border-[--text-primary] text-[--text-primary]" : "border-transparent text-[--text-tertiary] hover:text-[--text-secondary]"}`}
        >
          Positions
        </button>
        <button 
          onClick={() => setActiveTab("alerts")} 
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === "alerts" ? "border-[--text-primary] text-[--text-primary]" : "border-transparent text-[--text-tertiary] hover:text-[--text-secondary]"}`}
        >
          Alerts
        </button>
        <button 
          onClick={() => setActiveTab("news")} 
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${activeTab === "news" ? "border-[--text-primary] text-[--text-primary]" : "border-transparent text-[--text-tertiary] hover:text-[--text-secondary]"}`}
        >
          News
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-4">
        
        {/* Positions View */}
        {activeTab === "positions" && (
          <div className="space-y-4 relative">
            {error && (
              <div className="bg-[--loss]/10 border border-[--loss]/30 text-[--loss] p-3 rounded-lg flex items-center gap-2 text-[11px] font-bold">
                <RefreshCcw className="w-3.5 h-3.5" /> MT5 Bridge Offline
              </div>
            )}
            
            {loading && positions.length === 0 && !error ? (
              <div className="text-center py-10 opacity-50">
                <RefreshCcw className="w-5 h-5 mx-auto mb-2 animate-spin text-[--text-tertiary]" />
                <span className="text-[11px] text-[--text-secondary]">Syncing with MT5...</span>
              </div>
            ) : positions.length === 0 && !error ? (
              <div className="text-center py-10 opacity-50">
                <span className="text-[12px] font-bold text-[--text-secondary]">No Open Positions</span>
              </div>
            ) : (
              positions.map(pos => (
                <div key={pos.ticket} className="border border-[--border] rounded-xl p-4 bg-[--bg-base] hover:border-[--accent] transition-colors group cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-[--text-primary]">{pos.pair}</span>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${pos.side === "BUY" ? "bg-[--profit]/10 text-[--profit]" : "bg-[--loss]/10 text-[--loss]"}`}>
                        {pos.side}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[12px] font-mono font-bold ${pos.pl >= 0 ? "text-[--profit]" : "text-[--loss]"}`}>
                        {pos.pl >= 0 ? "+" : ""}${Math.abs(pos.pl).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <div>
                      <span className="text-[10px] text-[--text-tertiary] uppercase tracking-wider font-bold">Entry: </span>
                      <span className="text-[12px] font-mono text-[--text-secondary]">{pos.entry}</span>
                    </div>
                    {/* Decorative Sparkline */}
                    <div className="w-16 h-4 opacity-50 relative overflow-hidden">
                      <svg viewBox="0 0 100 20" className="w-full h-full" preserveAspectRatio="none">
                        <path 
                          d={pos.pl >= 0 ? "M0,20 L20,15 L40,18 L60,8 L80,12 L100,2" : "M0,2 L20,8 L40,6 L60,15 L80,12 L100,20"} 
                          fill="none" 
                          stroke={pos.pl >= 0 ? "var(--profit)" : "var(--loss)"} 
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
          <div className="flex flex-col items-center justify-center p-8 text-center h-full opacity-50">
            <Bell className="w-8 h-8 text-[--text-tertiary] mb-3" />
            <p className="text-[12px] text-[--text-secondary] font-medium">No new alerts triggered at this time.</p>
          </div>
        )}

        {/* News View */}
        {activeTab === "news" && (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full opacity-50">
            <Newspaper className="w-8 h-8 text-[--text-tertiary] mb-3" />
            <p className="text-[12px] text-[--text-secondary] font-medium">Catching up with world events...</p>
          </div>
        )}

      </div>
    </div>
    </>
  );
}
