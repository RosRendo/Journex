"use client";

import { useMemo } from "react";
import {
  biasColor,
  biasArrow,
  countdown,
  impactColor,
} from "../../lib/format";
import { CheckCircle2, HelpCircle, AlertTriangle, AlertOctagon, ChevronLeft, ChevronRight } from "lucide-react";
import SentimentGauge from "./SentimentGauge";
import Heatmap from "./Heatmap";

interface WidgetHeaderProps {
  title: string;
  right?: React.ReactNode;
}

function WidgetHeader({ title, right }: WidgetHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2 h-7 bg-zinc-900 border-b border-zinc-800 shrink-0">
      <span
        data-testid={`widget-title-${title.toLowerCase().replace(/\s+/g, "-")}`}
        className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-500"
      >
        {title}
      </span>
      {right}
    </div>
  );
}

interface StatusIconProps {
  status: string;
}

function StatusIcon({ status }: StatusIconProps) {
  if (status === "ok") return <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />;
  if (status === "warn") return <HelpCircle size={13} className="text-amber-500 shrink-0" />;
  if (status === "alert") return <AlertTriangle size={13} className="text-red-500 shrink-0" />;
  return <AlertOctagon size={13} className="text-zinc-500 shrink-0" />;
}

interface SetupChecklistProps {
  data: any;
}

