"use client";

import { useState, useEffect, useRef } from "react";
import {
  TrendingUp, TrendingDown, Minus, Clock, Flame, Globe, BarChart3,
  AlertTriangle, Zap, Calendar, ArrowUpRight, ArrowDownRight,
  RefreshCw, Activity, Send, Wifi, WifiOff, Bell, BellOff, Settings,
  CheckCircle, Circle, ExternalLink, Info, Newspaper, Radio, ListFilter,
  ShieldAlert, Activity as ActivityIcon, Target
} from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { NewsImpactHeader } from "@/components/ui/NewsImpactHeader";
import { EventPlaybook } from "@/components/ui/EventPlaybook";
import { BiasSupportCard } from "@/components/ui/BiasSupportCard";
import { LiveWireNewsItem } from "@/components/ui/LiveWireNewsItem";

const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL ?? "/api/bridge";

interface NewsItem { id: string; title: string; summary?: string; time: string; isHot: boolean; impact: "high" | "medium" | "low"; sentiment: "bullish" | "bearish" | "neutral"; symbol: string; source: string; link?: string; }
type SignalDir = "buy" | "sell" | "neutral";
interface Signal { pair: string; signal: SignalDir; strength: number; price: number; change: number; timeframe: string; reason: string; rsi?: number; ema20?: number; ema50?: number; }
interface CalEvent { time: string; event: string; currency: string; forecast: string; previous: string; impact: "high" | "medium" | "low"; actual: string | null; country?: string; }

