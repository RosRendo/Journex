"use client";

import { useState } from "react";
import TerminalHeader from "../../components/terminal/TerminalHeader";
import StatusBar from "../../components/terminal/StatusBar";
import LeftPanel from "../../components/terminal/LeftPanel";
import CenterPanel from "../../components/terminal/CenterPanel";
import RightPanel from "../../components/terminal/RightPanel";
import BottomPanel from "../../components/terminal/BottomPanel";
import OrderTicket from "../../components/terminal/OrderTicket";
import BrokerSettings from "../../components/terminal/BrokerSettings";
import { useTerminalData } from "../../hooks/useTerminalData";

export default function TerminalPage() {
  const [symbol, setSymbol] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("M15");
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderInitialData, setOrderInitialData] = useState<any>(null);
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);
  
  const handleOpenOrder = (initialData?: any) => {
    setOrderInitialData(initialData || null);
    setOrderOpen(true);
  };
  const [brokerOpen, setBrokerOpen] = useState(false);
  const { snapshot, loading, refetch } = useTerminalData(symbol, timeframe);

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
        provider={snapshot?.status?.provider || "mock"}
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
          className={`border-b lg:border-r lg:border-b-0 border-zinc-800 flex flex-col min-h-0 transition-all duration-300 overflow-hidden ${
            isLeftOpen ? "w-full lg:w-[18%] lg:min-w-[240px]" : "hidden lg:flex lg:w-12 lg:min-w-[48px]"
          }`}
        >
          <LeftPanel snapshot={snapshot} loading={loading} isOpen={isLeftOpen} onToggle={() => setIsLeftOpen(!isLeftOpen)} />
        </aside>

        <main
          data-testid="center-panel"
          className="flex-1 flex flex-col min-h-[50vh] lg:min-h-0 border-b lg:border-r lg:border-b-0 border-zinc-800 transition-all duration-300 overflow-hidden"
        >
          <CenterPanel
            symbol={symbol}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            snapshot={snapshot}
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
            onPositionsChanged={refetch}
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
          refetch();
        }}
      />
      <BrokerSettings open={brokerOpen} onOpenChange={setBrokerOpen} onConnected={refetch} />
    </div>
  );
}
