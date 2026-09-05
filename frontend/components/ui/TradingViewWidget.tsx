"use client";
import React, { useEffect, useRef, memo } from "react";

export interface TradingViewWidgetProps {
  symbol?: string;
  interval?: "1" | "5" | "15" | "30" | "60" | "240" | "D" | "W" | string;
  height?: string | number;
  autosize?: boolean;
  hideSideToolbar?: boolean;
  studies?: string[];
  containerClassName?: string;
}

export function formatTradingViewSymbol(symbolStr: string): string {
  if (!symbolStr) return "OANDA:XAUUSD";
  const clean = symbolStr.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (symbolStr.includes(":")) return symbolStr;

  if (clean.includes("XAU") || clean.includes("GOLD")) return "OANDA:XAUUSD";
  if (clean.includes("XAG") || clean.includes("SILVER")) return "OANDA:XAGUSD";
  if (clean.includes("BTC")) return "BINANCE:BTCUSDT";
  if (clean.includes("ETH")) return "BINANCE:ETHUSDT";
  if (clean.includes("SOL")) return "BINANCE:SOLUSDT";
  if (clean.includes("US100") || clean.includes("NAS") || clean.includes("NDX")) return "CAPITALCOM:US100";
  if (clean.includes("US30") || clean.includes("DOW") || clean.includes("DJI")) return "CAPITALCOM:US30";
  if (clean.includes("SPX") || clean.includes("US500")) return "CAPITALCOM:US500";
  if (clean.includes("DXY") || clean.includes("USDX")) return "CAPITALCOM:DXY";
  if (clean.includes("GER40") || clean.includes("DAX")) return "CAPITALCOM:DE40";
  if (clean.includes("UK100") || clean.includes("FTSE")) return "CAPITALCOM:UK100";
  if (clean.includes("OIL") || clean.includes("WTI")) return "CAPITALCOM:USOIL";

  // Standard Forex Pairs
  return `FX:${clean}`;
}

function TradingViewWidgetComponent({
  symbol = "XAUUSD",
  interval = "60",
  height = "100%",
  autosize = true,
  hideSideToolbar = false,
  studies = ["STD;EMA", "STD;RSI"],
  containerClassName = "",
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    currentContainer.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = typeof height === "number" ? `${height}px` : height;
    widgetDiv.style.width = "100%";
    currentContainer.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    const tvSymbol = formatTradingViewSymbol(symbol);

    script.innerHTML = JSON.stringify({
      autosize: autosize,
      symbol: tvSymbol,
      interval: interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1", // 1 = Candlesticks
      locale: "en",
      enable_publishing: false,
      backgroundColor: "#0d0d12",
      gridColor: "rgba(255, 255, 255, 0.04)",
      hide_side_toolbar: hideSideToolbar,
      allow_symbol_change: true,
      save_image: true,
      details: false,
      hotlist: false,
      calendar: false,
      studies: studies,
      support_host: "https://www.tradingview.com",
    });

    currentContainer.appendChild(script);

    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = "";
      }
    };
  }, [symbol, interval, height, autosize, hideSideToolbar, studies]);

  return (
    <div
      className={`tradingview-widget-container relative w-full overflow-hidden rounded-lg ${containerClassName}`}
      ref={containerRef}
      style={{ height: typeof height === "number" ? `${height}px` : height, minHeight: "220px" }}
    />
  );
}

export const TradingViewWidget = memo(TradingViewWidgetComponent);
export default TradingViewWidget;
