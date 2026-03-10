"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  Activity,
  ArrowUpCircle,
  ArrowDownCircle,
  Target as TargetIcon,
  Trash2,
  Cpu,
  BarChart2,
  Settings,
  X,
  Send,
} from "lucide-react";
import { toast } from "sonner";

// Type definitions
interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  time?: number;
  platform?: string;
  server?: string;
  bidSpread?: number;
  totalSpread?: number;
}

interface Target {
  id: number;
  symbol: string;
  price: number;
  type: "above" | "below" | "both";
  priceType: "mid" | "bid" | "ask";
  triggered: boolean;
}

interface PriceChange {
  change: number;
  changePercent: number;
  isPositive: boolean;
}

type ConnectionStatus = "connected" | "connecting" | "disconnected";

const XAUUSDMonitor: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentData, setCurrentData] = useState<Record<string, PriceData>>({});
  const [previousData, setPreviousData] = useState<Record<string, PriceData>>(
    {},
  );
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const [targets, setTargets] = useState<Target[]>([]);
  const [serverUrl, setServerUrl] = useState<string>("");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Form states
  const [targetSymbol, setTargetSymbol] = useState<string>("EURUSD");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [alertType, setAlertType] = useState<Target["type"]>("above");
  const [priceType, setPriceType] = useState<Target["priceType"]>("mid");

  // Integrations state
  const [showSettings, setShowSettings] = useState(false);
  const [discordUrl, setDiscordUrl] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");

  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const popularSymbols = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "GBPJPY"];

  // Initialize on component mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      toast.info('Click "Enable Notifications" to receive system alerts');
    }

    // Load config
    const savedDiscord = localStorage.getItem("alert_discord_url");
    const savedTelegramToken = localStorage.getItem("alert_telegram_token");
    const savedTelegramChatId = localStorage.getItem("alert_telegram_chatid");
    if (savedDiscord) setDiscordUrl(savedDiscord);
    if (savedTelegramToken) setTelegramToken(savedTelegramToken);
    if (savedTelegramChatId) setTelegramChatId(savedTelegramChatId);

    // Auto-connect on mount
    connectToLocalhost();

    return () => {
      if (ws) ws.close();
      if (monitoringIntervalRef.current)
        clearInterval(monitoringIntervalRef.current);
    };
  }, []);

  const fetchRESTData = useCallback(async () => {
    try {
      if (!isMonitoring) return;

      const response = await fetch(`${serverUrl}/api/live-data`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      if (result.success && result.data) {
        setConnectionStatus("connected");
        updatePriceDisplay(result.data);
      }
    } catch (error) {
      console.error("Error fetching data from REST API:", error);
      setConnectionStatus("disconnected");
    }
  }, [serverUrl, isMonitoring]);

  const connectToLocalhost = useCallback(() => {
    setConnectionStatus("connecting");
    // We strictly use REST interval for localhost script
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }
    fetchRESTData();
    monitoringIntervalRef.current = setInterval(fetchRESTData, 1500);
  }, [fetchRESTData]);

  const updatePriceDisplay = useCallback(
    (newDataList: any) => {
      if (!newDataList) return;

      // Handle both array and dictionary responses dynamically
      const dataList = Array.isArray(newDataList)
        ? newDataList
        : Object.values(newDataList);
      if (dataList.length === 0) return;

      setPreviousData((prev) => ({ ...currentData }));

      const newRecord: Record<string, PriceData> = { ...currentData };
      dataList.forEach((item: any) => {
        // standardizing the symbols representation across API calls
        const sym = item.symbol || "XAUUSD";
        newRecord[sym] = {
          symbol: sym,
          bid: item.bid,
          ask: item.ask,
          time: item.time,
        };
      });

      setCurrentData(newRecord);
      setLastUpdated(new Date().toLocaleTimeString());

      // Check targets for all updated symbols
      Object.values(newRecord).forEach((item) => {
        checkTargets(item.symbol, item.bid, item.ask);
      });
    },
    [currentData],
  );

  const checkTargets = useCallback(
    (symbol: string, bidPrice: number, askPrice: number) => {
      const midPrice = (bidPrice + askPrice) / 2;

      setTargets((prevTargets) => {
        return prevTargets.map((target) => {
          if (target.triggered || target.symbol !== symbol) return target;

          let currentPrice: number;
          switch (target.priceType) {
            case "bid":
              currentPrice = bidPrice;
              break;
            case "ask":
              currentPrice = askPrice;
              break;
            case "mid":
            default:
              currentPrice = midPrice;
              break;
          }

          let shouldTrigger = false;
          switch (target.type) {
            case "above":
              shouldTrigger = currentPrice >= target.price;
              break;
            case "below":
              shouldTrigger = currentPrice <= target.price;
              break;
            case "both":
              shouldTrigger =
                Math.abs(currentPrice - target.price) <
                (symbol.includes("JPY") ? 0.05 : 0.0005);
              break;
          }

          if (shouldTrigger) {
            sendNotification(target, currentPrice);
            return { ...target, triggered: true };
          }

          return target;
        });
      });
    },
    [],
  );

  const sendNotification = useCallback(
    async (target: Target, currentPrice: number) => {
      const title = `🚨 ${target.symbol} Target Hit!`;
      const body = `${target.symbol} ${target.priceType} price has reached ${currentPrice.toFixed(5)}! 
Target: ${target.type.toUpperCase()} ${target.price.toFixed(5)}`;

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
          body: body,
          icon: "/favicon.ico",
          tag: `price-alert-${target.id}`,
        });
      }

      // Modern Sonner Toast
      toast.success(body, {
        duration: 10000,
        icon: "🚨",
        style: { background: "#22c55e", color: "white", border: "none" },
      });

      // Send to Discord/Telegram via Python Bridge
      try {
        const dUrl = localStorage.getItem("alert_discord_url") || "";
        const tToken = localStorage.getItem("alert_telegram_token") || "";
        const tChat = localStorage.getItem("alert_telegram_chatid") || "";

        if (dUrl || (tToken && tChat)) {
          const res = await fetch(`${serverUrl}/api/notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: `${title}\n${body}`,
              discordWebhookUrl: dUrl,
              telegramBotToken: tToken,
              telegramChatId: tChat,
            }),
          });
          const data = await res.json();
          if (!data.success) {
            console.error("Failed to send webhooks:", data.errors);
          }
        }
      } catch (err) {
        console.error("Webhook trigger error:", err);
      }
    },
    [serverUrl],
  );

  const addTarget = () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid target price");
      return;
    }

    const target: Target = {
      id: Date.now(),
      symbol: targetSymbol,
      price: price,
      type: alertType,
      priceType: priceType,
      triggered: false,
    };

    setTargets((prev) => [...prev, target]);
    setTargetPrice("");
    toast.success(`Active Alert added for ${targetSymbol} at ${price}`);
  };

  const removeTarget = (id: number) => {
    setTargets((prev) => prev.filter((target) => target.id !== id));
    toast.info("Alert removed");
  };

  const requestNotificationPermission = () => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support notifications");
      return;
    }
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        toast.success("System Notifications Enabled");
      } else {
        toast.error("Notification permission denied");
      }
    });
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      if (monitoringIntervalRef.current)
        clearInterval(monitoringIntervalRef.current);
      setIsMonitoring(false);
      setConnectionStatus("disconnected");
      toast.info("Monitoring paused");
    } else {
      setIsMonitoring(true);
      connectToLocalhost();
      toast.success("Monitoring resumed");
    }
  };

  const saveSettings = () => {
    localStorage.setItem("alert_discord_url", discordUrl);
    localStorage.setItem("alert_telegram_token", telegramToken);
    localStorage.setItem("alert_telegram_chatid", telegramChatId);
    setShowSettings(false);
    toast.success("Integration settings saved successfully!");
  };

  const getPriceChange = (
    currentPrice: number,
    previousPrice: number | undefined,
  ): PriceChange | null => {
    if (!previousPrice) return null;
    const change = currentPrice - previousPrice;
    return {
      change,
      changePercent: (change / previousPrice) * 100,
      isPositive: change >= 0,
    };
  };

  // Rendering
  return (
    <div className="space-y-8 h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400 flex items-center gap-3">
            <Bell className="text-primary w-8 h-8" />
            Alerts & Monitor
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time multi-asset MT5 monitoring and triggered desktop
            notifications.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-card/50 p-3 rounded-xl border border-border/50">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connectionStatus === "connected" ? "bg-green-400" : connectionStatus === "connecting" ? "bg-yellow-400" : "bg-red-400"}`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${connectionStatus === "connected" ? "bg-green-500" : connectionStatus === "connecting" ? "bg-yellow-500" : "bg-red-500"}`}
              ></span>
            </span>
            <span className="text-sm font-medium capitalize">
              {connectionStatus}
            </span>
          </div>

          <button
            onClick={toggleMonitoring}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${isMonitoring ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
          >
            {isMonitoring ? "Pause Feed" : "Resume Feed"}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
            title="Notification Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COL: Quick Monitor Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Live Feed
            </h2>
            <span className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
              {lastUpdated ? `Last Sync: ${lastUpdated}` : "Awaiting Data..."}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {popularSymbols.map((sym) => {
              const data = currentData[sym];
              const prev = previousData[sym];
              const bidChange = getPriceChange(data?.bid, prev?.bid);

              if (!data) {
                return (
                  <div
                    key={sym}
                    className="bg-card/30 border border-border/40 p-5 rounded-2xl flex items-center justify-center h-[120px]"
                  >
                    <span className="text-muted-foreground font-medium animate-pulse">
                      Waiting for {sym}...
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={sym}
                  className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-foreground">{sym}</h3>
                    {bidChange && (
                      <span
                        className={`flex items-center gap-1 text-sm font-bold ${bidChange.isPositive ? "text-green-500" : "text-red-500"}`}
                      >
                        {bidChange.isPositive ? (
                          <ArrowUpCircle className="w-4 h-4" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4" />
                        )}
                        {Math.abs(bidChange.changePercent).toFixed(4)}%
                      </span>
                    )}
                  </div>

                  <div className="flex gap-6 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Bid
                      </p>
                      <p
                        className={`text-xl font-mono tracking-tight font-semibold ${bidChange ? (bidChange.isPositive ? "text-green-500" : "text-red-500") : "text-foreground"}`}
                      >
                        {data.bid.toFixed(sym.includes("JPY") ? 3 : 5)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Ask
                      </p>
                      <p className="text-xl font-mono tracking-tight font-semibold text-foreground">
                        {data.ask.toFixed(sym.includes("JPY") ? 3 : 5)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COL: Control Panel & Targets */}
        <div className="space-y-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <TargetIcon className="w-5 h-5 text-primary" /> Create Alert
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
                  Asset Symbol
                </label>
                <select
                  value={targetSymbol}
                  onChange={(e) => setTargetSymbol(e.target.value)}
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  {popularSymbols.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
                  Target Price
                </label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="e.g., 1.0500"
                  step="0.0001"
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
                    Condition
                  </label>
                  <select
                    value={alertType}
                    onChange={(e) =>
                      setAlertType(e.target.value as Target["type"])
                    }
                    className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  >
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                    <option value="both">Exact</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wider">
                    Reference
                  </label>
                  <select
                    value={priceType}
                    onChange={(e) =>
                      setPriceType(e.target.value as Target["priceType"])
                    }
                    className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  >
                    <option value="mid">Mid</option>
                    <option value="bid">Bid</option>
                    <option value="ask">Ask</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={addTarget}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
                >
                  Set Alert Target
                </button>
                <button
                  onClick={requestNotificationPermission}
                  className="w-full py-2 bg-secondary text-foreground rounded-xl text-sm font-semibold hover:bg-secondary/80 transition-all"
                >
                  Authorize OS Notifications
                </button>
              </div>
            </div>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
              <span>Active Alerts</span>
              <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                {targets.filter((t) => !t.triggered).length}
              </span>
            </h2>

            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {targets.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-border/50 rounded-xl text-muted-foreground text-sm">
                  No active targets set
                </div>
              ) : (
                targets
                  .slice()
                  .reverse()
                  .map((target) => (
                    <div
                      key={target.id}
                      className={`flex justify-between items-center p-3 rounded-xl border ${target.triggered ? "bg-secondary/50 border-border/30 opacity-70" : "bg-background border-primary/30 shadow-sm"}`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-foreground text-sm">
                            {target.symbol}
                          </span>
                          {target.triggered && (
                            <span className="text-[10px] bg-green-500/20 text-green-500 font-bold px-1.5 rounded uppercase tracking-wider">
                              Triggered
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {target.type.toUpperCase()} @{" "}
                          <span className="text-foreground">
                            {target.price.toFixed(5)}
                          </span>{" "}
                          ({target.priceType})
                        </div>
                      </div>
                      <button
                        onClick={() => removeTarget(target.id)}
                        className="p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                        title="Delete Alert"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Integration Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />

          <div className="relative w-full max-w-lg bg-card border border-border/50 shadow-2xl rounded-2xl p-6 animate-in zoom-in-95 duration-200 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Send className="text-primary w-6 h-6" />
                Webhook Integrations
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Configure webhooks to receive target alerts directly in external
                channels.
              </p>

              <div>
                <label className="block text-sm font-semibold mb-1.5 text-foreground">
                  Discord Webhook URL
                </label>
                <input
                  type="text"
                  value={discordUrl}
                  onChange={(e) => setDiscordUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">
                    Telegram Bot Token
                  </label>
                  <input
                    type="password"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="123456:ABC-DEF..."
                    className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-foreground">
                    Telegram Chat ID
                  </label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="-100123456789"
                    className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-5 py-2.5 rounded-xl font-medium hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold transition-all shadow-md shadow-primary/20 hover:shadow-primary/40 active:scale-95"
                >
                  Save Integrations
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XAUUSDMonitor;
