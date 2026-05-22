"use client";

import { useEffect, useMemo, useState } from "react";
import Marquee from "react-fast-marquee";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { biasColor, countdown, timeAgo, impactColor } from "../../lib/format";
import { analyzeNews } from "../../lib/terminalApi";
import PerformanceTab from "./PerformanceTab";
import MacroCalendar from "./MacroCalendar";
import TapeReader from "./TapeReader";

interface TickerItem {
  symbol: string;
  price: number;
  change_pips: number;
  change_pct: number;
  digits: number;
}

function Ticker({ items }: { items: TickerItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div
      data-testid="live-ticker"
      className="h-7 shrink-0 border-y border-zinc-800 bg-zinc-950 overflow-hidden flex items-center"
    >
      <span className="px-3 text-[9px] uppercase tracking-widest text-amber-500 font-bold border-r border-zinc-800 h-full flex items-center">
        Live
      </span>
      <Marquee gradient={false} speed={45} pauseOnHover>
        {items.concat(items).map((w, idx) => {
          const up = (w.change_pips ?? 0) >= 0;
          return (
            <span
              key={`${w.symbol}-${idx}`}
              className="px-4 text-[11px] font-mono flex items-center gap-2"
            >
              <span className="font-bold text-zinc-100">{w.symbol}</span>
              <span className={up ? "text-emerald-500" : "text-red-500"}>
                {w.price.toFixed(w.digits)}
              </span>
              <span className={`text-[10px] ${up ? "text-emerald-500" : "text-red-500"}`}>
                {up ? "▲" : "▼"}
                {Math.abs(w.change_pct).toFixed(2)}%
              </span>
              <span className="text-zinc-700">·</span>
            </span>
          );
        })}
      </Marquee>
    </div>
  );
}

interface OrderBookLevel {
  price: number;
  size: number;
}

interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

