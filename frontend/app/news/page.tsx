"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    TrendingUp, TrendingDown, Minus, Clock, Flame, Globe, BarChart3,
    AlertTriangle, Zap, Calendar, ArrowUpRight, ArrowDownRight,
    RefreshCw, Activity, Send, Wifi, WifiOff, Bell, BellOff,
    Settings, CheckCircle, Circle, ExternalLink, Info, Newspaper,
    Radio, ListFilter,
} from "lucide-react";
import { toast } from "sonner";

const BRIDGE = "\";

/* ────────────────── Types ──────────────────────────────── */
interface NewsItem {
    id: string; title: string; summary?: string; time: string;
    isHot: boolean; impact: "high" | "medium" | "low";
    sentiment: "bullish" | "bearish" | "neutral";
    symbol: string; source: string; link?: string;
}
type SignalDir = "buy" | "sell" | "neutral";
interface Signal {
    pair: string; signal: SignalDir; strength: number;
    price: number; change: number; timeframe: string;
    reason: string; rsi?: number; ema20?: number; ema50?: number;
}
interface CalEvent {
    time: string; event: string; currency: string;
    forecast: string; previous: string;
    impact: "high" | "medium" | "low"; actual: string | null;
    country?: string;
}
interface CheckItem { label: string; description: string; checked: boolean; }

/* ── Only checklist stays static (user-driven) ──────────── */

const CHECKLIST: CheckItem[] = [
    { label: "Trend Alignment (HTF)", description: "Higher timeframe trend matches signal direction", checked: true },
    { label: "Key Level Confluence", description: "Signal occurs at support/resistance or pivot zone", checked: true },
    { label: "Volume Confirmation", description: "Above-average volume supports the move", checked: false },
    { label: "Momentum Indicator", description: "RSI / MACD / Stoch aligns with entry direction", checked: true },
    { label: "No Major News Risk", description: "No high-impact event within the next 2 hours", checked: false },
    { label: "Risk:Reward ≥ 1:2", description: "Potential reward is at least 2× the risk", checked: true },
];

