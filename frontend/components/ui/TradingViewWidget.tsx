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

const DEFAULT_STUDIES = ["STD;EMA", "STD;RSI"];

function TradingViewWidgetComponent({
  symbol = "XAUUSD",
  interval = "60",
  height = "100%",
  autosize = true,
  hideSideToolbar = false,
  studies = DEFAULT_STUDIES,
  containerClassName = "",
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastKeyRef = useRef<string>("");

  const studiesKey = JSON.stringify(studies || DEFAULT_STUDIES);

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    const tvSymbol = formatTradingViewSymbol(symbol);
    const currentKey = `${tvSymbol}_${interval}_${studiesKey}`;

    // If widget already rendered and config hasn't changed, prevent destroy/re-inject loop
    if (currentContainer.querySelector("iframe") && lastKeyRef.current === currentKey) {
      return;
    }
    lastKeyRef.current = currentKey;

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

    const config: any = {
      autosize: autosize,
      symbol: tvSymbol,
      interval: interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1", // 1 = Candlesticks
      locale: "en",
      enable_publishing: false,
      backgroundColor: "#070709",
      gridColor: "rgba(255, 255, 255, 0.04)",
      hide_side_toolbar: hideSideToolbar,
      allow_symbol_change: true,
      save_image: true,
      details: false,
      hotlist: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    };

    if (studies && studies.length > 0) {
      config.studies = studies;
    }

    script.innerHTML = JSON.stringify(config);
    currentContainer.appendChild(script);

    return () => {
      // Clean up when unmounting
      if (currentContainer) {
        currentContainer.innerHTML = "";
      }
      lastKeyRef.current = "";
    };
  }, [symbol, interval, height, autosize, hideSideToolbar, studiesKey, studies]);

  return (
    <div
      className={`tradingview-widget-container relative w-full h-full overflow-hidden rounded-lg ${containerClassName}`}
      ref={containerRef}
      style={{ height: typeof height === "number" ? `${height}px` : height, minHeight: "220px" }}
    />
  );
}

export const TradingViewWidget = memo(TradingViewWidgetComponent);
export default TradingViewWidget;