function OrderBookTab({ data }: { data: OrderBookData }) {
  if (!data) return null;
  const maxSize = Math.max(...data.bids.map((b) => b.size), ...data.asks.map((a) => a.size));
  return (
    <div data-testid="orderbook-tab" className="grid grid-cols-2 h-full text-[11px] font-mono">
      <div className="border-r border-zinc-800 overflow-y-auto scroll-thin">
        <div className="grid grid-cols-2 px-2 py-1 text-[9px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800 sticky top-0 bg-zinc-950">
          <span>Bid</span>
          <span className="text-right">Size</span>
        </div>
        {data.bids.map((b, i) => (
          <div key={i} className="grid grid-cols-2 px-2 py-0.5 relative">
            <div
              className="absolute right-0 top-0 bottom-0 bg-emerald-500/5"
              style={{ width: `${(b.size / maxSize) * 100}%` }}
            />
            <span className="text-emerald-500 z-10">{b.price}</span>
            <span className="text-right text-zinc-300 z-10">{b.size}</span>
          </div>
        ))}
      </div>
      <div className="overflow-y-auto scroll-thin">
        <div className="grid grid-cols-2 px-2 py-1 text-[9px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800 sticky top-0 bg-zinc-950">
          <span>Ask</span>
          <span className="text-right">Size</span>
        </div>
        {data.asks.map((a, i) => (
          <div key={i} className="grid grid-cols-2 px-2 py-0.5 relative">
            <div
              className="absolute left-0 top-0 bottom-0 bg-red-500/5"
              style={{ width: `${(a.size / maxSize) * 100}%` }}
            />
            <span className="text-red-500 z-10">{a.price}</span>
            <span className="text-right text-zinc-300 z-10">{a.size}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface NewsItem {
  headline: string;
  time_iso: string;
  tag: string;
  sentiment: string;
  affects: string[];
}

function NewsTab({ data }: { data: NewsItem[] }) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const headlines = useMemo(() => (data || []).map((n) => n.headline), [data]);

  useEffect(() => {
    let cancelled = false;
    if (!headlines.length) return undefined;
    setBusy(true);
    analyzeNews(headlines)
      .then((r) => !cancelled && setAnalysis(r))
      .catch(() => {})
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [headlines]);

  const scoreFor = (headline: string) =>
    analysis?.items?.find((i: any) => i.headline === headline);

  if (!data) return null;
  return (
    <div data-testid="news-tab" className="h-full overflow-y-auto scroll-thin">
      <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-3 py-1 flex items-center gap-3 text-[10px] font-mono">
        <span className="uppercase tracking-widest text-amber-500">AI Sentiment</span>
        {busy ? (
          <span className="text-zinc-500">analyzing…</span>
        ) : analysis ? (
          <>
            <span
              data-testid="ai-overall-sentiment"
              className={
                analysis.overall > 10
                  ? "text-emerald-500"
                  : analysis.overall < -10
                  ? "text-red-500"
                  : "text-zinc-300"
              }
            >
              {analysis.overall > 0 ? "+" : ""}
              {analysis.overall} · {analysis.label}
            </span>
            <span className="text-zinc-500 truncate">{analysis.summary}</span>
            {analysis.fallback && (
              <span className="text-amber-500 uppercase tracking-widest">fallback</span>
            )}
            {analysis.cached && (
              <span className="text-zinc-600 uppercase tracking-widest">cached</span>
            )}
          </>
        ) : (
          <span className="text-zinc-500">awaiting headlines…</span>
        )}
      </div>
      <div className="px-3 py-2 space-y-2">
        {data.map((n, i) => {
          const s = scoreFor(n.headline);
          return (
            <div
              key={i}
              data-testid={`news-row-${i}`}
              className="grid grid-cols-[100px_60px_1fr_140px_60px] gap-2 text-[11px] items-start border-b border-zinc-900 pb-2"
            >
              <span className="font-mono text-zinc-500">{timeAgo(n.time_iso)}</span>
              <span
                className={`uppercase tracking-widest text-[9px] font-bold ${
                  n.tag === "BREAKING" ? "text-red-500" : "text-amber-500"
                }`}
              >
                {n.tag}
              </span>
              <span className="text-zinc-100">{n.headline}</span>
              <span className={`text-right text-[10px] font-mono uppercase ${biasColor(n.sentiment)}`}>
                {(n.affects || []).join(", ")}
              </span>
              <span
                className={`text-right text-[10px] font-mono ${
                  !s
                    ? "text-zinc-600"
                    : s.score > 10
                    ? "text-emerald-500"
                    : s.score < -10
                    ? "text-red-500"
                    : "text-zinc-400"
                }`}
              >
                {s ? `${s.score > 0 ? "+" : ""}${s.score}` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CalendarEvent {
  time_iso: string;
  impact: string;
  country: string;
  title: string;
  forecast: string;
  previous: string;
  expected_move_pips: number;
}

function CalendarTab({ data }: { data: CalendarEvent[] }) {
  if (!data) return null;
  return (
    <div data-testid="calendar-tab" className="h-full overflow-y-auto scroll-thin">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-[9px] uppercase tracking-widest text-zinc-500 sticky top-0 bg-zinc-950">
            <th className="text-left px-3 py-2 font-normal">Countdown</th>
            <th className="text-left px-2 py-2 font-normal">Impact</th>
            <th className="text-left px-2 py-2 font-normal">CC</th>
            <th className="text-left px-2 py-2 font-normal">Event</th>
            <th className="text-right px-2 py-2 font-normal">Forecast</th>
            <th className="text-right px-2 py-2 font-normal">Previous</th>
            <th className="text-right px-3 py-2 font-normal">Exp Move</th>
          </tr>
        </thead>
        <tbody>
          {data.map((e, i) => (
            <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-900/50">
              <td className="px-3 py-1.5 font-mono text-amber-500">{countdown(e.time_iso)}</td>
              <td className={`px-2 py-1.5 uppercase tracking-widest text-[9px] ${impactColor(e.impact)}`}>
                {e.impact}
              </td>
              <td className="px-2 py-1.5 font-mono text-zinc-300">{e.country}</td>
              <td className="px-2 py-1.5 text-zinc-100">{e.title}</td>
              <td className="px-2 py-1.5 text-right font-mono text-zinc-300">{e.forecast}</td>
              <td className="px-2 py-1.5 text-right font-mono text-zinc-500">{e.previous}</td>
              <td className="px-3 py-1.5 text-right font-mono text-zinc-300">
                ±{e.expected_move_pips}p
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SignalItem {
  name: string;
  value: string;
  status: string;
  strength: number;
}

function SignalsTab({ data }: { data: SignalItem[] }) {
  if (!data) return null;
  return (
    <div data-testid="signals-tab" className="h-full overflow-y-auto scroll-thin grid grid-cols-2 gap-px bg-zinc-800">
      {data.map((s, i) => (
        <div
          key={i}
          className="bg-black p-2 flex items-center justify-between text-[11px]"
        >
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-zinc-500">{s.name}</span>
            <span className="font-mono text-zinc-100">{s.value}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[9px] uppercase tracking-widest font-bold ${biasColor(s.status)}`}>
              {s.status}
            </span>
            <div className="w-16 h-1 bg-zinc-900">
              <div
                className={biasColor(s.status).replace("text-", "bg-")}
                style={{ width: `${(s.strength * 100).toFixed(0)}%`, height: "100%" }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ClosedTrade {
  id: string;
  symbol: string;
  side: string;
  opened: string;
  closed: string;
  tag: string;
  pnl: number;
}

function JournalTab({ data }: { data: ClosedTrade[] }) {
  if (!data) return null;
  return (
    <div data-testid="journal-tab" className="h-full overflow-y-auto scroll-thin">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-[9px] uppercase tracking-widest text-zinc-500 sticky top-0 bg-zinc-950">
            <th className="text-left px-3 py-2 font-normal">ID</th>
            <th className="text-left px-2 py-2 font-normal">Symbol</th>
            <th className="text-left px-2 py-2 font-normal">Side</th>
            <th className="text-left px-2 py-2 font-normal">Opened</th>
            <th className="text-left px-2 py-2 font-normal">Closed</th>
            <th className="text-left px-2 py-2 font-normal">Tag</th>
            <th className="text-right px-3 py-2 font-normal">P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {data.map((t) => (
            <tr key={t.id} className="border-b border-zinc-900 hover:bg-zinc-900/50">
              <td className="px-3 py-1.5 font-mono text-zinc-500">{t.id}</td>
              <td className="px-2 py-1.5 font-bold text-zinc-100">{t.symbol}</td>
              <td
                className={`px-2 py-1.5 font-mono ${
                  t.side === "SELL" ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {t.side}
              </td>
              <td className="px-2 py-1.5 font-mono text-zinc-400">{t.opened}</td>
              <td className="px-2 py-1.5 font-mono text-zinc-400">{t.closed}</td>
              <td className="px-2 py-1.5 text-zinc-300">{t.tag}</td>
              <td
                className={`px-3 py-1.5 text-right font-mono font-bold ${
                  t.pnl >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface AlertItem {
  time_iso: string;
  level: string;
  title: string;
  category: string;
}

function AlertsTab({ data }: { data: AlertItem[] }) {
  if (!data) return null;
  const color = (lvl: string) =>
    lvl === "alert"
      ? "text-red-500"
      : lvl === "warn"
      ? "text-amber-500"
      : lvl === "ok"
      ? "text-emerald-500"
      : "text-cyan-400";
  return (
    <div data-testid="alerts-tab" className="h-full overflow-y-auto scroll-thin px-3 py-2 space-y-1">
      {data.map((a, i) => (
        <div
          key={i}
          className="flex items-center gap-3 text-[11px] border-b border-zinc-900 py-1"
        >
          <span className="font-mono text-zinc-500 w-20">{timeAgo(a.time_iso)}</span>
          <span className={`uppercase tracking-widest text-[9px] font-bold w-16 ${color(a.level)}`}>
            {a.level}
          </span>
          <span className="text-zinc-100 flex-1">{a.title}</span>
          <span className="text-[9px] uppercase tracking-widest text-zinc-500">
            {a.category}
          </span>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { value: "orderbook", label: "Order Book" },
  { value: "tape", label: "Tape Reader" },
  { value: "news", label: "Market News" },
  { value: "calendar", label: "Today" },
  { value: "macro", label: "Macro Cal" },
  { value: "signals", label: "Tech Signals" },
  { value: "journal", label: "Trade Journal" },
  { value: "performance", label: "Performance" },
  { value: "alerts", label: "Alerts" },
];

export default function BottomPanel({ snapshot }: { snapshot: any }) {
  const [tab, setTab] = useState("orderbook");
  if (!snapshot) {
    return (
      <div className="h-56 shrink-0 border-t border-zinc-800 px-3 py-2 text-[11px] text-zinc-500 font-mono">
        Loading data feeds…
      </div>
    );
  }
  return (
    <div data-testid="bottom-panel" className="shrink-0 flex flex-col border-t border-zinc-800">
      <Ticker items={snapshot.watchlist} />
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-56">
        <TabsList className="h-8 shrink-0 bg-zinc-950 border-b border-zinc-800 rounded-none p-0 px-2 gap-0 justify-start">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              data-testid={`tab-${t.value}`}
              value={t.value}
              className="text-[10px] uppercase tracking-widest text-zinc-500 px-3 py-1.5 rounded-none data-[state=active]:text-amber-500 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:shadow-none -mb-px"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="orderbook" className="flex-1 min-h-0 m-0">
          <OrderBookTab data={snapshot.order_book} />
        </TabsContent>
        <TabsContent value="tape" className="flex-1 min-h-0 m-0">
          <TapeReader symbols={(snapshot.watchlist || []).slice(0, 6).map((w: any) => w.symbol)} />
        </TabsContent>
        <TabsContent value="news" className="flex-1 min-h-0 m-0">
          <NewsTab data={snapshot.news} />
        </TabsContent>
        <TabsContent value="calendar" className="flex-1 min-h-0 m-0">
          <CalendarTab data={snapshot.events} />
        </TabsContent>
        <TabsContent value="macro" className="flex-1 min-h-0 m-0">
          <MacroCalendar />
        </TabsContent>
        <TabsContent value="signals" className="flex-1 min-h-0 m-0">
          <SignalsTab data={snapshot.signals} />
        </TabsContent>
        <TabsContent value="journal" className="flex-1 min-h-0 m-0">
          <JournalTab data={snapshot.journal} />
        </TabsContent>
        <TabsContent value="performance" className="flex-1 min-h-0 m-0">
          <PerformanceTab />
        </TabsContent>
        <TabsContent value="alerts" className="flex-1 min-h-0 m-0">
          <AlertsTab data={snapshot.alerts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