/* ────────────────── Small components ───────────────────── */
function SignalBadge({ signal }: { signal: SignalDir }) {
    if (signal === "buy")
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-md border border-green-500/30 bg-green-500/10 text-green-400"><TrendingUp className="w-3 h-3" /> BUY</span>;
    if (signal === "sell")
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-400"><TrendingDown className="w-3 h-3" /> SELL</span>;
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-md border border-border bg-card border border-border text-card-foreground shadow-sm text-muted-foreground"><Minus className="w-3 h-3" /> NEUTRAL</span>;
}
function ImpactDot({ impact }: { impact: string }) {
    const c = { high: "bg-red-500", medium: "bg-yellow-500", low: "bg-muted/80" }[impact] ?? "bg-muted/80";
    return <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${c}`} /><span className="text-[10px] text-muted-foreground capitalize">{impact}</span></div>;
}
function StrengthBar({ v, signal }: { v: number; signal: SignalDir }) {
    const color = signal === "buy" ? "#22c55e" : signal === "sell" ? "#ef4444" : "#6b7280";
    return <div className="flex items-center gap-1.5"><div className="w-16 h-1.5 rounded-full bg-card border border-border text-card-foreground shadow-sm overflow-hidden"><div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: color }} /></div><span className="text-[11px] text-muted-foreground tabular-nums">{v}%</span></div>;
}

const SENTIMENT_PILL: Record<string, string> = {
    bullish: "border-green-500/30 text-green-400 bg-green-500/10",
    bearish: "border-red-500/30 text-red-400 bg-red-500/10",
    neutral: "border-border text-muted-foreground bg-card border border-border text-card-foreground shadow-sm",
};
const SENTIMENT_ICON: Record<string, React.ReactNode> = {
    bullish: <TrendingUp className="w-3 h-3" />,
    bearish: <TrendingDown className="w-3 h-3" />,
    neutral: <Minus className="w-3 h-3" />,
};
const SOURCE_STYLES: Record<string, string> = {
    ForexLive: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    FXStreet: "border-purple-500/30 bg-purple-500/10 text-purple-400",
    MarketWatch: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    "Reuters Biz": "border-orange-500/30 bg-orange-500/10 text-orange-400",
};

async function notifyBridge(msg: string, d: string, t: string, c: string) {
    try {
        await fetch(`${BRIDGE}/api/notify`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg, discordWebhookUrl: d || null, telegramBotToken: t || null, telegramChatId: c || null }),
        });
    } catch (_) { }
}

/* ════════════════════════════════════════════════════════ */
export default function NewsMacroInsights() {
    /* news */
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [bridgeOn, setBridgeOn] = useState(false);
    const [lastPoll, setLastPoll] = useState<string | null>(null);
    const [activeSources, setActiveSources] = useState<string[]>([]);
    const [newsFilter, setNewsFilter] = useState("All");
    const [activeSource, setActiveSource] = useState("All");
    const seenIds = useRef(new Set<string>());

    /* live signals from MT5 */
    const [signals, setSignals] = useState<Signal[]>([]);
    const [signalsLoading, setSignalsLoading] = useState(true);

    /* live calendar from ForexFactory */
    const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
    const [calLoading, setCalLoading] = useState(true);
    const [calDate, setCalDate] = useState("");

    /* checklist */
    const [checklist, setChecklist] = useState<CheckItem[]>(CHECKLIST);
    const toggle = (i: number) =>
        setChecklist(p => p.map((c, idx) => idx === i ? { ...c, checked: !c.checked } : c));

    /* alert config */
    const [alertsOn, setAlertsOn] = useState(false);
    const [showCfg, setShowCfg] = useState(false);
    const [discordUrl, setDiscordUrl] = useState("");
    const [tgToken, setTgToken] = useState("");
    const [tgChat, setTgChat] = useState("");

    useEffect(() => {
        if (typeof window === "undefined") return;
        setDiscordUrl(localStorage.getItem("news_discord") || "");
        setTgToken(localStorage.getItem("news_tg_token") || "");
        setTgChat(localStorage.getItem("news_tg_chat") || "");
        setAlertsOn(localStorage.getItem("news_alerts_on") === "true");
    }, []);

    const saveConfig = () => {
        localStorage.setItem("news_discord", discordUrl);
        localStorage.setItem("news_tg_token", tgToken);
        localStorage.setItem("news_tg_chat", tgChat);
        localStorage.setItem("news_alerts_on", String(alertsOn));
        setShowCfg(false);
        toast.success("Alert settings saved!");
    };

    const isFirstFetch = useRef(true);

    const fetchNews = async () => {
        try {
            const res = await fetch(`${BRIDGE}/api/news`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.news) && data.news.length > 0) {
                setBridgeOn(true);
                setNews(data.news);
                setLastPoll(new Date().toLocaleTimeString());
                const srcs = [...new Set<string>(data.news.map((n: NewsItem) => n.source))];
                setActiveSources(srcs);

                if (alertsOn) {
                    const fresh = data.news.filter((n: NewsItem) => n.isHot && !seenIds.current.has(n.id));
                    fresh.forEach((n: NewsItem) => {
                        seenIds.current.add(n.id);
                        if (!isFirstFetch.current) {
                            notifyBridge(`🔥 BREAKING FOREX NEWS [${n.source}]\n${n.title}\n📈 ${n.symbol}`, discordUrl, tgToken, tgChat);
                            toast.custom(() => (
                                <div className="bg-[#121008] border border-orange-500/40 rounded-xl p-4 w-[380px] relative overflow-hidden shadow-[0_0_40px_rgba(249,115,22,0.15)]">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                                    <div className="flex items-center gap-2 mb-2 ml-2">
                                        <span className="flex items-center gap-1 bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm">
                                            <Flame className="w-3 h-3 fill-orange-400" /> HOT
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">{n.source}</span>
                                    </div>
                                    <p className="ml-2 text-sm font-bold text-foreground leading-tight line-clamp-3">{n.title}</p>
                                    <div className="ml-2 mt-2 flex gap-2">
                                        <span className="text-[10px] border border-border bg-card text-card-foreground shadow-sm text-foreground/80 rounded px-2 py-0.5">{n.symbol}</span>
                                        <span className={`text-[10px] border rounded px-2 py-0.5 capitalize flex items-center gap-1 ${SENTIMENT_PILL[n.sentiment]}`}>
                                            {SENTIMENT_ICON[n.sentiment]} {n.sentiment}
                                        </span>
                                    </div>
                                </div>
                            ), { position: "top-right", duration: 9000 });
                        }
                    });
                }
                isFirstFetch.current = false;
            } else {
                setBridgeOn(false);
            }
        } catch (e) {
            console.warn("[news] bridge error:", e);
            setBridgeOn(false);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchNews();
        const id = setInterval(fetchNews, 60_000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alertsOn, discordUrl, tgToken, tgChat]);

    // ── Fetch live signals from MT5 H4 candles ──
    const fetchSignals = async () => {
        setSignalsLoading(true);
        try {
            const res = await fetch(`${BRIDGE}/api/technicals`);
            const data = await res.json();
            if (data.success && data.signals?.length) setSignals(data.signals);
        } catch (_) { }
        setSignalsLoading(false);
    };
    useEffect(() => {
        fetchSignals();
        const id = setInterval(fetchSignals, 120_000); // refresh every 2 min
        return () => clearInterval(id);
    }, []);

    // ── Fetch today's calendar from ForexFactory ──
    const fetchCalendar = async () => {
        setCalLoading(true);
        try {
            const res = await fetch(`${BRIDGE}/api/calendar`);
            const data = await res.json();
            if (data.success) { setCalEvents(data.events); setCalDate(data.date); }
        } catch (_) { }
        setCalLoading(false);
    };
    useEffect(() => {
        fetchCalendar();
        const id = setInterval(fetchCalendar, 300_000); // refresh every 5 min
        return () => clearInterval(id);
    }, []);

    // ── Session active check (real UTC) ──
    const utcH = new Date().getUTCHours();
    const SESSIONS = [
        { label: "Tokyo", hours: "00:00–09:00 UTC", active: utcH >= 0 && utcH < 9, note: "JPY pairs" },
        { label: "London", hours: "08:00–17:00 UTC", active: utcH >= 8 && utcH < 17, note: "EUR / GBP" },
        { label: "New York", hours: "13:00–22:00 UTC", active: utcH >= 13 && utcH < 22, note: "USD / Gold" },
    ];

    const SYMBOL_FILTERS = ["All", "Hot", "XAUUSD", "USD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD", "OIL"];
    const filteredNews = news.filter(n => {
        const matchSymbol = newsFilter === "All" ? true
            : newsFilter === "Hot" ? n.isHot
                : n.symbol.includes(newsFilter);
        const matchSource = activeSource === "All" ? true : n.source === activeSource;
        return matchSymbol && matchSource;
    });

    const confirmed = checklist.filter(c => c.checked).length;
    const confirmPct = Math.round((confirmed / checklist.length) * 100);
    const hotCount = news.filter(n => n.isHot).length;

    /* ─────────── RENDER ──────────────────────────────────── */
    return (
        <div className="min-h-screen bg-[#050505] text-slate-300 space-y-5 relative">
            {/* Ambient glows */}
            <div className="fixed top-0 left-[25%] w-[50%] h-[300px] bg-purple-900/8 blur-[140px] rounded-full pointer-events-none z-0" />
            <div className="fixed bottom-0 right-0 w-[30%] h-[40%] bg-indigo-900/8 blur-[120px] rounded-full pointer-events-none z-0" />

            {/* ── Header ───────────────────────────────────── */}
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Market News &amp; Signals</h1>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Radio className="w-3 h-3" />
                        {bridgeOn
                            ? `Aggregating ${activeSources.length} source${activeSources.length !== 1 ? "s" : ""}: ${activeSources.join(" · ")} · refreshes every 60s`
                            : "Connecting to MT5 bridge…"}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${bridgeOn ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-red-500/30 text-red-400 bg-red-500/10"}`}>
                        {bridgeOn ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {bridgeOn ? `Live · ${lastPoll}` : "Bridge offline"}
                    </div>
                    <div onClick={() => { const v = !alertsOn; setAlertsOn(v); localStorage.setItem("news_alerts_on", String(v)); }}
                        className={`cursor-pointer flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${alertsOn ? "border-orange-500/30 text-orange-400 bg-orange-500/10" : "border-border text-muted-foreground"}`}>
                        {alertsOn ? <Bell className="w-3 h-3 animate-pulse" /> : <BellOff className="w-3 h-3" />}
                        {alertsOn ? "Alerts ON" : "Alerts OFF"}
                    </div>
                    <Button variant="outline" size="sm" className="h-8 border-border hover:bg-card border border-border text-card-foreground shadow-sm gap-1.5 text-foreground/80"
                        onClick={() => { setLoading(true); fetchNews(); }}>
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 border-border hover:bg-card border border-border text-card-foreground shadow-sm gap-1.5 text-foreground/80"
                        onClick={() => setShowCfg(!showCfg)}>
                        <Settings className="w-3.5 h-3.5" /> Alerts
                    </Button>
                </div>
            </div>

            {/* ── Alert Config Panel ────────────────────────── */}
            {showCfg && (
                <div className="relative z-10 bg-[#0d0d0d] border border-orange-500/30 rounded-2xl p-5 animate-in slide-in-from-top-4 shadow-[0_0_30px_rgba(249,115,22,0.07)]">
                    <h3 className="text-sm font-bold text-orange-400 flex items-center gap-2 mb-4"><Send className="w-4 h-4" /> Discord &amp; Telegram Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Discord Webhook URL</Label>
                            <Input value={discordUrl} onChange={e => setDiscordUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/…" className="h-8 text-xs bg-background hover:bg-muted text-foreground border-border" /></div>
                        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Telegram Bot Token</Label>
                            <Input value={tgToken} onChange={e => setTgToken(e.target.value)} placeholder="123456:ABC-DEF…" className="h-8 text-xs bg-background hover:bg-muted text-foreground border-border" /></div>
                        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Telegram Chat ID</Label>
                            <Input value={tgChat} onChange={e => setTgChat(e.target.value)} placeholder="-1001234567890" className="h-8 text-xs bg-background hover:bg-muted text-foreground border-border" /></div>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center gap-3"><Switch checked={alertsOn} onCheckedChange={setAlertsOn} />
                            <Label className="text-xs text-muted-foreground">Auto-send 🔥 HOT alerts to Discord &amp; Telegram</Label></div>
                        <Button size="sm" onClick={saveConfig} className="gap-1.5 bg-orange-600 hover:bg-orange-500 text-foreground h-8"><Send className="w-3.5 h-3.5" /> Save</Button>
                    </div>
                </div>
            )}

            {/* ── Sentiment bar ─────────────────────────────── */}
            <div className="relative z-10 bg-[#0b0b0b] border border-border/80 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /><span className="text-sm font-semibold text-foreground">Market Sentiment</span></div>
                    <div className="flex items-center gap-2">
                        <div className="w-28 h-2 rounded-full bg-card border border-border text-card-foreground shadow-sm overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: "62%" }} /></div>
                        <span className="text-xs text-green-400 tabular-nums">62% Bullish</span>
                    </div>
                </div>
                <div className="flex items-center gap-5 text-xs text-muted-foreground">
                    <span>Fear &amp; Greed: <b className="text-yellow-400">58</b></span>
                    <span>VIX: <b className="text-green-400">14.2</b></span>
                    <span>DXY: <b className="text-red-400">104.32</b></span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Live</span>
                </div>
            </div>

            {/* ── Stats quick row (news-only) ───────────────── */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Headlines", value: news.length, icon: Newspaper, color: "text-blue-400" },
                    { label: "Breaking", value: hotCount, icon: Flame, color: "text-orange-400" },
                    { label: "Bullish", value: news.filter(n => n.sentiment === "bullish").length, icon: TrendingUp, color: "text-green-400" },
                    { label: "Bearish", value: news.filter(n => n.sentiment === "bearish").length, icon: TrendingDown, color: "text-red-400" },
                ].map(s => (
                    <div key={s.label} className="bg-[#0b0b0b] border border-border rounded-xl p-3.5 flex items-center gap-3">
                        <s.icon className={`w-5 h-5 ${s.color}`} />
                        <div><p className="text-lg font-bold text-foreground">{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></div>
                    </div>
                ))}
            </div>

            {/* ── Main Tabs ─────────────────────────────────── */}
            <div className="relative z-10">
                <Tabs defaultValue="news" className="space-y-4">
                    <TabsList className="bg-[#0b0b0b] border border-border p-1 rounded-xl h-auto gap-1">
                        {[
                            { value: "news", label: "News Feed", Icon: Globe },
                            { value: "signals", label: "Signals", Icon: Flame },
                            { value: "calendar", label: "Calendar", Icon: Calendar },
                            { value: "confirmation", label: "Confirmation", Icon: BarChart3 },
                        ].map(({ value, label, Icon }) => (
                            <TabsTrigger key={value} value={value}
                                className="gap-1.5 text-xs font-medium data-[state=active]:bg-card border border-border text-card-foreground shadow-sm data-[state=active]:text-foreground text-muted-foreground rounded-lg px-4 py-2">
                                <Icon className="w-3.5 h-3.5" /> {label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* ══ NEWS FEED ══════════════════════════════ */}
                    <TabsContent value="news">
                        {/* Symbol filter pills */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <ListFilter className="w-3.5 h-3.5 text-gray-600" />
                            {SYMBOL_FILTERS.map(f => (
                                <button key={f} onClick={() => setNewsFilter(f)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${newsFilter === f
                                        ? f === "Hot" ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                                            : "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                        : "text-muted-foreground border-border hover:border-border hover:text-foreground/80"}`}>
                                    {f === "Hot" && <Flame className="inline w-3 h-3 mr-0.5" />}{f}
                                </button>
                            ))}
                            <span className="ml-auto text-[10px] text-gray-700">Filter by source:</span>
                            {["All", ...activeSources].map(src => (
                                <button key={src} onClick={() => setActiveSource(src)}
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-all ${activeSource === src
                                        ? "bg-muted border border-border/50 text-foreground text-foreground border-border/50"
                                        : "text-gray-600 border-border hover:border-border"}`}>
                                    {src}
                                </button>
                            ))}
                        </div>

                        <ScrollArea className="h-[600px]">
                            <div className="space-y-3 pr-1">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-700">
                                        <Activity className="w-7 h-7 animate-pulse text-orange-500/40" />
                                        <p className="text-sm">Fetching live headlines from {activeSources.length || "RSS sources"}…</p>
                                    </div>
                                ) : filteredNews.length === 0 ? (
                                    <div className="text-center py-24 border border-dashed border-border rounded-2xl text-gray-700">
                                        <Info className="w-7 h-7 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">No articles match the current filter.</p>
                                        {!bridgeOn && <p className="text-xs mt-1 text-red-500/60">MT5 Bridge must be running: <code>python mt5_bridge.py</code></p>}
                                    </div>
                                ) : filteredNews.map(n => (
                                    <div key={n.id}
                                        className={`relative rounded-2xl border overflow-hidden group cursor-pointer transition-all
                      ${n.isHot ? "bg-[#121008] border-orange-500/25 shadow-[0_0_12px_rgba(249,115,22,0.06)] hover:border-orange-500/50"
                                                : "bg-[#0b0b0b] border-border hover:border-border"}`}>
                                        {n.isHot && <div className="absolute top-0 left-0 w-0.5 h-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />}
                                        <div className="p-4 pl-5">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2 text-[10px] flex-wrap">
                                                    {n.isHot && (
                                                        <span className="flex items-center gap-0.5 bg-orange-500/20 text-orange-400 font-bold uppercase px-1.5 py-0.5 rounded-sm tracking-wider">
                                                            <Flame className="w-2.5 h-2.5 fill-orange-400" /> HOT
                                                        </span>
                                                    )}
                                                    <span className={`border rounded px-1.5 py-0.5 font-medium ${SOURCE_STYLES[n.source] ?? "border-border text-muted-foreground bg-card border border-border text-card-foreground shadow-sm"}`}>
                                                        {n.source}
                                                    </span>
                                                    <span className="text-gray-600 flex items-center gap-1"><Clock className="w-3 h-3" />{n.time}</span>
                                                    <span className="border border-border bg-card border border-border text-card-foreground shadow-sm text-muted-foreground px-1.5 py-0.5 rounded font-mono">{n.symbol}</span>
                                                </div>
                                                {n.link && (
                                                    <a href={n.link} target="_blank" rel="noopener noreferrer"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-700 hover:text-muted-foreground shrink-0">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                            <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-orange-100 transition-colors mb-1.5 line-clamp-2">{n.title}</h3>
                                            {n.summary && <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">{n.summary}</p>}
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded border capitalize flex items-center gap-1 ${SENTIMENT_PILL[n.sentiment]}`}>
                                                    {SENTIMENT_ICON[n.sentiment]} {n.sentiment}
                                                </span>
                                                <ImpactDot impact={n.impact} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* ══ SIGNALS ════════════════════════════════ */}
                    <TabsContent value="signals" className="space-y-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Live H4 signals · EMA20 vs EMA50 + RSI · refreshes every 2 min</span>
                            <button onClick={fetchSignals} className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-muted-foreground">
                                <RefreshCw className={`w-3 h-3 ${signalsLoading ? "animate-spin" : ""}`} /> Refresh
                            </button>
                        </div>
                        {signalsLoading && signals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-700">
                                <Activity className="w-7 h-7 animate-pulse text-purple-500/30" />
                                <p className="text-sm">Computing indicators from MT5 candles…</p>
                            </div>
                        ) : signals.length === 0 ? (
                            <div className="text-center py-16 border border-dashed border-border rounded-2xl text-gray-700">
                                <Info className="w-7 h-7 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">MT5 not connected — start the Python bridge to see live signals.</p>
                            </div>
                        ) : signals.map(s => (
                            <div key={s.pair}
                                className="bg-[#0b0b0b] border border-border hover:border-purple-500/30 rounded-2xl px-5 py-4 transition-colors group">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <div className="text-sm font-bold text-foreground tabular-nums">{s.pair}</div>
                                            <div className="text-[11px] text-gray-600">{s.timeframe}</div>
                                        </div>
                                        <SignalBadge signal={s.signal} />
                                        <StrengthBar v={s.strength} signal={s.signal} />
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-foreground tabular-nums">{s.price}</div>
                                        <div className={`text-xs flex items-center gap-0.5 justify-end tabular-nums ${s.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                                            {s.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                            {s.change >= 0 ? "+" : ""}{s.change}%
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-4">
                                    <span><span className="text-foreground/80 font-medium">Signal: </span>{s.reason}</span>
                                    {s.rsi !== undefined && (
                                        <span className={`ml-auto shrink-0 tabular-nums font-mono px-2 py-0.5 rounded border text-[11px]
                                            ${s.rsi > 70 ? "border-red-500/30 bg-red-500/10 text-red-400"
                                                : s.rsi < 30 ? "border-green-500/30 bg-green-500/10 text-green-400"
                                                    : "border-border bg-card border border-border text-card-foreground shadow-sm text-muted-foreground"}`}>
                                            RSI {s.rsi}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </TabsContent>

                    {/* ══ CALENDAR ═══════════════════════════════ */}
                    <TabsContent value="calendar">
                        <div className="bg-[#0b0b0b] border border-border rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-purple-400" />
                                <h3 className="text-sm font-semibold text-foreground">Economic Calendar</h3>
                                <span className="text-[11px] border border-purple-500/20 text-purple-400 bg-purple-500/10 rounded-full px-2 py-0.5 ml-1">ForexFactory</span>
                                <span className="ml-auto text-[11px] text-gray-600">
                                    {calDate ? new Date(calDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric" }) : "Loading…"}
                                </span>
                                <button onClick={fetchCalendar} className="text-gray-600 hover:text-muted-foreground ml-2">
                                    <RefreshCw className={`w-3.5 h-3.5 ${calLoading ? "animate-spin" : ""}`} />
                                </button>
                            </div>
                            <div className="grid grid-cols-[55px_20px_1fr_75px_75px_75px_70px] gap-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest py-2.5 px-4 border-b border-border">
                                <span>Time</span><span></span><span>Event</span>
                                <span className="text-right">Forecast</span>
                                <span className="text-right">Previous</span>
                                <span className="text-right">Actual</span>
                                <span className="text-right">Impact</span>
                            </div>
                            {calLoading && calEvents.length === 0 ? (
                                <div className="py-12 flex flex-col items-center gap-3 text-gray-700">
                                    <Activity className="w-6 h-6 animate-pulse text-purple-500/30" />
                                    <p className="text-xs">Fetching from ForexFactory…</p>
                                </div>
                            ) : calEvents.length === 0 ? (
                                <div className="py-12 text-center text-gray-700">
                                    <p className="text-sm">No events scheduled for today.</p>
                                </div>
                            ) : calEvents.map((e, i) => (
                                <div key={i} className={`grid grid-cols-[55px_20px_1fr_75px_75px_75px_70px] gap-2 items-center py-3 px-4 text-xs border-b border-border/40 hover:bg-background hover:bg-muted text-foreground/40 transition-colors last:border-0
                                    ${e.impact === "high" && !e.actual ? "bg-red-500/3" : ""}`}>
                                    <span className="tabular-nums text-muted-foreground font-mono">{e.time}</span>
                                    <span className="text-[10px] font-bold text-gray-600 tabular-nums">{e.currency}</span>
                                    <div className="flex items-center gap-2">
                                        {e.impact === "high" && !e.actual && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
                                        <span className="text-foreground font-medium">{e.event}</span>
                                    </div>
                                    <span className="text-right tabular-nums text-muted-foreground">{e.forecast}</span>
                                    <span className="text-right tabular-nums text-gray-600">{e.previous}</span>
                                    <span className={`text-right tabular-nums font-bold ${e.actual
                                        ? parseFloat(e.actual) > parseFloat(e.forecast ?? "0") ? "text-green-400" : "text-red-400"
                                        : "text-gray-700"}`}>{e.actual ?? "—"}</span>
                                    <div className="flex justify-end"><ImpactDot impact={e.impact} /></div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    {/* ══ CONFIRMATION ═══════════════════════════ */}
                    <TabsContent value="confirmation">
                        <div className="grid md:grid-cols-2 gap-5">
                            {/* Interactive checklist */}
                            <div className="bg-[#0b0b0b] border border-border rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-5">
                                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                    <h3 className="text-sm font-semibold text-foreground">Trade Confirmation Checklist</h3>
                                </div>
                                <div className="space-y-2.5">
                                    {checklist.map((c, i) => (
                                        <button key={i} onClick={() => toggle(i)}
                                            className="w-full flex items-start gap-3 text-left hover:bg-card border border-border text-card-foreground shadow-sm/30 rounded-xl p-2 transition-colors group">
                                            <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                        ${c.checked ? "border-green-500 bg-green-500/20" : "border-border bg-background hover:bg-muted text-foreground"}`}>
                                                {c.checked ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Circle className="w-3.5 h-3.5 text-gray-700" />}
                                            </div>
                                            <div>
                                                <div className={`text-sm font-medium transition-colors ${c.checked ? "text-foreground" : "text-muted-foreground"}`}>{c.label}</div>
                                                <div className="text-[11px] text-gray-600">{c.description}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-5 pt-4 border-t border-border">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-muted-foreground">Confirmation Score</span>
                                        <span className={`text-xl font-bold tabular-nums ${confirmPct >= 75 ? "text-green-400" : confirmPct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                                            {confirmed}/{checklist.length}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 rounded-full bg-card border border-border text-card-foreground shadow-sm overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${confirmPct}%`, backgroundColor: confirmPct >= 75 ? "#22c55e" : confirmPct >= 50 ? "#eab308" : "#ef4444" }} />
                                    </div>
                                    <p className="text-[11px] text-gray-600 mt-2">
                                        {confirmPct >= 75 ? "✅ Strong — proceed with position sizing"
                                            : confirmPct >= 50 ? "⚠️ Moderate — verify missing criteria first"
                                                : "❌ Weak — avoid entering this trade"}
                                    </p>
                                </div>
                            </div>

                            {/* Quick Analysis + Session Overview */}
                            <div className="space-y-4">
                                <div className="bg-[#0b0b0b] border border-border rounded-2xl p-5">
                                    <h3 className="text-sm font-semibold text-foreground mb-4">Quick Analysis</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: "Trend", value: "Bullish", Icon: TrendingUp, cls: "text-green-400 border-green-500/20 bg-green-500/10" },
                                            { label: "Volatility", value: "Medium", Icon: BarChart3, cls: "text-yellow-400 border-yellow-500/20 bg-yellow-500/10" },
                                            { label: "Momentum", value: "Strong", Icon: Zap, cls: "text-green-400 border-green-500/20 bg-green-500/10" },
                                            { label: "Risk Level", value: "Moderate", Icon: AlertTriangle, cls: "text-yellow-400 border-yellow-500/20 bg-yellow-500/10" },
                                        ].map(item => (
                                            <div key={item.label} className={`rounded-xl p-3.5 border ${item.cls}`}>
                                                <div className="flex items-center gap-1.5 mb-1"><item.Icon className="w-3.5 h-3.5 opacity-60" /><span className="text-[10px] text-gray-600 uppercase tracking-wider">{item.label}</span></div>
                                                <div className={`text-sm font-bold ${item.cls.split(" ")[0]}`}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-[#0c0a14] border border-purple-500/20 rounded-2xl p-5 shadow-[0_0_20px_rgba(168,85,247,0.05)]">
                                    <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-purple-400" /><span className="text-xs font-bold text-purple-300 uppercase tracking-widest">Market Bias</span></div>
                                    <p className="text-xs text-foreground/80 leading-relaxed">
                                        Current conditions favor <span className="text-green-400 font-semibold">cautious longs</span> in risk assets.
                                        USD weakness persists ahead of Powell. Key zones: EUR/USD <span className="text-yellow-300">1.0900 resistance</span>,
                                        Gold <span className="text-yellow-300">$2350</span>. Avoid entries <span className="text-red-400">30 min before ECB</span>.
                                    </p>
                                </div>
                                <div className="bg-[#0b0b0b] border border-border rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-blue-400" /><h3 className="text-sm font-semibold text-foreground">Trading Sessions</h3>
                                        <span className="ml-auto text-[10px] text-gray-600 tabular-nums">{new Date().toUTCString().slice(17, 22)} UTC</span>
                                    </div>
                                    <div className="space-y-2">
                                        {SESSIONS.map(s => (
                                            <div key={s.label} className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${s.active ? "bg-green-400 animate-pulse" : "bg-muted border border-border/50 text-foreground"}`} />
                                                    <span className="text-foreground font-medium">{s.label}</span>
                                                    <span className="text-gray-600 text-[10px]">{s.hours}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-600">{s.note}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.active ? "text-green-400 bg-green-500/10" : "text-gray-600 bg-card border border-border text-card-foreground shadow-sm"}`}>{s.active ? "ACTIVE" : "closed"}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
