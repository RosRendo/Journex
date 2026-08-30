"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell, Activity, ArrowUpCircle, ArrowDownCircle, Target as TargetIcon,
  Trash2, Cpu, BarChart2, Settings, X, Send, Network, Radio, Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";

interface PriceData { symbol: string; bid: number; ask: number; time?: number; platform?: string; server?: string; bidSpread?: number; totalSpread?: number; }
interface Target { id: number; symbol: string; price: number; type: "above" | "below" | "both"; priceType: "mid" | "bid" | "ask"; triggered: boolean; }
interface PriceChange { change: number; changePercent: number; isPositive: boolean; }
type ConnectionStatus = "connected" | "connecting" | "disconnected";

const XAUUSDMonitor: React.FC = () => {
  const [currentData, setCurrentData] = useState<Record<string, PriceData>>({});
  const [previousData, setPreviousData] = useState<Record<string, PriceData>>({});
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const [targets, setTargets] = useState<Target[]>([]);
  const [serverUrl, setServerUrl] = useState<string>(
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "/api/bridge" : (process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge")
  );
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const [targetSymbol, setTargetSymbol] = useState<string>("XAUUSDm");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [alertType, setAlertType] = useState<Target["type"]>("above");
  const [priceType, setPriceType] = useState<Target["priceType"]>("mid");

  const [showSettings, setShowSettings] = useState(false);
  const [discordUrl, setDiscordUrl] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");

  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const popularSymbols = ["XAUUSDm", "EURUSDm", "GBPUSDm", "USDJPYm", "US30m"];

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") { toast.info('Click "Enable Notifications" to receive system alerts'); }
    const savedDiscord = localStorage.getItem("alert_discord_url");
    const savedTelegramToken = localStorage.getItem("alert_telegram_token");
    const savedTelegramChatId = localStorage.getItem("alert_telegram_chatid");
    if (savedDiscord) setDiscordUrl(savedDiscord);
    if (savedTelegramToken) setTelegramToken(savedTelegramToken);
    if (savedTelegramChatId) setTelegramChatId(savedTelegramChatId);
    connectToLocalhost();
    return () => { if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current); };
  }, []);

  const fetchRESTData = useCallback(async () => {
    try {
      if (!isMonitoring) return;
      const response = await fetch(`${serverUrl}/api/live-data`, { headers: { "ngrok-skip-browser-warning": "true" } });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success && result.data) { setConnectionStatus("connected"); updatePriceDisplay(result.data); }
    } catch (error) { setConnectionStatus("disconnected"); }
  }, [serverUrl, isMonitoring]);

  const connectToLocalhost = useCallback(() => {
    setConnectionStatus("connecting");
    if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);
    fetchRESTData(); monitoringIntervalRef.current = setInterval(fetchRESTData, 1500);
  }, [fetchRESTData]);

  const updatePriceDisplay = useCallback((newDataList: any) => {
    if (!newDataList) return;
    const dataList = Array.isArray(newDataList) ? newDataList : Object.values(newDataList);
    if (dataList.length === 0) return;
    setPreviousData((prev) => ({ ...currentData }));
    const newRecord: Record<string, PriceData> = { ...currentData };
    dataList.forEach((item: any) => {
      const sym = item.symbol || "XAUUSDm";
      newRecord[sym] = { symbol: sym, bid: item.bid, ask: item.ask, time: item.time };
    });
    setCurrentData(newRecord); setLastUpdated(new Date().toLocaleTimeString());
    Object.values(newRecord).forEach((item) => { checkTargets(item.symbol, item.bid, item.ask); });
  }, [currentData]);

  const checkTargets = useCallback((symbol: string, bidPrice: number, askPrice: number) => {
    const midPrice = (bidPrice + askPrice) / 2;
    setTargets((prevTargets) => {
      return prevTargets.map((target) => {
        if (target.triggered || target.symbol !== symbol) return target;
        let currentPrice = target.priceType === "bid" ? bidPrice : target.priceType === "ask" ? askPrice : midPrice;
        let shouldTrigger = false;
        if (target.type === "above") shouldTrigger = currentPrice >= target.price;
        else if (target.type === "below") shouldTrigger = currentPrice <= target.price;
        else if (target.type === "both") shouldTrigger = Math.abs(currentPrice - target.price) < (symbol.includes("JPY") ? 0.05 : 0.0005);
        if (shouldTrigger) { sendNotification(target, currentPrice); return { ...target, triggered: true }; }
        return target;
      });
    });
  }, []);

  const sendNotification = useCallback(async (target: Target, currentPrice: number) => {
    const title = `🚨 ${target.symbol} Target Hit!`;
    const body = `${target.symbol} ${target.priceType} price has reached ${currentPrice.toFixed(5)}! \nTarget: ${target.type.toUpperCase()} ${target.price.toFixed(5)}`;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: body, icon: "/favicon.ico", tag: `price-alert-${target.id}` });
    }
    toast.custom(() => (
      <div className="bg-[--bg-card] border border-[--warning] rounded-xl p-4 w-[380px]">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex items-center gap-1 bg-[--warning]/20 text-[--warning] text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm"><TargetIcon className="w-3 h-3" /> ALERT TRIGGERED</span>
        </div>
        <p className="text-[13px] font-bold text-[--text-primary] leading-tight mb-1">{title}</p>
        <p className="text-[11px] text-[--text-secondary] whitespace-pre-wrap">{body}</p>
      </div>
    ), { duration: 10000 });
    
    try {
      const dUrl = localStorage.getItem("alert_discord_url") || ""; const tToken = localStorage.getItem("alert_telegram_token") || ""; const tChat = localStorage.getItem("alert_telegram_chatid") || "";
      if (dUrl || (tToken && tChat)) {
        await fetch(`${serverUrl}/api/notify`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: `${title}\n${body}`, discordWebhookUrl: dUrl, telegramBotToken: tToken, telegramChatId: tChat })
        });
      }
    } catch (err) {}
  }, [serverUrl]);

  const addTarget = () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) { toast.error("Please enter a valid target price"); return; }
    const target: Target = { id: Date.now(), symbol: targetSymbol, price: price, type: alertType, priceType: priceType, triggered: false };
    setTargets((prev) => [...prev, target]); setTargetPrice(""); toast.success(`Active Alert added for ${targetSymbol} at ${price}`);
  };

  const removeTarget = (id: number) => { setTargets((prev) => prev.filter((target) => target.id !== id)); toast.info("Alert removed"); };
  const requestNotificationPermission = () => {
    if (!("Notification" in window)) { toast.error("This browser does not support notifications"); return; }
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") toast.success("System Notifications Enabled");
      else toast.error("Notification permission denied");
    });
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);
      setIsMonitoring(false); setConnectionStatus("disconnected"); toast.info("Monitoring paused");
    } else { setIsMonitoring(true); connectToLocalhost(); toast.success("Monitoring resumed"); }
  };

  const saveSettings = () => {
    localStorage.setItem("alert_discord_url", discordUrl); localStorage.setItem("alert_telegram_token", telegramToken); localStorage.setItem("alert_telegram_chatid", telegramChatId);
    setShowSettings(false); toast.success("Integration settings saved successfully!");
  };

  const getPriceChange = (currentPrice: number, previousPrice: number | undefined): PriceChange | null => {
    if (!previousPrice) return null;
    const change = currentPrice - previousPrice; return { change, changePercent: (change / previousPrice) * 100, isPositive: change >= 0 };
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight mb-1 flex items-center gap-3" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
            <Network className="w-7 h-7 text-[--accent]" /> Alerts & Command Center
          </h1>
          <p className="text-[13px] font-medium flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <Activity className="w-3.5 h-3.5" /> High-frequency price triggers & Webhook broadcasting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-full border text-[11px] font-bold uppercase tracking-wider flex items-center gap-2" 
            style={{ 
              background: connectionStatus === "connected" ? "rgba(0,212,161,0.1)" : connectionStatus === "connecting" ? "rgba(245,158,11,0.1)" : "rgba(255,77,106,0.1)", 
              borderColor: connectionStatus === "connected" ? "rgba(0,212,161,0.3)" : connectionStatus === "connecting" ? "rgba(245,158,11,0.3)" : "rgba(255,77,106,0.3)", 
              color: connectionStatus === "connected" ? "var(--profit)" : connectionStatus === "connecting" ? "var(--warning)" : "var(--loss)" 
            }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "inherit" }}></span>
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "currentcolor" }}></span>
            </span>
            {connectionStatus}
          </div>
          <button onClick={toggleMonitoring} className="px-4 py-2 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-[--bg-elevated]" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
            {isMonitoring ? "PAUSE FEED" : "RESUME FEED"}
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-full border hover:bg-[--bg-elevated] transition-colors" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── LEFT: Live Monitor Grid ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-[18px] font-bold text-[--text-primary]">Active Sensors</h2>
            <span className="text-[10px] uppercase tracking-widest font-mono text-[--text-tertiary]">
              {lastUpdated ? `SYNCED: ${lastUpdated}` : "WAITING FOR TICK"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {popularSymbols.map((sym) => {
              const data = currentData[sym];
              const prev = previousData[sym];
              const bidChange = getPriceChange(data?.bid, prev?.bid);

              if (!data) {
                return (
                  <div key={sym} className="border p-6 rounded-lg flex items-center justify-center h-[140px]" style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[--text-tertiary] animate-pulse">Scanning {sym}...</span>
                  </div>
                );
              }

              return (
                <div key={sym} className="border rounded-lg p-6 relative overflow-hidden group" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[--accent] opacity-[0.03] rounded-bl-full pointer-events-none group-hover:opacity-[0.06] transition-opacity" />
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <h3 className="text-[20px] font-bold text-[--text-primary]" style={{ fontFamily: "var(--font-display, Syne, sans-serif)" }}>{sym}</h3>
                    {bidChange && (
                      <span className={`flex items-center gap-1 text-[13px] font-bold px-2 py-0.5 rounded border ${bidChange.isPositive ? "text-[--profit]" : "text-[--loss]"}`} style={{ background: bidChange.isPositive ? "rgba(0,212,161,0.1)" : "rgba(255,77,106,0.1)", borderColor: bidChange.isPositive ? "rgba(0,212,161,0.2)" : "rgba(255,77,106,0.2)" }}>
                        {bidChange.isPositive ? <ArrowUpCircle className="w-3.5 h-3.5" /> : <ArrowDownCircle className="w-3.5 h-3.5" />}
                        {Math.abs(bidChange.changePercent).toFixed(4)}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6 relative z-10">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[--text-tertiary] tracking-widest mb-1">Bid Price</p>
                      <p className={`text-[22px] font-mono tracking-tight font-bold ${bidChange ? (bidChange.isPositive ? "text-[--profit]" : "text-[--loss]") : "text-[--text-primary]"}`}>
                        {data.bid.toFixed(sym.includes("JPY") ? 3 : 5)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[--text-tertiary] tracking-widest mb-1">Ask Price</p>
                      <p className="text-[22px] font-mono tracking-tight font-bold text-[--text-primary]">
                        {data.ask.toFixed(sym.includes("JPY") ? 3 : 5)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Alert Config & Matrix ── */}
        <div className="space-y-6">
          
          <div className="border rounded-lg p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <h2 className="text-[16px] font-bold mb-5 flex items-center gap-2 text-[--text-primary]">
              <TargetIcon className="w-5 h-5 text-[--accent]" /> Alert Matrix Deployment
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold mb-1.5 text-[--text-tertiary] uppercase tracking-widest">Target Asset</label>
                <select value={targetSymbol} onChange={(e) => setTargetSymbol(e.target.value)} className="w-full bg-[--bg-base] border text-[13px] font-bold text-[--text-primary] rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--border)" }}>
                  {popularSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold mb-1.5 text-[--text-tertiary] uppercase tracking-widest">Trigger Price</label>
                <input type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder="0.00000" step="0.0001" className="w-full bg-[--bg-base] border font-mono font-bold text-[14px] text-[--text-primary] rounded-xl px-4 py-3 outline-none focus:border-[--accent] transition-colors" style={{ borderColor: "var(--border)" }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 text-[--text-tertiary] uppercase tracking-widest">Condition</label>
                  <select value={alertType} onChange={(e) => setAlertType(e.target.value as Target["type"])} className="w-full bg-[--bg-base] border text-[13px] font-bold text-[--text-primary] rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--border)" }}>
                    <option value="above">Break Above</option>
                    <option value="below">Break Below</option>
                    <option value="both">Exact Tap</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 text-[--text-tertiary] uppercase tracking-widest">Reference</label>
                  <select value={priceType} onChange={(e) => setPriceType(e.target.value as Target["priceType"])} className="w-full bg-[--bg-base] border text-[13px] font-bold text-[--text-primary] rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--border)" }}>
                    <option value="mid">Mid Price</option>
                    <option value="bid">Bid (Sell)</option>
                    <option value="ask">Ask (Buy)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-2">
                <button onClick={addTarget} className="w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(0,212,161,0.4)]" style={{ background: "var(--accent)", color: "#000" }}>
                  Deploy Tracking Node
                </button>
                <button onClick={requestNotificationPermission} className="w-full py-2 border rounded-xl text-[11px] uppercase tracking-wider font-bold hover:bg-[--bg-elevated] transition-all mt-2" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  Authorize OS Push
                </button>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <h2 className="text-[16px] font-bold mb-4 flex items-center justify-between text-[--text-primary]">
              <span>Active Target Grid</span>
              <span className="bg-[--accent]/20 text-[--accent] text-[10px] font-bold px-2 py-0.5 rounded border border-[--accent]/30">
                {targets.filter(t => !t.triggered).length} NODES
              </span>
            </h2>

            <div className="space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar pr-2">
              {targets.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-xl" style={{ borderColor: "var(--border)", color: "var(--text-tertiary)" }}>
                  <p className="text-[11px] font-medium tracking-wide uppercase">No targets deployed</p>
                </div>
              ) : (
                targets.slice().reverse().map((target) => (
                  <div key={target.id} className={`flex justify-between items-center p-3 rounded-xl border transition-all ${target.triggered ? "bg-[--bg-base] opacity-50" : "bg-[--bg-elevated]"}`} style={{ borderColor: target.triggered ? "var(--border)" : "var(--border-strong)" }}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[--text-primary] text-[13px]">{target.symbol}</span>
                        {target.triggered && (
                          <span className="text-[9px] bg-[--warning] text-black font-black px-1.5 rounded uppercase tracking-wider">Breached</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[--text-secondary] font-mono">
                        {target.type === 'above' ? '▲' : target.type === 'below' ? '▼' : '⊙'} {target.price.toFixed(5)} <span className="text-[--text-tertiary]">({target.priceType})</span>
                      </div>
                    </div>
                    <button onClick={() => removeTarget(target.id)} className="p-2 text-[--text-tertiary] hover:bg-[rgba(255,92,115,0.08)] hover:text-[--loss] rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Integrations Settings Modal ── */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-lg border rounded-lg p-8 z-10" style={{ background: "var(--bg-card)", borderColor: "var(--border-strong)" }}>
            <div className="flex items-center justify-between mb-6 border-b pb-4" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-[20px] font-bold flex items-center gap-3 text-[--text-primary]" style={{ fontFamily: "var(--font-display, Syne, sans-serif)" }}>
                <LinkIcon className="text-[--accent] w-6 h-6" /> Webhook Integrations
              </h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-[--bg-elevated] rounded-full transition-colors text-[--text-secondary]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <p className="text-[13px] text-[--text-secondary]">Configure API bindings to route alerts into external command channels.</p>

              <div>
                <label className="block text-[11px] font-bold mb-1.5 text-[--text-tertiary] uppercase tracking-widest">Discord Webhook</label>
                <input type="text" value={discordUrl} onChange={(e) => setDiscordUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className="w-full bg-[--bg-base] border text-[13px] font-mono text-[--text-primary] rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--border)" }} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold mb-1.5 text-[--text-tertiary] uppercase tracking-widest">Telegram Token</label>
                  <input type="password" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} placeholder="123456:ABC..." className="w-full bg-[--bg-base] border text-[13px] font-mono text-[--text-primary] rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--border)" }} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1.5 text-[--text-tertiary] uppercase tracking-widest">Telegram Chat ID</label>
                  <input type="text" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="-100123..." className="w-full bg-[--bg-base] border text-[13px] font-mono text-[--text-primary] rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--border)" }} />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setShowSettings(false)} className="px-6 py-3 rounded-xl font-bold text-[12px] uppercase tracking-wider text-[--text-secondary] hover:bg-[--bg-elevated] transition-colors">Abort</button>
                <button onClick={saveSettings} className="px-6 py-3 rounded-xl font-bold text-[12px] uppercase tracking-wider transition-all flex items-center gap-2" style={{ background: "var(--accent)", color: "#000" }}>
                  <Radio className="w-4 h-4" /> Save Bindings
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

