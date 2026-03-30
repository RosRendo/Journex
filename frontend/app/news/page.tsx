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

const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL ?? "http://localhost:5003";

/* ── Types ── */
interface NewsItem { id: string; title: string; summary?: string; time: string; isHot: boolean; impact: "high" | "medium" | "low"; sentiment: "bullish" | "bearish" | "neutral"; symbol: string; source: string; link?: string; }
type SignalDir = "buy" | "sell" | "neutral";
interface Signal { pair: string; signal: SignalDir; strength: number; price: number; change: number; timeframe: string; reason: string; rsi?: number; ema20?: number; ema50?: number; }
interface CalEvent { time: string; event: string; currency: string; forecast: string; previous: string; impact: "high" | "medium" | "low"; actual: string | null; country?: string; }

async function notifyBridge(msg: string, d: string, t: string, c: string) {
  try {
    await fetch(`${BRIDGE}/api/notify`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, discordWebhookUrl: d || null, telegramBotToken: t || null, telegramChatId: c || null })
    });
  } catch (_) {}
}

export default function MacroDeskPage() {
  /* State */
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bridgeOn, setBridgeOn] = useState(false);
  const [lastPoll, setLastPoll] = useState<string | null>(null);
  
  const [signals, setSignals] = useState<Signal[]>([]);
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  
  const [alertsOn, setAlertsOn] = useState(false);
  const [fearGreed, setFearGreed] = useState(42); // 0-100 Mock
  const isFirstFetch = useRef(true);
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAlertsOn(localStorage.getItem("news_alerts_on") === "true");
    
    // Simulate Fear/Greed fluctuations
    const iv = setInterval(() => {
      setFearGreed(prev => {
        const drift = Math.floor(Math.random() * 5) - 2;
        return Math.min(100, Math.max(0, prev + drift));
      });
    }, 15000);
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
              <div className="bg-[--bg-card] border border-[--warning] rounded-xl p-4 w-[380px] shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1 bg-[--warning]/20 text-[--warning] text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm"><Flame className="w-3 h-3" /> HOT</span>
                  <span className="text-[10px] text-[--text-tertiary]">{n.source}</span>
                </div>
                <p className="text-[13px] font-bold text-[--text-primary] leading-tight line-clamp-3">{n.title}</p>
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

  const fgColor = fearGreed < 25 ? "var(--loss)" : fearGreed < 45 ? "var(--warning)" : fearGreed < 75 ? "var(--text-primary)" : "var(--profit)";
  const fgLabel = fearGreed < 25 ? "Extreme Fear" : fearGreed < 45 ? "Fear" : fearGreed < 75 ? "Neutral" : fearGreed < 90 ? "Greed" : "Extreme Greed";

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight mb-1 flex items-center gap-3" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
            <Globe className="w-7 h-7 text-[--accent]" /> AI Macro Desk
          </h1>
          <p className="text-[13px] font-medium flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <Radio className="w-3.5 h-3.5" /> Aggregating global feeds via MT5 Bridge
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ background: bridgeOn ? "rgba(0,212,161,0.1)" : "rgba(255,77,106,0.1)", borderColor: bridgeOn ? "rgba(0,212,161,0.3)" : "rgba(255,77,106,0.3)", color: bridgeOn ? "var(--profit)" : "var(--loss)" }}>
            {bridgeOn ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {bridgeOn ? `BRIDGE ACTIVE • ${lastPoll}` : "BRIDGE OFFLINE"}
          </div>
          <button onClick={() => { setAlertsOn(!alertsOn); localStorage.setItem("news_alerts_on", String(!alertsOn)); }} 
            className="px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            style={{ background: alertsOn ? "var(--bg-elevated)" : "transparent", borderColor: alertsOn ? "var(--accent)" : "var(--border)", color: alertsOn ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            {alertsOn ? <Bell className="w-3 h-3 text-[--accent]" /> : <BellOff className="w-3 h-3" />} ALERTS {alertsOn?'ON':'OFF'}
          </button>
        </div>
      </div>

      {/* ── TOP KPI ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Fear & Greed Gauge */}
        <div className="col-span-1 md:col-span-2 rounded-2xl border p-5 bg-[--bg-card]" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold uppercase tracking-widest text-[--text-tertiary]">Risk Appetite</h3>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[--bg-elevated] text-[--text-secondary]">{fgLabel}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-[48px] font-black leading-none font-mono" style={{ color: fgColor }}>{fearGreed}</div>
            <div className="flex-1 relative h-3 rounded-full overflow-hidden bg-[--bg-base] border border-[--border]">
              {/* Gradient Bar */}
              <div className="absolute inset-0 opacity-50" style={{ background: "linear-gradient(90deg, #ff4d6a 0%, #f59e0b 50%, #00d4a1 100%)" }}/>
              {/* Thumb */}
              <div className="absolute top-0 bottom-0 w-2 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all ease-out duration-1000" style={{ left: `calc(${fearGreed}% - 4px)` }} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-2xl border p-5 bg-[--bg-card] flex flex-col justify-center" style={{ borderColor: "var(--border)" }}>
           <div className="text-[13px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-2 flex items-center gap-2"><Newspaper className="w-4 h-4" /> Global Headlines</div>
           <div className="text-[32px] font-bold text-[--text-primary] leading-none mb-1">{news.length}</div>
           <div className="text-[11px] text-[--warning] font-bold"><Flame className="w-3 h-3 inline pb-0.5"/> {news.filter(n => n.isHot).length} Breaking alerts</div>
        </div>

        <div className="rounded-2xl border p-5 bg-[--bg-card] flex flex-col justify-center" style={{ borderColor: "var(--border)" }}>
           <div className="text-[13px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-2 flex items-center gap-2"><ActivityIcon className="w-4 h-4" /> MT5 Signals</div>
           <div className="text-[32px] font-bold text-[--text-primary] leading-none mb-1">{signals.length}</div>
           <div className="text-[11px] text-[--profit] font-bold"><Target className="w-3 h-3 inline pb-0.5"/> Active H4 Alignments</div>
        </div>

      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COL: NEWS STREAM */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-[18px] font-bold text-[--text-primary]">Live Wire</h2>
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-[--text-tertiary]" />}
          </div>

          <div className="space-y-3 h-[700px] overflow-y-auto pr-2 custom-scrollbar">
            {news.map(n => (
              <div key={n.id} className="p-4 rounded-xl border transition-colors hover:bg-[--bg-elevated] cursor-pointer" 
                   style={{ background: n.isHot ? "rgba(245,158,11,0.03)" : "var(--bg-card)", borderColor: n.isHot ? "rgba(245,158,11,0.3)" : "var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {n.isHot && <span className="bg-[--warning] text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(245,158,11,0.5)]"><Flame className="w-3 h-3 inline"/> HOT</span>}
                    <span className="text-[11px] font-bold uppercase text-[--text-secondary] bg-[--bg-base] px-2 py-0.5 border border-[--border] rounded">{n.source}</span>
                    <span className="text-[11px] font-mono text-[--text-tertiary]">{n.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {n.sentiment === 'bullish' && <span className="text-[10px] uppercase font-bold text-[--profit] flex items-center"><TrendingUp className="w-3 h-3 mr-0.5"/> Bull</span>}
                    {n.sentiment === 'bearish' && <span className="text-[10px] uppercase font-bold text-[--loss] flex items-center"><TrendingDown className="w-3 h-3 mr-0.5"/> Bear</span>}
                    {n.sentiment === 'neutral' && <span className="text-[10px] uppercase font-bold text-[--text-tertiary] flex items-center"><Minus className="w-3 h-3 mr-0.5"/> Neu</span>}
                  </div>
                </div>
                <h4 className="text-[14px] font-bold text-[--text-primary] leading-snug mb-1">{n.title}</h4>
                {n.summary && <p className="text-[12px] text-[--text-secondary] line-clamp-2 leading-relaxed">{n.summary}</p>}
              </div>
            ))}
            {news.length === 0 && !loading && (
              <div className="py-20 text-center text-[--text-tertiary] border border-[--border] border-dashed rounded-xl">
                Feed empty. Establishing bridge connection...
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COL: CALENDAR & SIGNALS */}
        <div className="space-y-6">
          
          {/* Calendar Widget */}
          <div className="rounded-2xl border p-5 flex flex-col h-[340px]" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
             <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-[14px] font-bold text-[--text-primary] flex items-center gap-2"><Calendar className="w-4 h-4 text-[#3b82f6]"/> Economic Calendar</h3>
             </div>
             <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
               {calEvents.slice(0, 15).map((e, i) => (
                 <div key={i} className="flex gap-3 items-center">
                   <div className="w-12 text-[11px] font-mono text-[--text-tertiary] text-right shrink-0">{e.time}</div>
                   <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.impact === 'high' ? 'bg-[--loss] shadow-[0_0_5px_rgba(255,77,106,0.8)]' : e.impact === 'medium' ? 'bg-[--warning]' : 'bg-[--text-tertiary]'}`} />
                   <div className="flex-1 min-w-0">
                     <div className="text-[12px] font-bold text-[--text-primary] truncate">{e.event}</div>
                     <div className="text-[10px] font-bold text-[--text-secondary] uppercase">{e.currency} • Est: {e.forecast || '-'}</div>
                   </div>
                 </div>
               ))}
             </div>
          </div>

          {/* MT5 Signals Widget */}
          <div className="rounded-2xl border p-5 flex flex-col h-[340px]" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
             <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-[14px] font-bold text-[--text-primary] flex items-center gap-2"><Target className="w-4 h-4 text-[--accent]"/> Flow Alignment</h3>
             </div>
             <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
               {signals.length === 0 ? (
                 <div className="text-[12px] text-[--text-tertiary] text-center mt-10">No clear H4 alignments detected.</div>
               ) : (
                 signals.map((s, i) => (
                   <div key={i} className="p-3 rounded-lg border bg-[--bg-base]" style={{ borderColor: "var(--border)" }}>
                     <div className="flex justify-between items-center mb-1">
                       <span className="font-bold font-mono text-[13px] text-[--text-primary]">{s.pair}</span>
                       <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${s.signal === 'buy' ? 'bg-[--bull] text-black' : s.signal === 'sell' ? 'bg-[--bear] text-white' : 'bg-[--bg-elevated] text-[--text-tertiary]'}`}>
                         {s.signal} {s.signal !== 'neutral' && `${s.strength}%`}
                       </span>
                     </div>
                     <div className="text-[11px] text-[--text-secondary]">{s.reason}</div>
                   </div>
                 ))
               )}
             </div>
          </div>

        </div>

      </div>

    </div>
  );
}
