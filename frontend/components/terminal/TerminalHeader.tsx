"use client";

import { useUtcClock } from "../../hooks/useTerminalData";
import { utcClock } from "../../lib/format";
import { ChevronDown, Activity, Settings, Plus, Key } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";

const POPULAR = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "NZDUSD", "USDCHF", "USDCAD", "XAUUSD", "AUDJPY", "EURJPY"];

export default function TerminalHeader({ symbol, onSymbolChange, connected, symbols, onOpenOrderTicket, onOpenBrokerSettings, onOpenApiKeys, isLive, provider }) {
  const now = useUtcClock();
  const list = symbols && symbols.length > 0 ? symbols.map((s) => s.symbol) : POPULAR;

  return (
    <header
      data-testid="terminal-header"
      className="h-10 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center px-3 gap-4"
    >
      <div className="flex items-center gap-2 pr-3 border-r border-zinc-800 h-full">
        <div className="w-2 h-2 bg-amber-500 rounded-sm" />
        <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-zinc-100">
          BLOOMBERG TERMINAL
        </span>
        <span className="text-[10px] tracking-widest uppercase text-zinc-500">v1.0</span>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            data-testid="symbol-selector"
            className="flex items-center gap-2 px-2 py-1 border border-zinc-700 hover:border-amber-500 transition-colors text-xs font-mono tracking-wider"
          >
            <span className="font-bold text-zinc-100">{symbol}</span>
            <ChevronDown size={12} className="text-zinc-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="bg-zinc-950 border border-zinc-800 rounded-none min-w-[180px]"
            align="start"
          >
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-amber-500">
              Instrument
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            {list.map((s) => (
              <DropdownMenuItem
                key={s}
                data-testid={`symbol-option-${s}`}
                onClick={() => onSymbolChange(s)}
                className="text-xs font-mono cursor-pointer focus:bg-zinc-900 focus:text-amber-500 rounded-none"
              >
                {s}
                {s === symbol && <span className="ml-auto text-amber-500">●</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-[10px] tracking-widest uppercase text-zinc-500">
          Research &amp; Execution
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button
          data-testid="open-order-ticket"
          onClick={onOpenOrderTicket}
          className="flex items-center gap-1 text-[10px] uppercase tracking-widest border border-amber-500 text-amber-500 hover:bg-amber-500/10 px-2 py-1 transition-colors"
        >
          <Plus size={12} />
          New Order
        </button>
        <button
          data-testid="open-broker-settings"
          onClick={onOpenBrokerSettings}
          className="flex items-center gap-1 text-[10px] uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100 px-2 py-1 transition-colors"
        >
          <Settings size={12} />
          Broker
        </button>
        <button
          data-testid="open-api-keys"
          onClick={onOpenApiKeys}
          className="flex items-center gap-1 text-[10px] uppercase tracking-widest border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100 px-2 py-1 transition-colors"
        >
          <Key size={12} />
          API Keys
        </button>
      </div>

      <div className="flex items-center gap-4 text-[11px] font-mono">
        <div
          data-testid="data-source-badge"
          className={`px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] font-bold border ${
            isLive
              ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
              : "border-amber-500/60 text-amber-500/80 bg-amber-500/5"
          }`}
        >
          {isLive ? `LIVE · ${(provider || "mock").toUpperCase()}` : "MOCK"}
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"} blink`}
          />
          <span className={connected ? "text-emerald-500" : "text-red-500"}>
            {connected ? "CONNECTED" : "OFFLINE"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Activity size={12} className="text-amber-500" />
          <span className="tabular-nums">{utcClock(now)}</span>
        </div>
      </div>
    </header>
  );
}