export default function MacroDeskPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bridgeOn, setBridgeOn] = useState(false);
  const [lastPoll, setLastPoll] = useState<string | null>(null);
  
  const [signals, setSignals] = useState<Signal[]>([]);
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  
  const [alertsOn, setAlertsOn] = useState(false);
  const [fearGreed, setFearGreed] = useState(42);
  const [newsFilter, setNewsFilter] = useState<"all" | "hot">("all");
  const [navDate, setNavDate] = useState(new Date());
  const isFirstFetch = useRef(true);
  const seenIds = useRef(new Set<string>());

  const [selectedDeepDive, setSelectedDeepDive] = useState<NewsItem | CalEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAlertsOn(localStorage.getItem("news_alerts_on") === "true");
    
    const fetchVolatility = async () => {
      try {
        const res = await fetch(`${BRIDGE}/api/calculations`, { headers: { "ngrok-skip-browser-warning": "true" } });
        const data = await res.json();
        if (data.success && data.calculations?.length > 0) {
           const avgScore = data.calculations.reduce((acc: number, c: any) => acc + (c.score || 50), 0) / data.calculations.length;
           setFearGreed(Math.round(avgScore));
        }
      } catch (e) {}
    };
    fetchVolatility();
    const iv = setInterval(fetchVolatility, 15000);
    return () => clearInterval(iv);
  }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch(`${BRIDGE}/api/news`, { headers: { "ngrok-skip-browser-warning": "true" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.news) && data.news.length > 0) {
        setBridgeOn(true); setNews(data.news); setLastPoll(new Date().toLocaleTimeString());
        
        if (alertsOn && !isFirstFetch.current) {
          const fresh = data.news.filter((n: NewsItem) => n.isHot && !seenIds.current.has(n.id));
          fresh.forEach((n: NewsItem) => {
            seenIds.current.add(n.id);
            toast.custom(() => (
              <div className="bg-[#111118] border border-orange-500/35 rounded-xl p-4 w-[380px] shadow-[0_0_20px_rgba(245,158,11,0.15)] font-mono text-[11px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1 bg-orange-500/10 text-orange-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-orange-500/20"><Flame className="w-3 h-3" /> HOT</span>
                  <span className="text-[9px] text-zinc-550">{n.source}</span>
                </div>
                <p className="font-bold text-white leading-tight line-clamp-3">{n.title}</p>
              </div>
            ), { duration: 5000 });
          });
        }
        isFirstFetch.current = false;
      } else { setBridgeOn(false); }
    } catch (e) { setBridgeOn(false); }
    setLoading(false);
  };

  const fetchSignals = async () => {
    try {
      const res = await fetch(`${BRIDGE}/api/technicals`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const data = await res.json();
      if (data.success && data.signals) setSignals(data.signals);
    } catch (_) {}
  };

  const fetchCalendar = async () => {
    try {
      const res = await fetch(`${BRIDGE}/api/calendar`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const data = await res.json();
      if (data.success) setCalEvents(data.events);
    } catch (_) {}
  };

  useEffect(() => {
    fetchNews(); fetchSignals(); fetchCalendar();
    const ivNews = setInterval(fetchNews, 60000);
    const ivSig = setInterval(fetchSignals, 120000);
    const ivCal = setInterval(fetchCalendar, 300000);
    return () => { clearInterval(ivNews); clearInterval(ivSig); clearInterval(ivCal); };
  }, [alertsOn]);

  const fgColor = fearGreed < 25 ? "#ff4d6a" : fearGreed < 45 ? "#f59e0b" : fearGreed < 75 ? "#f4f4f5" : "#00d4a1";
  const fgLabel = fearGreed < 25 ? "Extreme Fear" : fearGreed < 45 ? "Fear" : fearGreed < 75 ? "Neutral" : fearGreed < 90 ? "Greed" : "Extreme Greed";

  const currentNavDayStart = new Date(navDate.getFullYear(), navDate.getMonth(), navDate.getDate()).getTime();
  const currentNavDayEnd = currentNavDayStart + 86400000;
  
  const filteredEvents = calEvents.filter((e: any) => {
    const et = e.timestamp * 1000;
    return et >= currentNavDayStart && et < currentNavDayEnd;
  });

  return (
    <div className="min-h-screen w-full bg-[#05050a] text-text-primary px-4 md:px-6 py-4 flex flex-col gap-4 animate-fade-in pb-16">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111118]/80 p-4 border border-zinc-800/40 rounded-2xl backdrop-blur-xl mt-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-black tracking-tight text-white font-display flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-450 text-blue-400" />
              AI Macro Desk
            </h1>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-1 mt-0.5">
              <Radio className="w-3.5 h-3.5" /> Aggregating global feeds via MT5 Bridge
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap font-mono text-[10px] font-bold">
          <div className="px-3 py-1.5 rounded-lg border flex items-center gap-1.5" style={{ background: bridgeOn ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", borderColor: bridgeOn ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)", color: bridgeOn ? "#34d399" : "#ff4d6a" }}>
            {bridgeOn ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {bridgeOn ? `BRIDGE ACTIVE • ${lastPoll}` : "BRIDGE OFFLINE"}
          </div>
          <button onClick={() => { setAlertsOn(!alertsOn); localStorage.setItem("news_alerts_on", String(!alertsOn)); }} 
            className="px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all bg-white/5 border-white/5 text-zinc-350 hover:bg-white/10">
            {alertsOn ? <Bell className="w-3.5 h-3.5 text-emerald-450" /> : <BellOff className="w-3.5 h-3.5" />} ALERTS {alertsOn?'ON':'OFF'}
          </button>
        </div>
      </div>

      {/* ── TOP KPI ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Fear & Greed Gauge */}
        <div className="col-span-1 md:col-span-2 rounded-xl border border-zinc-800/40 p-4 bg-[#111118] shadow-md">
          <div className="flex items-center justify-between mb-4 font-mono text-[9px] font-bold">
            <h3 className="text-zinc-500 uppercase tracking-widest">Risk Appetite Gauge</h3>
            <span className="uppercase px-2 py-0.5 rounded bg-black/25 text-zinc-350 border border-zinc-850">{fgLabel}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-[32px] font-black leading-none font-mono" style={{ color: fgColor }}>{fearGreed}</div>
            <div className="flex-1 relative h-2.5 rounded-full overflow-hidden bg-black/35 border border-zinc-850">
              <div className="absolute inset-0 opacity-40" style={{ background: "linear-gradient(90deg, #ff4d6a 0%, #f59e0b 50%, #00d4a1 100%)" }}/>
              <div className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] transition-all ease-out duration-1000" style={{ left: `calc(${fearGreed}% - 3px)` }} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-xl border border-zinc-800/40 p-4 bg-[#111118] flex flex-col justify-center shadow-md font-mono">
           <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1.5"><Newspaper className="w-3.5 h-3.5" /> Global Headlines</div>
           <div className="text-2xl font-black text-white leading-none mb-1">{news.length}</div>
           <div className="text-[9px] text-orange-400 font-bold"><Flame className="w-3 h-3 inline pb-0.5"/> {news.filter(n => n.isHot).length} Breaking alerts</div>
        </div>

        <div className="rounded-xl border border-zinc-800/40 p-4 bg-[#111118] flex flex-col justify-center shadow-md font-mono">
           <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1.5"><ActivityIcon className="w-3.5 h-3.5" /> MT5 Signals</div>
           <div className="text-2xl font-black text-white leading-none mb-1">{signals.length}</div>
           <div className="text-[9px] text-emerald-400 font-bold"><Target className="w-3 h-3 inline pb-0.5"/> Active H4 Alignments</div>
        </div>

      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* LEFT COL: NEWS STREAM */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-1.5 font-mono">Live Wire {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-600" />}</h2>
            <div className="flex gap-1.5 font-mono text-[9px] font-bold">
              <button 
                onClick={() => setNewsFilter("all")} 
                className={`px-3 py-1 rounded-md transition-colors ${newsFilter === "all" ? "bg-white/10 text-white" : "text-zinc-550 hover:text-zinc-350"}`}>
                All
              </button>
              <button 
                onClick={() => setNewsFilter("hot")} 
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${newsFilter === "hot" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-zinc-550 hover:text-zinc-350"}`}>
                <Flame className="w-3 h-3" /> Hot
              </button>
            </div>
          </div>

          <div className="space-y-3 h-[700px] overflow-y-auto pr-2 custom-scrollbar">
            {news.filter(n => newsFilter === "all" || n.isHot).map(n => (
              <LiveWireNewsItem 
                key={n.id}
                id={n.id}
                title={n.title}
                source={n.source}
                time={n.time}
                summary={n.summary}
                isHot={n.isHot}
                sentiment={n.sentiment}
                tags={n.title.toUpperCase().includes("FED") ? ["Fed", "US Data"] : ["Macro", n.symbol || "XAUUSD"]}
                heatScore={n.isHot ? 8 : 0}
                selected={!!(selectedDeepDive && 'id' in selectedDeepDive && selectedDeepDive.id === n.id)}
                onClick={() => setSelectedDeepDive(n)}
              />
            ))}
            {news.length === 0 && !loading && (
              <div className="py-20 text-center text-zinc-650 border border-zinc-800/40 border-dashed rounded-xl font-mono text-xs">
                Feed empty. Establishing bridge connection...
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COL: CALENDAR & SIGNALS OR DEEP DIVE */}
        <div className="space-y-4">
          
          {selectedDeepDive ? (
            <div className="space-y-4 animate-fade-in">
               <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                 <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Deep Dive Analytics</h3>
                 <button onClick={() => setSelectedDeepDive(null)} className="text-[9px] font-bold text-zinc-400 hover:text-white bg-[#111118] border border-zinc-800/40 px-3 py-1 rounded-lg transition-colors font-mono uppercase tracking-wider">Close ✕</button>
               </div>
               
               {"id" in selectedDeepDive ? (
                 <>
                   <NewsImpactHeader 
                     headline={selectedDeepDive.title}
                     higherTimeframe={selectedDeepDive.sentiment === 'bullish' ? 'Bullish' : selectedDeepDive.sentiment === 'bearish' ? 'Bearish' : 'Neutral'}
                     intraday={selectedDeepDive.sentiment === 'bullish' ? 'Slightly Bullish' : selectedDeepDive.sentiment === 'bearish' ? 'Slightly Bearish' : 'Ranging'}
                   />
                   <BiasSupportCard 
                     bias={selectedDeepDive.sentiment === 'bullish' ? 'Bullish' : selectedDeepDive.sentiment === 'bearish' ? 'Bearish' : 'Neutral'}
                     bullets={[
                       `${selectedDeepDive.sentiment === 'bullish' ? 'Positive' : 'Negative'} macroeconomic drivers confirmed`,
                       "Central bank forward guidance remains clear",
                       "Institutional positioning aligned with structural trend",
                       "Recent data points support algorithmic continuation"
                     ]}
                   />
                 </>
               ) : (
                 <>
                   <EventPlaybook 
                     title={selectedDeepDive.event}
                     countryCode={selectedDeepDive.currency.slice(0, 2) === "USD" ? "US" : selectedDeepDive.currency.slice(0, 2) === "EUR" ? "EU" : selectedDeepDive.currency.slice(0, 2) === "GBP" ? "UK" : selectedDeepDive.currency.slice(0, 2) === "JPY" ? "JP" : "US"}
                     timeFormatted={selectedDeepDive.time}
                     impactLevel={selectedDeepDive.impact}
                     countdown="in about 10 hours"
                     bullets={[
                       "Shapes near-term central bank rate decisions",
                       "Signals underlying labor / inflation cooling trend",
                       "Historically volatile for related pairs and yields",
                       "Risk of sharp liquidity deterioration on release"
                     ]}
                     impactedCurrency={selectedDeepDive.currency}
                     scenarios={[
                       { label: "Above", type: "above", threshold1: {name: "MAX", value: 150}, threshold2: {name: "ACT", value: 80}, impact1: "Very Bullish", impact2: "Bullish" },
                       { label: "On forecast", type: "on", threshold1: {name: "BANK", value: 50}, threshold2: {name: "FCST", value: 50}, impact1: "Ranging", impact2: "Ranging" },
                       { label: "Below", type: "below", threshold1: {name: "ACT", value: 20}, threshold2: {name: "MIN", value: -20}, impact1: "Bearish", impact2: "Very Bearish" }
                     ]}
                     aiFootnote={`Stronger data (>50) supports ${selectedDeepDive.currency} bullish via hawkish recalibration. Watch broader context during press conference.`}
                   />
                 </>
               )}
            </div>
          ) : (
            <>
              {/* Calendar Widget */}
              <div className="rounded-xl border border-zinc-800/40 p-4 flex flex-col h-[340px] bg-[#111118] shadow-md">
                 <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-850">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono uppercase tracking-widest">
                      <Calendar className="w-4 h-4 text-blue-450"/> Calendar
                    </h3>
                    <div className="flex items-center gap-1 bg-black/25 rounded-lg p-1 border border-zinc-850 font-mono text-[9px] font-bold text-zinc-550">
                      <button onClick={() => setNavDate(new Date(navDate.getTime() - 86400000))} className="px-1.5 py-0.5 rounded hover:text-white transition-colors">◀</button>
                      <span className="w-14 text-center">
                        {navDate.getDate() === new Date().getDate() && navDate.getMonth() === new Date().getMonth() ? "Today" : navDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <button onClick={() => setNavDate(new Date(navDate.getTime() + 86400000))} className="px-1.5 py-0.5 rounded hover:text-white transition-colors">▶</button>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar space-y-2 font-mono text-[10px]">
                   {filteredEvents.length === 0 ? (
                     <div className="text-[11px] text-zinc-600 text-center mt-10 italic">No events scheduled.</div>
                   ) : (
                     filteredEvents.map((e, i) => (
                       <div 
                         key={i} 
                         className="flex gap-3 items-center p-2 rounded-lg cursor-pointer hover:bg-black/20 border border-transparent hover:border-zinc-850/60 transition-colors"
                         onClick={() => setSelectedDeepDive(e)}
                       >
                         <div className="w-10 text-[9px] text-zinc-550 text-right shrink-0">{e.time}</div>
                         <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.impact === 'high' ? 'bg-red-500/90 shadow-[0_0_5px_rgba(255,77,106,0.8)]' : e.impact === 'medium' ? 'bg-orange-400' : 'bg-zinc-700'}`} />
                         <div className="flex-1 min-w-0">
                           <div className="font-bold text-white truncate">{e.event}</div>
                           <div className="text-[8px] text-zinc-550 uppercase mt-0.5">{e.currency} • Est: {e.forecast || '-'}</div>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
              </div>

              {/* MT5 Signals Widget */}
              <div className="rounded-xl border border-zinc-800/40 p-4 flex flex-col h-[340px] bg-[#111118] shadow-md">
                 <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-850">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-mono uppercase tracking-widest"><Target className="w-4 h-4 text-emerald-450"/> Flow Alignment</h3>
                 </div>
                 <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar space-y-2 font-mono text-[10px]">
                   {signals.length === 0 ? (
                     <div className="text-[11px] text-zinc-650 text-center mt-10">No clear H4 alignments detected.</div>
                   ) : (
                     signals.map((s, i) => (
                       <div key={i} className="p-2.5 rounded-lg border border-zinc-850 bg-black/15">
                         <div className="flex justify-between items-center mb-1">
                           <span className="font-bold text-white">{s.pair}</span>
                           <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${s.signal === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : s.signal === 'sell' ? 'bg-red-500/20 text-red-405' : 'bg-zinc-900/60 text-zinc-500'}`}>
                             {s.signal} {s.signal !== 'neutral' && `${s.strength}%`}
                           </span>
                         </div>
                         <div className="text-[9px] text-zinc-500">{s.reason}</div>
                       </div>
                     ))
                   )}
                 </div>
              </div>
            </>
          )}

        </div>

      </div>

    </div>
  );
}
