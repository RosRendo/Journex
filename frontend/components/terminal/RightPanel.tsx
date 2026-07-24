"use client";

import { fmtSignedMoney, fmtMoney, fmtPct } from "../../lib/format";
import { closeOrder } from "../../lib/terminalApi";
import RiskCalculator from "./RiskCalculator";
import CryptoStrip from "./CryptoStrip";
import SignalWidget from "./SignalWidget";

interface WidgetHeaderProps {
  title: string;
  right?: React.ReactNode;
}

function WidgetHeader({ title, right }: WidgetHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2 h-7 bg-zinc-900 border-b border-zinc-800 shrink-0">
      <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-500">
        {title}
      </span>
      {right}
    </div>
  );
}

interface OpenPositionsProps {
  data: any[];
  onNewOrder?: () => void;
  onChanged?: () => void;
}

function OpenPositions({ data, onNewOrder, onChanged }: OpenPositionsProps) {
  if (!data) return null;
  const onClose = async (id: any) => {
    try {
      await closeOrder(id);
      onChanged?.();
    } catch (e) {
      // ignore
    }
  };
  return (
    <section data-testid="widget-positions" className="border-b border-zinc-800">
      <WidgetHeader
        title={`Open Positions (${data.length})`}
        right={
          <button
            data-testid="new-order-from-positions"
            onClick={onNewOrder}
            className="text-[10px] uppercase tracking-widest text-amber-500 hover:text-amber-300"
          >
            + Order
          </button>
        }
      />
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-[9px] uppercase tracking-widest text-zinc-500">
            <th className="text-left px-2 pt-1 font-normal">Symbol</th>
            <th className="text-left px-1 pt-1 font-normal">Side</th>
            <th className="text-right px-1 pt-1 font-normal">Vol</th>
            <th className="text-right px-2 pt-1 font-normal">P&amp;L</th>
            <th className="text-right px-2 pt-1 font-normal"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr
              key={p.id}
              data-testid={`position-row-${p.symbol}`}
              className="border-t border-zinc-900 hover:bg-zinc-900/60"
            >
              <td className="px-2 py-1.5">
                <div className="font-bold text-zinc-100">{p.symbol}</div>
                <div className="text-[9px] text-zinc-500 font-mono">{p.duration || ""}</div>
              </td>
              <td
                className={`px-1 py-1.5 font-mono ${
                  p.side === "SELL" ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {p.side}
              </td>
              <td className="px-1 py-1.5 text-right font-mono text-zinc-300">
                {Number(p.volume).toFixed(2)}
              </td>
              <td
                className={`px-2 py-1.5 text-right font-mono font-bold ${
                  p.pnl >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {fmtSignedMoney(p.pnl, 0)}
                <div className="text-[9px] font-normal text-zinc-500">
                  {p.entry} → {p.current}
                </div>
              </td>
              <td className="px-2 py-1.5 text-right">
                <button
                  data-testid={`close-pos-${p.symbol}`}
                  onClick={() => onClose(p.id)}
                  className="text-[9px] uppercase tracking-widest border border-zinc-700 hover:border-red-500 hover:text-red-500 px-1.5 py-0.5"
                >
                  Close
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-1 px-2 py-1.5 border-t border-zinc-900">
        <button
          data-testid="modify-position"
          className="text-[10px] uppercase tracking-widest border border-zinc-700 hover:border-amber-500 px-2 py-0.5 flex-1 text-zinc-100"
        >
          Modify SL/TP
        </button>
        <button
          data-testid="view-journal"
          className="text-[10px] uppercase tracking-widest border border-zinc-700 hover:border-zinc-500 px-2 py-0.5 flex-1 text-zinc-100"
        >
          Journal
        </button>
      </div>
    </section>
  );
}

interface AccountStatusProps {
  data: any;
}

function AccountStatus({ data }: AccountStatusProps) {
  if (!data) return null;
  return (
    <section data-testid="widget-account" className="border-b border-zinc-800">
      <WidgetHeader title="Account Status" />
      <div className="px-2 py-2 grid grid-cols-2 gap-y-1 gap-x-3 text-[11px] font-mono">
        <div className="text-zinc-500">Balance</div>
        <div className="text-right text-zinc-100">{fmtMoney(data.balance, 0)}</div>

        <div className="text-zinc-500">Equity</div>
        <div className="text-right text-emerald-500">{fmtMoney(data.equity, 0)}</div>

        <div className="text-zinc-500">Free Margin</div>
        <div className="text-right text-zinc-100">{fmtMoney(data.free_margin, 0)}</div>

        <div className="text-zinc-500">Used Margin</div>
        <div className="text-right text-amber-500">{data.used_margin_pct}%</div>

        <div className="text-zinc-500">Drawdown</div>
        <div className="text-right text-red-500">{fmtPct(data.drawdown_pct, 1)}</div>

        <div className="text-zinc-500">Win Rate</div>
        <div className="text-right text-emerald-500">{data.win_rate}%</div>

        <div className="text-zinc-500">Today Trades</div>
        <div className="text-right text-zinc-100">{data.trades_today}</div>

        <div className="text-zinc-500">Profit Factor</div>
        <div className="text-right text-zinc-100">{data.profit_factor}</div>
      </div>
    </section>
  );
}

interface PositioningProps {
  data: any;
}

function Positioning({ data }: PositioningProps) {
  if (!data) return null;
  return (
    <section data-testid="widget-positioning" className="border-b border-zinc-800">
      <WidgetHeader
        title="Positioning"
        right={
          data.extreme ? (
            <span className="text-[10px] font-bold text-red-500">⚠ EXTREME</span>
          ) : null
        }
      />
      <div className="px-2 py-2 space-y-2 text-[11px]">
        {["retail", "institutional"].map((kind) => {
          const v = data[kind];
          return (
            <div key={kind}>
              <div className="flex justify-between mb-1">
                <span className="uppercase tracking-widest text-[9px] text-zinc-500">
                  {kind}
                </span>
                <span className="font-mono text-zinc-400">
                  L{v.long_pct} / S{v.short_pct}
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 flex overflow-hidden">
                <div
                  className="bg-emerald-500/80"
                  style={{ width: `${v.long_pct}%` }}
                />
                <div
                  className="bg-red-500/80"
                  style={{ width: `${v.short_pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-900">
          {data.note}
        </p>
      </div>
    </section>
  );
}

interface WatchlistProps {
  data: any[];
}

function Watchlist({ data }: WatchlistProps) {
  if (!data) return null;
  return (
    <section data-testid="widget-watchlist" className="flex-1 min-h-0 flex flex-col">
      <WidgetHeader title={`Watchlist (${data.length})`} />
      <div className="flex-1 overflow-y-auto scroll-thin">
        <table className="w-full text-[11px]">
          <tbody>
            {data.map((w) => {
              const up = (w.change_pips ?? 0) >= 0;
              return (
                <tr
                  key={w.symbol}
                  data-testid={`watch-${w.symbol}`}
                  className="border-b border-zinc-900 hover:bg-zinc-900/50"
                >
                  <td className="px-2 py-1.5 font-bold text-zinc-100">{w.symbol}</td>
                  <td
                    className={`px-1 py-1.5 text-right font-mono ${
                      up ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {w.price.toFixed(w.digits)}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right font-mono text-[10px] ${
                      up ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {up ? "▲" : "▼"}
                    {Math.abs(w.change_pips).toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface RightPanelProps {
  snapshot: any;
  loading: boolean;
  onNewOrder?: (initialData?: any) => void;
  onPositionsChanged?: () => void;
}

export default function RightPanel({ snapshot, loading, onNewOrder, onPositionsChanged }: RightPanelProps) {
  if (loading || !snapshot)
    return (
      <div className="p-3 text-[11px] text-zinc-500 font-mono">Loading execution feeds…</div>
    );
  return (
    <div className="flex-1 overflow-y-auto scroll-thin flex flex-col">
      <SignalWidget onExecute={(sig) => onNewOrder?.(sig)} />
      <OpenPositions data={snapshot.positions} onNewOrder={onNewOrder} onChanged={onPositionsChanged} />
      <AccountStatus data={snapshot.account} />
      <RiskCalculator accountBalance={snapshot.account?.balance} />
      <Positioning data={snapshot.positioning} />
      <CryptoStrip />
      <Watchlist data={snapshot.watchlist} />
    </div>
  );
}