function SetupChecklist({ data }: SetupChecklistProps) {
  if (!data) return null;
  const verdictBull = data.verdict === "VALID";
  return (
    <section data-testid="widget-setup-checklist" className="border-b border-zinc-800">
      <WidgetHeader
        title="Setup Checklist"
        right={
          <span className="text-[10px] font-mono text-zinc-400">
            <span className="text-zinc-100">{data.score}</span>
            <span className="text-zinc-600">/{data.max_score}</span>
          </span>
        }
      />
      <ul className="px-2 py-1.5 space-y-1">
        {data.items.map((item: any) => (
          <li
            key={item.id}
            data-testid={`checklist-${item.id}`}
            className="flex items-center gap-2 text-[11px]"
          >
            <StatusIcon status={item.status} />
            <span className="flex-1 text-zinc-200">{item.label}</span>
            <span className="text-zinc-500 font-mono text-[10px] truncate max-w-[110px]">
              {item.detail}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 px-2 pb-2 pt-1">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">Verdict</span>
        <span
          className={`text-[11px] font-bold px-1.5 py-0.5 ${
            verdictBull ? "text-emerald-500 bg-emerald-500/10" : "text-amber-500 bg-amber-500/10"
          }`}
        >
          {data.verdict}
        </span>
        <button
          data-testid="trade-it-btn"
          className="ml-auto text-[10px] uppercase tracking-widest border border-zinc-700 hover:border-amber-500 px-2 py-0.5 text-zinc-100"
        >
          Trade It
        </button>
        <button
          data-testid="wait-btn"
          className="text-[10px] uppercase tracking-widest border border-zinc-700 hover:border-zinc-500 px-2 py-0.5 text-zinc-100"
        >
          Wait
        </button>
      </div>
    </section>
  );
}

interface ConfluenceProps {
  data: any;
}

function Confluence({ data }: ConfluenceProps) {
  if (!data) return null;
  return (
    <section data-testid="widget-confluence" className="border-b border-zinc-800">
      <WidgetHeader
        title="Confluence"
        right={
          <span className="text-[10px] font-mono">
            <span className="text-emerald-500">{data.score}</span>
            <span className="text-zinc-600">/{data.max}</span>
          </span>
        }
      />
      <div className="px-2 py-1.5 space-y-1">
        {data.timeframes.map((t: any) => (
          <div
            key={t.tf}
            data-testid={`confluence-${t.tf}`}
            className="flex items-center gap-2 text-[11px]"
          >
            <span className="w-7 font-mono text-zinc-400">{t.tf}</span>
            <span className={`font-bold uppercase ${biasColor(t.bias)}`}>
              {biasArrow(t.bias)} {t.bias}
            </span>
            <span className="ml-auto font-mono text-[10px] text-zinc-500 truncate max-w-[120px]">
              {t.note}
            </span>
          </div>
        ))}
        <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800 mt-1">
          {data.recommendation}
        </div>
      </div>
    </section>
  );
}

interface CentralBanksProps {
  data: any[];
}

function CentralBanks({ data }: CentralBanksProps) {
  if (!data) return null;
  return (
    <section data-testid="widget-central-banks" className="border-b border-zinc-800">
      <WidgetHeader title="Central Banks" />
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-[9px] uppercase tracking-widest text-zinc-500">
            <th className="text-left px-2 pt-1 font-normal">CB</th>
            <th className="text-right px-1 pt-1 font-normal">Rate</th>
            <th className="text-right px-1 pt-1 font-normal">Prev</th>
            <th className="text-left px-2 pt-1 font-normal">Stance</th>
            <th className="text-right px-2 pt-1 font-normal">Next</th>
          </tr>
        </thead>
        <tbody>
          {data.map((cb) => {
            const cut = cb.rate < cb.prev;
            const hike = cb.rate > cb.prev;
            return (
              <tr key={cb.cb} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                <td className="px-2 py-1 font-bold text-zinc-100">{cb.cb}</td>
                <td
                  className={`px-1 py-1 text-right font-mono ${
                    cut ? "text-red-500" : hike ? "text-emerald-500" : "text-zinc-300"
                  }`}
                >
                  {cb.rate.toFixed(2)}%
                </td>
                <td className="px-1 py-1 text-right font-mono text-zinc-500">
                  {cb.prev.toFixed(2)}
                </td>
                <td
                  className={`px-2 py-1 ${
                    cb.stance === "Dovish"
                      ? "text-red-500"
                      : cb.stance === "Hawkish"
                      ? "text-emerald-500"
                      : "text-zinc-400"
                  }`}
                >
                  {cb.stance}
                </td>
                <td className="px-2 py-1 text-right font-mono text-zinc-400">
                  {cb.next_meeting}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

interface VolatilityBlockProps {
  data: any;
}

function VolatilityBlock({ data }: VolatilityBlockProps) {
  if (!data) return null;
  return (
    <section data-testid="widget-volatility" className="border-b border-zinc-800">
      <WidgetHeader
        title="Volatility"
        right={
          <span
            className={`text-[10px] font-bold ${
              data.status === "ELEVATED" ? "text-amber-500" : "text-emerald-500"
            }`}
          >
            {data.status}
          </span>
        }
      />
      <div className="px-2 py-2 grid grid-cols-2 gap-y-1 gap-x-3 text-[11px] font-mono">
        <div className="text-zinc-500">ATR</div>
        <div className="text-right text-zinc-100">
          {data.atr_pips}p{" "}
          <span className="text-amber-500">+{data.atr_change_pct}%</span>
        </div>
        <div className="text-zinc-500">IV</div>
        <div className="text-right text-zinc-100">
          {data.iv_pct}% <span className="text-amber-500">+{data.iv_change_pct}%</span>
        </div>
        <div className="text-zinc-500">Exp Range</div>
        <div className="text-right text-zinc-100">±{data.expected_range_pips} pips</div>
        <div className="col-span-2 text-[10px] text-amber-500/80 pt-1 border-t border-zinc-800 mt-1">
          ⚠ {data.advice}
        </div>
      </div>
    </section>
  );
}

interface EventsProps {
  data: any[];
}

function Events({ data }: EventsProps) {
  if (!data) return null;
  return (
    <section data-testid="widget-events" className="border-b border-zinc-800">
      <WidgetHeader title="Today's Events" />
      <ul className="px-2 py-1.5 space-y-1.5">
        {data.slice(0, 5).map((e: any, i: number) => (
          <li
            key={i}
            data-testid={`event-row-${i}`}
            className="flex items-start gap-2 text-[11px]"
          >
            <span className={`mt-1 w-1.5 h-1.5 shrink-0 rounded-full ${
              e.impact === "high" ? "bg-red-500" :
              e.impact === "med" ? "bg-amber-500" : "bg-emerald-500"
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-zinc-400">{e.country}</span>
                <span className="text-zinc-100 truncate">{e.title}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px]">
                <span className={`uppercase tracking-widest ${impactColor(e.impact)}`}>
                  {e.impact}
                </span>
                <span className="text-zinc-500">±{e.expected_move_pips}p</span>
                <span className="ml-auto text-amber-500">{countdown(e.time_iso)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface CorrelationMatrixProps {
  data: any;
}

function CorrelationMatrix({ data }: CorrelationMatrixProps) {
  if (!data) return null;
  return (
    <section data-testid="widget-correlations" className="border-b border-zinc-800">
      <WidgetHeader
        title="Correlation Matrix"
        right={
          <span className="text-[10px] font-bold text-amber-500">{data.context}</span>
        }
      />
      <table className="w-full text-[11px]">
        <tbody>
          {data.items.map((it: any) => {
            const pct = Math.min(1, Math.abs(it.value));
            const positive = it.value >= 0;
            return (
              <tr key={it.asset} className="border-t border-zinc-900">
                <td className="px-2 py-1 w-16 font-mono text-zinc-300">{it.asset}</td>
                <td className="py-1 w-full">
                  <div className="flex items-center gap-1.5 h-3 relative">
                    <div className="flex-1 h-1.5 bg-zinc-900 relative overflow-hidden">
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-zinc-700" />
                      <div
                        className={positive ? "bg-emerald-500 h-full absolute top-0 left-1/2" : "bg-red-500 h-full absolute top-0 right-1/2"}
                        style={{ width: `${(pct * 50).toFixed(1)}%` }}
                      />
                    </div>
                    <span
                      className={`w-12 text-right font-mono ${
                        positive ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {(it.value > 0 ? "+" : "") + it.value.toFixed(2)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-2 py-1 text-[10px] text-zinc-500 border-t border-zinc-800">
        {data.conclusion}
      </div>
    </section>
  );
}

interface LeftPanelProps {
  snapshot: any;
  loading: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function LeftPanel({ snapshot, loading, isOpen = true, onToggle }: LeftPanelProps) {
  const content = useMemo(() => {
    if (loading || !snapshot)
      return (
        <div className="p-3 text-[11px] text-zinc-500 font-mono">Loading research feeds…</div>
      );
    return (
      <>
        <SetupChecklist data={snapshot.checklist} />
        <Confluence data={snapshot.confluence} />
        <SentimentGauge />
        <CentralBanks data={snapshot.central_banks} />
        <VolatilityBlock data={snapshot.volatility} />
        <Events data={snapshot.events} />
        <Heatmap />
        <CorrelationMatrix data={snapshot.correlations} />
      </>
    );
  }, [snapshot, loading]);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="flex items-center justify-between p-2 border-b border-zinc-800 shrink-0 h-10">
        {isOpen && (
           <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-100">
             Research
           </span>
        )}
        <button onClick={onToggle} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors ml-auto relative z-50 cursor-pointer">
          {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {isOpen && (
        <div data-testid="left-panel-scroll" className="flex-1 overflow-y-auto scroll-thin">
          {content}
        </div>
      )}
    </div>
  );
}
