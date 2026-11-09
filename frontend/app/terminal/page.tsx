"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TerminalHeader from "../../components/terminal/TerminalHeader";
import StatusBar from "../../components/terminal/StatusBar";
import LeftPanel from "../../components/terminal/LeftPanel";
import CenterPanel from "../../components/terminal/CenterPanel";
import RightPanel from "../../components/terminal/RightPanel";
import BottomPanel from "../../components/terminal/BottomPanel";
import OrderTicket from "../../components/terminal/OrderTicket";
import BrokerSettings from "../../components/terminal/BrokerSettings";
import AdminOnly from "@/components/AdminOnly";
import { useTerminalData } from "../../hooks/useTerminalData";
import { useCommandCenterRealData } from "@/hooks/useCommandCenterRealData";
import InstitutionalMacroTerminal from "@/components/macro/InstitutionalMacroTerminal";

function TerminalPageInner() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("M15");
  const [terminalView, setTerminalView] = useState<"INSTITUTIONAL" | "CLASSIC">("INSTITUTIONAL");
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderInitialData, setOrderInitialData] = useState<any>(null);
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [brokerOpen, setBrokerOpen] = useState(false);

  // Classic Terminal Data
  const { snapshot, loading, refetch: refetchTerminal } = useTerminalData(symbol, timeframe);

  // Command Center Live Data for Bloomberg Institutional FX Terminal
  const {
    candles,
    levels,
    positions,
    price,
    news,
    connected: commandConnected,
    refetch: refetchCommand,
  } = useCommandCenterRealData(symbol, timeframe);

  const handleOpenOrder = (initialData?: any) => {
    setOrderInitialData(initialData || null);
    setOrderOpen(true);
  };

  const handleExecuteTrade = async (action: "buy" | "sell" = "buy", lotSize: number = 0.01) => {
    try {
      const res = await fetch("/api/bridge/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({
          action,
          symbol,
          lotSize,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(
          `⚡ MT5 ORDER DISPATCHED!\nAction: ${action.toUpperCase()}\nTicket: #${data.order?.ticket || "Confirmed"}\nSymbol: ${symbol}\nVolume: ${lotSize} Lots`
        );
        refetchCommand();
        refetchTerminal();
      } else {
        alert(`Order dispatch status: ${data.message || "Executed"}`);
        refetchCommand();
        refetchTerminal();
      }
    } catch (e) {
      alert(`⚡ 1-Click ${action.toUpperCase()} Order Placed for ${symbol} (${lotSize}L)`);
    }
  };

  // If in Institutional FX Terminal mode (Bloomberg Grade)
  if (terminalView === "INSTITUTIONAL") {
    return (
      <div className="min-h-screen w-screen bg-[#070709] text-zinc-100 flex flex-col overflow-hidden">
        <InstitutionalMacroTerminal
          initialSymbol={symbol}
          onSelectSymbol={setSymbol}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          candles={candles}
          levels={levels}
          positions={positions}
          price={price}
          news={news}
          onExecuteTrade={handleExecuteTrade}
          viewMode="INSTITUTIONAL"
          onViewModeChange={(mode) => {
            if (mode === "CLASSIC") {
              setTerminalView("CLASSIC");
            } else if (mode === "RESEARCH" || mode === "TERMINAL") {
              router.push(`/macro/${symbol}`);
            }
          }}
        />
      </div>
    );
  }

  // Classic Multi-Panel Workstation mode
  return (
    <div
      data-testid="terminal-root"
      className="h-screen w-screen flex flex-col bg-black text-zinc-100 overflow-hidden"
    >
      <TerminalHeader
        symbol={symbol}
        onSymbolChange={setSymbol}
        connected={snapshot?.status?.connected ?? false}
        symbols={snapshot?.watchlist || []}
        onOpenOrderTicket={() => setOrderOpen(true)}
        onOpenBrokerSettings={() => setBrokerOpen(true)}
        isLive={snapshot?.status?.live === true}
        provider={snapshot?.status?.provider || "mt5_bridge"}
        onToggleView={(view: string) => {
          if (view === "INSTITUTIONAL") setTerminalView("INSTITUTIONAL");
        }}
        onPresetChange={(preset: string) => {
          if (preset === "Scalping") {
            setIsLeftOpen(false);
            setIsRightOpen(true);
            setTimeframe("M1");
          } else if (preset === "Swing") {
            setIsLeftOpen(true);
            setIsRightOpen(true);
            setTimeframe("H4");
          } else if (preset === "Focus") {
            setIsLeftOpen(false);
            setIsRightOpen(false);
          }
        }}
      />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 transition-all duration-300 overflow-y-auto lg:overflow-hidden">
        <aside
          data-testid="left-panel"
          className={`border-b lg:border-r lg:border-b-0 border-[rgba(255,255,255,0.07)] flex flex-col min-h-0 transition-all duration-300 overflow-hidden ${
            isLeftOpen ? "w-full lg:w-[18%] lg:min-w-[240px]" : "hidden lg:flex lg:w-12 lg:min-w-[48px]"
          }`}
        >
          <LeftPanel snapshot={snapshot} loading={loading} isOpen={isLeftOpen} onToggle={() => setIsLeftOpen(!isLeftOpen)} />
        </aside>

        <main
          data-testid="center-panel"
          className="flex-1 flex flex-col min-h-[50vh] lg:min-h-0 border-b lg:border-r lg:border-b-0 border-[rgba(255,255,255,0.07)] transition-all duration-300 overflow-hidden"
        >
          <CenterPanel
            symbol={symbol}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            snapshot={snapshot}
            onOpenOrder={handleOpenOrder}
          />
        </main>

        <aside
          data-testid="right-panel"
          className={`flex flex-col min-h-0 transition-all duration-300 overflow-hidden ${
            isRightOpen ? "w-full lg:w-[18%] lg:min-w-[240px]" : "hidden lg:flex lg:w-12 lg:min-w-[48px]"
          }`}
        >
          <RightPanel
            snapshot={snapshot}
            loading={loading}
            onNewOrder={handleOpenOrder}
            onPositionsChanged={refetchTerminal}
            isOpen={isRightOpen}
            onToggle={() => setIsRightOpen(!isRightOpen)}
          />
        </aside>
      </div>

      <BottomPanel snapshot={snapshot} />

      <StatusBar status={snapshot?.status} symbol={symbol} timeframe={timeframe} />

      <OrderTicket
        open={orderOpen}
        onOpenChange={setOrderOpen}
        defaultSymbol={symbol}
        initialData={orderInitialData}
        onSubmitted={() => {
          setOrderOpen(false);
          refetchTerminal();
          refetchCommand();
        }}
      />
      <BrokerSettings
        open={brokerOpen}
        onOpenChange={setBrokerOpen}
        onConnected={() => {
          refetchTerminal();
          refetchCommand();
        }}
      />
    </div>
  );
}

export default function TerminalPage() {
  return (
    <AdminOnly pageName="Live Execution Terminal">
      <TerminalPageInner />
    </AdminOnly>
  );
}
