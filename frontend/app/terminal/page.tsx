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
import ApiKeysSettings from "../../components/terminal/ApiKeysSettings";
import { useTerminalData } from "../../hooks/useTerminalData";

export default function TerminalPage() {
  const [symbol, setSymbol] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("H4");
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderInitialData, setOrderInitialData] = useState<any>(null);
  
  const handleOpenOrder = (initialData?: any) => {
    setOrderInitialData(initialData || null);
    setOrderOpen(true);
  };
  const [brokerOpen, setBrokerOpen] = useState(false);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
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
        onOpenApiKeys={() => setApiKeysOpen(true)}
        isLive={snapshot?.status?.live === true}
        provider={snapshot?.status?.provider || "mock"}
      />

      <div className="flex-1 flex min-h-0">
        <aside
          data-testid="left-panel"
          className="w-[22%] min-w-[260px] border-r border-zinc-800 flex flex-col min-h-0"
        >
          <LeftPanel snapshot={snapshot} loading={loading} />
        </aside>

        <main
          data-testid="center-panel"
          className="w-[54%] flex flex-col min-h-0 border-r border-zinc-800"
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
          className="w-[24%] min-w-[280px] flex flex-col min-h-0"
        >
          <RightPanel
            snapshot={snapshot}
            loading={loading}
            onNewOrder={handleOpenOrder}
            onPositionsChanged={refetch}
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
      <ApiKeysSettings open={apiKeysOpen} onOpenChange={setApiKeysOpen} onSaved={refetch} />
    </div>
  );
}
