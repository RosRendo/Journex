"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  BellRing,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageCircle,
  Hash,
  Save,
  TestTube2,
  Trash2,
  History,
  Plus,
  Activity,
  Radio,
  Volume2,
  VolumeX,
  Target as TargetIcon,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock,
  Layers,
  Sparkles,
  ShieldCheck,
  Check,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";

const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge";

export interface AlertConfig {
  discord_news_webhook: string;
  discord_calendar_webhook: string;
  discord_signals_webhook: string;
  discord_alerts_webhook: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
  telegram_thread_news: string;
  telegram_thread_calendar: string;
  telegram_thread_signals: string;
  telegram_thread_alerts: string;
  dnd_enabled: boolean;
  dnd_start: string;
  dnd_end: string;
  alerts_paused: boolean;
  news_paused: boolean;
  calendar_paused: boolean;
  signals_paused: boolean;
  executions_paused: boolean;
  custom_paused: boolean;
}

const DEFAULT_CONFIG: AlertConfig = {
  discord_news_webhook: "",
  discord_calendar_webhook: "",
  discord_signals_webhook: "",
  discord_alerts_webhook: "",
  telegram_bot_token: "",
  telegram_chat_id: "",
  telegram_thread_news: "",
  telegram_thread_calendar: "",
  telegram_thread_signals: "",
  telegram_thread_alerts: "",
  dnd_enabled: false,
  dnd_start: "22:00",
  dnd_end: "06:00",
  alerts_paused: false,
  news_paused: false,
  calendar_paused: false,
  signals_paused: false,
  executions_paused: false,
  custom_paused: false,
};

interface TickData {
  symbol: string;
  rawSymbol: string;
  bid: number;
  ask: number;
  spread: number;
  time?: number;
  platform?: string;
  change?: number;
  changePercent?: number;
}

interface PriceTarget {
  id: string;
  symbol: string;
  price: number;
  condition: "above" | "below" | "tap";
  reference: "mid" | "bid" | "ask";
  channels: {
    sound: boolean;
    browserPush: boolean;
    webhook: boolean;
  };
  createdAt: string;
  triggered: boolean;
  triggeredAt?: string;
  triggeredPrice?: number;
}

interface AlertHistoryItem {
  id: string;
  time: string;
  channel: string;
  message: string;
  type: "target" | "news" | "calendar" | "signals" | "system";
}

const WATCHLIST_SYMBOLS = [
  { symbol: "XAUUSD", name: "Gold / USD", type: "COMMODITY", pipFactor: 0.1, decimals: 2 },
  { symbol: "EURUSD", name: "Euro / US Dollar", type: "FOREX", pipFactor: 0.0001, decimals: 5 },
  { symbol: "GBPUSD", name: "British Pound / USD", type: "FOREX", pipFactor: 0.0001, decimals: 5 },
  { symbol: "USDJPY", name: "US Dollar / Japanese Yen", type: "FOREX", pipFactor: 0.01, decimals: 3 },
  { symbol: "US30", name: "Dow Jones 30 Index", type: "INDEX", pipFactor: 1.0, decimals: 1 },
  { symbol: "BTCUSD", name: "Bitcoin / USD", type: "CRYPTO", pipFactor: 1.0, decimals: 1 },
];

function cleanSymbol(sym: string): string {
  if (!sym) return "";
  return sym.replace(/m$/i, "").replace(/c$/i, "").toUpperCase();
}

function playSynthesizedBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio context may be restricted before user interaction
  }
}

const inputCls = "w-full rounded-xl border px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-[--accent] transition-colors";
const inputStyle = { background: "var(--bg-base)", borderColor: "var(--border)", color: "var(--text-primary)" };

export default function AlertsDeskPage() {
  const [activeTab, setActiveTab] = useState<"targets" | "integrations" | "history">("targets");
  const [config, setConfig] = useState<AlertConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Live Watcher State
  const [liveTicks, setLiveTicks] = useState<Record<string, TickData>>({});
  const [isFeedActive, setIsFeedActive] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "offline">("connecting");
  const [lastFeedTick, setLastFeedTick] = useState<string>("");

  // Targets State
  const [targets, setTargets] = useState<PriceTarget[]>([]);
  const [selectedTargetSymbol, setSelectedTargetSymbol] = useState("XAUUSD");
  const [targetPriceInput, setTargetPriceInput] = useState("");
  const [targetCondition, setTargetCondition] = useState<PriceTarget["condition"]>("above");
  const [targetReference, setTargetReference] = useState<PriceTarget["reference"]>("mid");
  const [notifySound, setNotifySound] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyWebhook, setNotifyWebhook] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // History State
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"all" | "target" | "news" | "calendar" | "signals">("all");

  const feedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const targetsRef = useRef<PriceTarget[]>([]);
  targetsRef.current = targets;

  // Initialize Tab from query params & load local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "integrations" || tabParam === "channels") setActiveTab("integrations");
      else if (tabParam === "history") setActiveTab("history");
      else if (tabParam === "targets" || tabParam === "monitor") setActiveTab("targets");

      if ("Notification" in window) {
        setNotificationPermission(Notification.permission);
      }

      try {
        const savedTargets = localStorage.getItem("journex_price_targets");
        if (savedTargets) {
          setTargets(JSON.parse(savedTargets));
        } else {
          // Backward compatibility check from old monitor
          const legacy = localStorage.getItem("alert_rules");
          if (legacy) {
            const parsed = JSON.parse(legacy);
            const converted: PriceTarget[] = parsed.map((item: any) => ({
              id: item.id || Date.now().toString(),
              symbol: cleanSymbol(item.pair || "XAUUSD"),
              price: parseFloat(item.price) || 0,
              condition: item.condition === "<" ? "below" : "above",
              reference: "mid",
              channels: { sound: true, browserPush: true, webhook: true },
              createdAt: new Date().toLocaleTimeString(),
              triggered: false,
            }));
            setTargets(converted);
          }
        }

        const savedHistory = localStorage.getItem("journex_alert_history");
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        } else {
          const sampleHistory: AlertHistoryItem[] = [
            {
              id: "h-init-1",
              time: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              channel: "System",
              message: "Surveillance Desk initialized. Real-time sensors armed.",
              type: "system",
            },
          ];
          setHistory(sampleHistory);
        }
      } catch (err) {
        console.error("Failed to load local alert settings", err);
      }
    }

    // Fetch central alert config from bridge
    fetch(`${BRIDGE}/api/alert-config`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((data) => {
        setConfig((prev) => ({ ...prev, ...data }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Save targets to local storage whenever changed
  const persistTargets = (newTargets: PriceTarget[]) => {
    setTargets(newTargets);
    try {
      localStorage.setItem("journex_price_targets", JSON.stringify(newTargets));
    } catch {}
  };

  const addHistoryEntry = (entry: Omit<AlertHistoryItem, "id">) => {
    const newItem: AlertHistoryItem = {
      ...entry,
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, 80);
      try {
        localStorage.setItem("journex_alert_history", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Dispatch alert event to user channels
  const triggerAlertNotification = useCallback(
    async (target: PriceTarget, triggeredPrice: number) => {
      const symConfig = WATCHLIST_SYMBOLS.find((s) => s.symbol === target.symbol);
      const dec = symConfig?.decimals ?? 3;
      const title = `🚨 Target Hit: ${target.symbol} reached ${triggeredPrice.toFixed(dec)}`;
      const detail = `${target.symbol} ${target.reference.toUpperCase()} breached target of ${target.price.toFixed(dec)} (${target.condition.toUpperCase()})`;

      // 1. Audio
      if (target.channels.sound) {
        playSynthesizedBeep();
      }

      // 2. In-App Sonner
      toast.custom(
        () => (
          <div className="bg-[#121217] border border-[#00d4a1]/50 rounded-xl p-4 w-[360px] shadow-[0_0_30px_rgba(0,212,161,0.25)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1 bg-[#00d4a1]/20 text-[#00d4a1] text-[10px] font-black uppercase px-2 py-0.5 rounded">
                <TargetIcon className="w-3 h-3" /> TARGET BREACHED
              </span>
              <span className="text-[10px] font-mono text-[--text-tertiary] ml-auto">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm font-bold text-[--text-primary] mb-1">{title}</p>
            <p className="text-xs text-[--text-secondary] leading-relaxed">{detail}</p>
          </div>
        ),
        { duration: 9000 }
      );

      // 3. Browser Push
      if (
        target.channels.browserPush &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(title, {
            body: detail,
            icon: "/favicon.ico",
            tag: `target-${target.id}`,
          });
        } catch {}
      }

      // 4. External Webhook Dispatch (Centralized)
      if (target.channels.webhook) {
        try {
          await fetch(`${BRIDGE}/api/notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: `${title}\n${detail}\nRef: ${target.reference} | Time: ${new Date().toISOString()}`,
              channel: "alerts",
            }),
          });
        } catch {}
      }

      // 5. Audit Log
      addHistoryEntry({
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        channel: `Target: ${target.symbol}`,
        message: detail,
        type: "target",
      });
    },
    []
  );

  // Poll live ticks and evaluate active targets
  const fetchLiveTicks = useCallback(async () => {
    try {
      const res = await fetch(`${BRIDGE}/api/live-data`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (!res.ok) throw new Error("Feed unavailable");
      const json = await res.json();

      if (json.success && json.data) {
        setConnectionStatus("connected");
        const rawList = Array.isArray(json.data) ? json.data : Object.values(json.data);

        setLiveTicks((prev) => {
          const next = { ...prev };
          rawList.forEach((item: any) => {
            const raw = item.symbol || "XAUUSD";
            const clean = cleanSymbol(raw);
            const prevItem = prev[clean];

            const bid = Number(item.bid);
            const ask = Number(item.ask);
            const spread = Math.max(0, ask - bid);

            let change = 0;
            let changePercent = 0;
            if (prevItem && prevItem.bid > 0) {
              change = bid - prevItem.bid;
              changePercent = (change / prevItem.bid) * 100;
            }

            next[clean] = {
              symbol: clean,
              rawSymbol: raw,
              bid,
              ask,
              spread,
              time: item.time,
              platform: item.platform,
              change,
              changePercent,
            };
          });
          return next;
        });

        setLastFeedTick(new Date().toLocaleTimeString());

        // Check active targets against incoming prices
        const currentActiveTargets = targetsRef.current;
        let targetsModified = false;
        const updatedTargets = currentActiveTargets.map((target) => {
          if (target.triggered) return target;

          const match = rawList.find((i: any) => cleanSymbol(i.symbol) === target.symbol);
          if (!match) return target;

          const bid = Number(match.bid);
          const ask = Number(match.ask);
          const mid = (bid + ask) / 2;

          const currentPrice =
            target.reference === "bid" ? bid : target.reference === "ask" ? ask : mid;

          const symMeta = WATCHLIST_SYMBOLS.find((s) => s.symbol === target.symbol);
          const tolerance = (symMeta?.pipFactor ?? 0.0001) * 0.5;

          let isHit = false;
          if (target.condition === "above" && currentPrice >= target.price) isHit = true;
          else if (target.condition === "below" && currentPrice <= target.price) isHit = true;
          else if (target.condition === "tap" && Math.abs(currentPrice - target.price) <= tolerance) isHit = true;

          if (isHit) {
            targetsModified = true;
            triggerAlertNotification(target, currentPrice);
            return {
              ...target,
              triggered: true,
              triggeredAt: new Date().toLocaleTimeString(),
              triggeredPrice: currentPrice,
            };
          }
          return target;
        });

        if (targetsModified) {
          persistTargets(updatedTargets);
        }
      }
    } catch {
      setConnectionStatus("offline");
    }
  }, [triggerAlertNotification]);

  // Start / stop polling interval
  useEffect(() => {
    if (!isFeedActive) {
      if (feedIntervalRef.current) clearInterval(feedIntervalRef.current);
      setConnectionStatus("offline");
      return;
    }
    fetchLiveTicks();
    feedIntervalRef.current = setInterval(fetchLiveTicks, 1500);
    return () => {
      if (feedIntervalRef.current) clearInterval(feedIntervalRef.current);
    };
  }, [isFeedActive, fetchLiveTicks]);

  // Request browser desktop push permission
  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Desktop notifications are not supported in this browser");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === "granted") {
      toast.success("Desktop Push Notifications authorized!");
      new Notification("Journex Surveillance", {
        body: "Real-time market alerts armed and ready.",
        icon: "/favicon.ico",
      });
    } else {
      toast.error("Notification permission denied");
    }
  };

  // Deploy target
  const handleDeployTarget = () => {
    const numPrice = parseFloat(targetPriceInput);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error("Please enter a valid target price");
      return;
    }

    const newTarget: PriceTarget = {
      id: `target-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      symbol: selectedTargetSymbol,
      price: numPrice,
      condition: targetCondition,
      reference: targetReference,
      channels: {
        sound: notifySound,
        browserPush: notifyPush,
        webhook: notifyWebhook,
      },
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      triggered: false,
    };

    const next = [newTarget, ...targets];
    persistTargets(next);
    setTargetPriceInput("");

    toast.success(`Target deployed: ${selectedTargetSymbol} ${targetCondition.toUpperCase()} ${numPrice}`);
    addHistoryEntry({
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      channel: `Watch: ${selectedTargetSymbol}`,
      message: `Deployed tracking node at ${numPrice} (${targetCondition.toUpperCase()})`,
      type: "target",
    });
  };

  const handleDeleteTarget = (id: string) => {
    const next = targets.filter((t) => t.id !== id);
    persistTargets(next);
    toast.info("Target removed");
  };

  const handleRearmTarget = (id: string) => {
    const next = targets.map((t) => (t.id === id ? { ...t, triggered: false, triggeredAt: undefined } : t));
    persistTargets(next);
    toast.success("Target re-armed");
  };

  const handleClearBreached = () => {
    const next = targets.filter((t) => !t.triggered);
    persistTargets(next);
    toast.info("Cleared all breached targets");
  };

  // Helper for quick price offset pills
  const applyPriceOffset = (pipOffset: number) => {
    const live = liveTicks[selectedTargetSymbol];
    const meta = WATCHLIST_SYMBOLS.find((s) => s.symbol === selectedTargetSymbol);
    const base = live ? (live.bid + live.ask) / 2 : 0;
    if (base <= 0) return;

    const pipSize = meta?.pipFactor ?? 0.0001;
    const decimals = meta?.decimals ?? 3;
    const computed = base + pipOffset * pipSize;
    setTargetPriceInput(computed.toFixed(decimals));
  };

  // Save backend config
  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BRIDGE}/api/alert-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Integration settings saved successfully!");
        addHistoryEntry({
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          channel: "System",
          message: "Alert webhook & schedule configuration updated",
          type: "system",
        });
      } else {
        toast.error(data.error ?? "Failed to save settings");
      }
    } catch {
      toast.error("Cannot reach MT5 bridge");
    }
    setSaving(false);
  };

  // Test webhook
  const testChannel = async (type: "news" | "calendar" | "signals" | "executions") => {
    setTesting(type);
    await saveConfig();
    try {
      const res = await fetch(`${BRIDGE}/api/alert-config/test?type=${type}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Test broadcast delivered to: ${data.sent_to.join(", ")} ✅`, { duration: 5000 });
        addHistoryEntry({
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          channel: `Test: ${type}`,
          message: `Dispatched test payload to ${data.sent_to.join(", ")}`,
          type: "system",
        });
      } else {
        toast.error(data.error ?? "Broadcast failed");
      }
    } catch {
      toast.error("Cannot reach MT5 bridge");
    }
    setTesting(null);
  };

  const setConfigField = (key: keyof AlertConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setConfig((prev) => ({ ...prev, [key]: e.target.value }));

  const activeTargetsCount = targets.filter((t) => !t.triggered).length;
  const currentLiveSymbol = liveTicks[selectedTargetSymbol];
  const currentSymbolMeta = WATCHLIST_SYMBOLS.find((s) => s.symbol === selectedTargetSymbol);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-5" style={{ borderColor: "var(--border)" }}>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[--accent]/15 text-[--accent] border border-[--accent]/30">
              Surveillance & Dispatch Desk
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-[--text-tertiary]">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-[#00d4a1] shadow-[0_0_8px_#00d4a1]"
                    : connectionStatus === "connecting"
                    ? "bg-[#f59e0b]"
                    : "bg-[#ff4d6a]"
                }`}
              />
              {connectionStatus === "connected" ? "MT5 STREAM ACTIVE" : connectionStatus === "connecting" ? "SYNCING..." : "DISCONNECTED"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[--text-primary] font-display flex items-center gap-3">
            <Bell className="w-7 h-7 text-[--accent]" />
            Alerts & Surveillance
          </h1>
          <p className="text-xs font-medium text-[--text-secondary] mt-1 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[--accent]" />
            Real-time symbol price targets, high-frequency tick monitor, and automated Discord / Telegram broadcasting.
          </p>
        </div>

        {/* Global Action Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsFeedActive(!isFeedActive)}
            className="px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-[--bg-elevated] flex items-center gap-1.5"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFeedActive ? "text-[--accent]" : "text-[--text-tertiary]"}`} />
            {isFeedActive ? "Feed Active" : "Feed Paused"}
          </button>

          <div
            className="px-3.5 py-1.5 rounded-xl border text-[11px] font-bold uppercase tracking-wider flex items-center gap-2"
            style={{
              background: config.alerts_paused ? "rgba(245,158,11,0.08)" : "rgba(0,212,161,0.08)",
              borderColor: config.alerts_paused ? "rgba(245,158,11,0.3)" : "rgba(0,212,161,0.3)",
              color: config.alerts_paused ? "#f59e0b" : "var(--accent)",
            }}
          >
            <span className={`w-2 h-2 rounded-full ${config.alerts_paused ? "bg-amber-400" : "bg-[#00d4a1]"}`} />
            {config.alerts_paused ? "Dispatch Muted" : "Dispatch Armed"}
          </div>

          <div className="px-3 py-1.5 rounded-xl border text-[11px] font-mono font-bold text-[--text-primary] bg-[--bg-card]" style={{ borderColor: "var(--border)" }}>
            {activeTargetsCount} Active {activeTargetsCount === 1 ? "Target" : "Targets"}
          </div>
        </div>
      </div>

      {/* ── TAB NAVIGATION ── */}
      <div className="flex items-center gap-2 border-b pb-1" style={{ borderColor: "var(--border)" }}>
        {[
          { id: "targets", label: "Live Watcher & Price Targets", icon: TargetIcon, badge: activeTargetsCount > 0 ? activeTargetsCount : undefined },
          { id: "integrations", label: "Channels & Webhooks", icon: Radio, badge: undefined },
          { id: "history", label: "Alert History & Logs", icon: History, badge: history.length > 0 ? history.length : undefined },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                isActive
                  ? "bg-[--accent]/15 text-[--accent] border border-[--accent]/30 shadow-sm"
                  : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className="text-[9px] font-black px-1.5 py-0.2 rounded-full border"
                  style={
                    isActive
                      ? { background: "var(--accent)", color: "#000000", borderColor: "var(--accent)" }
                      : { background: "var(--bg-elevated)", color: "var(--text-tertiary)", borderColor: "var(--border)" }
                  }
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: LIVE WATCHER & PRICE TARGETS ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "targets" && (
        <div className="space-y-6">
          {/* ── Real-Time Multi-Asset Sensor Grid ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[--accent]" />
                <h2 className="text-sm font-bold text-[--text-primary] uppercase tracking-wider">
                  Active Asset Sensors
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[--text-tertiary]">
                {lastFeedTick ? `TICK: ${lastFeedTick}` : "LISTENING..."}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {WATCHLIST_SYMBOLS.map((item) => {
                const tick = liveTicks[item.symbol];
                const isSelected = selectedTargetSymbol === item.symbol;
                const changePct = tick?.changePercent ?? 0;
                const isPos = changePct >= 0;

                return (
                  <div
                    key={item.symbol}
                    onClick={() => {
                      setSelectedTargetSymbol(item.symbol);
                      if (tick) {
                        const mid = (tick.bid + tick.ask) / 2;
                        setTargetPriceInput(mid.toFixed(item.decimals));
                      }
                    }}
                    className={`rounded-xl p-3 border transition-all cursor-pointer relative group ${
                      isSelected
                        ? "bg-[--accent]/10 border-[--accent] shadow-[0_0_15px_rgba(0,212,161,0.15)]"
                        : "bg-[--bg-card] hover:border-[--border-strong] border-[--border]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[--text-primary] font-display">{item.symbol}</span>
                      <span className="text-[9px] uppercase font-mono font-bold text-[--text-tertiary]">{item.type}</span>
                    </div>

                    {tick ? (
                      <div className="space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-base font-bold font-mono tracking-tight text-[--text-primary]">
                            {tick.bid.toFixed(item.decimals)}
                          </span>
                          <span
                            className={`flex items-center text-[10px] font-mono font-bold ${
                              isPos ? "text-[--profit]" : "text-[--loss]"
                            }`}
                          >
                            {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(changePct).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-[--text-tertiary] pt-1 border-t border-[--border]/40">
                          <span>Spread</span>
                          <span className="font-semibold text-[--text-secondary]">
                            {(tick.spread / item.pipFactor).toFixed(1)} pips
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 text-center text-[10px] text-[--text-tertiary] animate-pulse">
                        Scanning...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Split: Target Deployment vs Active Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ── Left: Target Deployment Matrix (5 cols) ── */}
            <div className="lg:col-span-5 rounded-2xl border p-5 space-y-4 bg-[--bg-card]" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <TargetIcon className="w-4 h-4 text-[--accent]" />
                  <h3 className="text-sm font-bold text-[--text-primary]">Deploy Price Target</h3>
                </div>
                <span className="text-[10px] uppercase font-mono font-bold text-[--accent] bg-[--accent]/10 px-2 py-0.5 rounded border border-[--accent]/30">
                  {selectedTargetSymbol}
                </span>
              </div>

              {/* Asset Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] mb-1.5">
                  Select Target Asset
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {WATCHLIST_SYMBOLS.map((s) => (
                    <button
                      key={s.symbol}
                      onClick={() => {
                        setSelectedTargetSymbol(s.symbol);
                        const t = liveTicks[s.symbol];
                        if (t) {
                          setTargetPriceInput(((t.bid + t.ask) / 2).toFixed(s.decimals));
                        }
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                        selectedTargetSymbol === s.symbol
                          ? "shadow-[0_0_12px_rgba(0,212,161,0.3)]"
                          : "hover:border-[--border-strong]"
                      }`}
                      style={
                        selectedTargetSymbol === s.symbol
                          ? { background: "var(--accent)", color: "#000000", borderColor: "var(--accent)" }
                          : { background: "var(--bg-base)", color: "var(--text-secondary)", borderColor: "var(--border)" }
                      }
                    >
                      {s.symbol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Reference Price Badge */}
              {currentLiveSymbol && (
                <div className="p-3 rounded-xl bg-[--bg-base] border flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                  <div className="text-[11px] text-[--text-tertiary]">
                    Current Live Reference:
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs font-bold text-[--text-primary]">
                    <span>Bid: {currentLiveSymbol.bid.toFixed(currentSymbolMeta?.decimals ?? 3)}</span>
                    <span className="text-[--text-tertiary]">|</span>
                    <span>Ask: {currentLiveSymbol.ask.toFixed(currentSymbolMeta?.decimals ?? 3)}</span>
                  </div>
                </div>
              )}

              {/* Target Price Input & Quick Offset Pills */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] mb-1.5">
                  Trigger Target Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={targetPriceInput}
                  onChange={(e) => setTargetPriceInput(e.target.value)}
                  placeholder="0.00000"
                  className={inputCls}
                  style={inputStyle}
                />

                {/* Quick Offset Pills */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-[--text-tertiary] font-medium mr-1">Quick:</span>
                  {[
                    { label: "Current", offset: 0 },
                    { label: "+10p", offset: 10 },
                    { label: "+25p", offset: 25 },
                    { label: "+50p", offset: 50 },
                    { label: "-10p", offset: -10 },
                    { label: "-25p", offset: -25 },
                    { label: "-50p", offset: -50 },
                  ].map((pill) => (
                    <button
                      key={pill.label}
                      type="button"
                      onClick={() => applyPriceOffset(pill.offset)}
                      className="px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold text-[--text-secondary] bg-[--bg-base] hover:text-[--text-primary] hover:bg-[--bg-elevated] transition-colors"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition & Reference Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] mb-1.5">
                    Trigger Condition
                  </label>
                  <select
                    value={targetCondition}
                    onChange={(e) => setTargetCondition(e.target.value as PriceTarget["condition"])}
                    className="w-full rounded-xl border px-3 py-2 text-xs font-bold focus:outline-none"
                    style={{ background: "var(--bg-base)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  >
                    <option value="above">Break Above (≥)</option>
                    <option value="below">Break Below (≤)</option>
                    <option value="tap">Exact Level Tap (≈)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] mb-1.5">
                    Price Reference
                  </label>
                  <select
                    value={targetReference}
                    onChange={(e) => setTargetReference(e.target.value as PriceTarget["reference"])}
                    className="w-full rounded-xl border px-3 py-2 text-xs font-bold focus:outline-none"
                    style={{ background: "var(--bg-base)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  >
                    <option value="mid">Mid Price (Average)</option>
                    <option value="bid">Bid Price (Sell Fill)</option>
                    <option value="ask">Ask Price (Buy Fill)</option>
                  </select>
                </div>
              </div>

              {/* Dispatch Channel Toggles */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] mb-2">
                  Notification Channels
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNotifySound(!notifySound)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      notifySound
                        ? "bg-[--accent]/10 border-[--accent]/40 text-[--accent]"
                        : "bg-[--bg-base] border-[--border] text-[--text-tertiary]"
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Audio Chime</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotifyPush(!notifyPush)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      notifyPush
                        ? "bg-[--accent]/10 border-[--accent]/40 text-[--accent]"
                        : "bg-[--bg-base] border-[--border] text-[--text-tertiary]"
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Desktop Push</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotifyWebhook(!notifyWebhook)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      notifyWebhook
                        ? "bg-[--accent]/10 border-[--accent]/40 text-[--accent]"
                        : "bg-[--bg-base] border-[--border] text-[--text-tertiary]"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Webhook Bot</span>
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleDeployTarget}
                  className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,212,161,0.25)]"
                  style={{ background: "var(--accent)", color: "#000000" }}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Deploy Surveillance Target</span>
                </button>

                {notificationPermission !== "granted" && (
                  <button
                    type="button"
                    onClick={requestPushPermission}
                    className="w-full py-2 rounded-xl border text-[11px] font-bold uppercase tracking-wider text-[--text-secondary] hover:bg-[--bg-elevated] transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Authorize Browser Push ({notificationPermission})
                  </button>
                )}
              </div>
            </div>

            {/* ── Right: Active Targets Matrix (7 cols) ── */}
            <div className="lg:col-span-7 rounded-2xl border p-5 bg-[--bg-card] flex flex-col" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[--accent]" />
                  <h3 className="text-sm font-bold text-[--text-primary]">Active Surveillance Grid</h3>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[--accent]/15 text-[--accent]">
                    {activeTargetsCount} ARMED
                  </span>
                </div>

                {targets.some((t) => t.triggered) && (
                  <button
                    onClick={handleClearBreached}
                    className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] hover:text-[--loss] transition-colors"
                  >
                    Clear Breached
                  </button>
                )}
              </div>

              {targets.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl" style={{ borderColor: "var(--border)" }}>
                  <TargetIcon className="w-10 h-10 text-[--text-tertiary] mb-3 opacity-40" />
                  <p className="text-sm font-bold text-[--text-secondary]">No active targets deployed</p>
                  <p className="text-xs text-[--text-tertiary] max-w-xs mt-1">
                    Select an asset on the left and deploy a price trigger node to monitor real-time level breaks.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                  {targets.map((target) => {
                    const tick = liveTicks[target.symbol];
                    const meta = WATCHLIST_SYMBOLS.find((s) => s.symbol === target.symbol);
                    const dec = meta?.decimals ?? 3;
                    const pipFactor = meta?.pipFactor ?? 0.0001;

                    let distancePips: number | null = null;
                    if (tick && !target.triggered) {
                      const cur =
                        target.reference === "bid"
                          ? tick.bid
                          : target.reference === "ask"
                          ? tick.ask
                          : (tick.bid + tick.ask) / 2;
                      distancePips = (target.price - cur) / pipFactor;
                    }

                    return (
                      <div
                        key={target.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                          target.triggered
                            ? "bg-[--bg-base]/50 border-[--border] opacity-60"
                            : "bg-[--bg-base] border-[--border] hover:border-[--border-strong]"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold font-display text-[--text-primary]">
                              {target.symbol}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                target.triggered
                                  ? "bg-[--loss]/15 text-[--loss] border border-[--loss]/30"
                                  : "bg-[--accent]/15 text-[--accent] border border-[--accent]/30"
                              }`}
                            >
                              {target.triggered ? "BREACHED" : "ARMED"}
                            </span>
                            <span className="text-[10px] font-mono text-[--text-tertiary]">
                              Ref: {target.reference.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="font-bold text-[--text-primary]">
                              {target.condition === "above" ? "▲ Break Above" : target.condition === "below" ? "▼ Break Below" : "⊙ Tap Level"}{" "}
                              {target.price.toFixed(dec)}
                            </span>

                            {distancePips !== null && (
                              <span
                                className={`text-[11px] font-bold ${
                                  Math.abs(distancePips) <= 10
                                    ? "text-[--profit] font-bold animate-pulse"
                                    : "text-[--text-secondary]"
                                }`}
                              >
                                {distancePips > 0 ? `+${distancePips.toFixed(1)}` : distancePips.toFixed(1)} pips away
                              </span>
                            )}

                            {target.triggered && target.triggeredAt && (
                              <span className="text-[10px] text-[--text-tertiary]">
                                Breached at {target.triggeredAt}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          {target.triggered && (
                            <button
                              onClick={() => handleRearmTarget(target.id)}
                              title="Re-arm Target"
                              className="p-2 rounded-lg border text-[--text-secondary] hover:text-[--accent] hover:border-[--accent] transition-colors"
                              style={{ borderColor: "var(--border)" }}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteTarget(target.id)}
                            title="Delete Target"
                            className="p-2 rounded-lg border text-[--text-tertiary] hover:text-[--loss] hover:bg-[--loss]/10 transition-colors"
                            style={{ borderColor: "var(--border)" }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: CHANNELS & WEBHOOKS (INTEGRATIONS) ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          {/* Master Killswitch & Status */}
          <div
            className={`rounded-2xl border p-5 transition-all ${
              config.alerts_paused
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-[--accent]/30 bg-[--accent]/5"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2
                  className={`font-bold flex items-center gap-2 ${
                    config.alerts_paused ? "text-amber-400" : "text-[--accent]"
                  }`}
                >
                  <BellRing className="w-4 h-4" /> Global Dispatch Switch:{" "}
                  {config.alerts_paused ? "MUTED (PAUSED)" : "ACTIVE (DISPATCHING)"}
                </h2>
                <p className="text-xs text-[--text-secondary] mt-1 max-w-xl leading-relaxed">
                  Master emergency circuit breaker. When paused, all automated external webhook posts
                  to Discord and Telegram are halted immediately across all systems.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const next = { ...config, alerts_paused: true };
                    setConfig(next);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border"
                  style={
                    config.alerts_paused
                      ? { background: "#f59e0b", color: "#000000", borderColor: "#f59e0b" }
                      : { background: "var(--bg-base)", color: "var(--text-secondary)", borderColor: "var(--border)" }
                  }
                >
                  Mute All
                </button>
                <button
                  onClick={() => {
                    const next = { ...config, alerts_paused: false };
                    setConfig(next);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border"
                  style={
                    !config.alerts_paused
                      ? { background: "var(--accent)", color: "#000000", borderColor: "var(--accent)" }
                      : { background: "var(--bg-base)", color: "var(--text-secondary)", borderColor: "var(--border)" }
                  }
                >
                  Arm All
                </button>
              </div>
            </div>

            {/* Granular Category Toggles */}
            {!config.alerts_paused && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                {[
                  { key: "news_paused" as const, label: "📰 News Wire" },
                  { key: "calendar_paused" as const, label: "📅 Calendar Events" },
                  { key: "signals_paused" as const, label: "⚡ Setup Signals" },
                  { key: "executions_paused" as const, label: "🎯 Order Fills" },
                  { key: "custom_paused" as const, label: "🎯 Price Targets" },
                ].map(({ key, label }) => {
                  const isMuted = config[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setConfig({ ...config, [key]: !isMuted })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isMuted
                          ? "bg-[--bg-base] opacity-60 border-[--border]"
                          : "bg-[--bg-elevated] border-[--border-strong]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-[--text-primary]">{label}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${isMuted ? "bg-amber-400" : "bg-[--accent]"}`}
                        />
                      </div>
                      <p className="text-[9px] font-mono text-[--text-tertiary]">
                        {isMuted ? "MUTED" : "ENABLED"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* DND Quiet Hours */}
          <div className="rounded-2xl border p-5 space-y-3 bg-[--bg-card]" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[--accent]" />
                <h3 className="text-sm font-bold text-[--text-primary]">Do Not Disturb (DND) Quiet Hours</h3>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-[--text-secondary]">
                <input
                  type="checkbox"
                  checked={config.dnd_enabled}
                  onChange={(e) => setConfig({ ...config, dnd_enabled: e.target.checked })}
                  className="rounded text-[--accent] focus:ring-0"
                />
                Enable Quiet Schedule
              </label>
            </div>
            <p className="text-xs text-[--text-secondary]">
              Automatically suppress non-critical alerts between scheduled quiet hours (e.g., during sleeping hours).
            </p>

            {config.dnd_enabled && (
              <div className="grid grid-cols-2 gap-4 max-w-md pt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={config.dnd_start}
                    onChange={(e) => setConfig({ ...config, dnd_start: e.target.value })}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={config.dnd_end}
                    onChange={(e) => setConfig({ ...config, dnd_end: e.target.value })}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Discord Webhooks */}
          <div className="rounded-2xl border p-5 space-y-4 bg-[--bg-card]" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
              <div className="w-6 h-6 rounded-lg bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center font-bold text-xs">
                #
              </div>
              <h3 className="text-sm font-bold text-[--text-primary]">Discord Webhook Channels</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "discord_news_webhook" as const, label: "📰 News Feed Webhook", test: "news" as const },
                { key: "discord_calendar_webhook" as const, label: "📅 Economic Calendar Webhook", test: "calendar" as const },
                { key: "discord_signals_webhook" as const, label: "⚡ Trading Signals Webhook", test: "signals" as const },
                { key: "discord_alerts_webhook" as const, label: "🎯 Target Breaches & Executions", test: "executions" as const },
              ].map(({ key, label, test }) => {
                const isValid = config[key]?.includes("discord.com/api/webhooks");
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-[--text-secondary]">{label}</span>
                      <span className={`text-[10px] font-mono ${isValid ? "text-[--profit]" : "text-[--text-tertiary]"}`}>
                        {isValid ? "CONFIGURED" : "NOT SET"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={config[key] || ""}
                        onChange={setConfigField(key)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className={inputCls}
                        style={inputStyle}
                      />
                      <button
                        onClick={() => testChannel(test)}
                        disabled={!isValid || testing !== null}
                        className="px-3 py-2 rounded-xl border text-xs font-bold disabled:opacity-40 hover:bg-[--bg-elevated] transition-colors flex items-center gap-1.5"
                        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                      >
                        {testing === test ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube2 className="w-3.5 h-3.5" />}
                        Test
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telegram Bot & Topics */}
          <div className="rounded-2xl border p-5 space-y-4 bg-[--bg-card]" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
              <MessageCircle className="w-5 h-5 text-[#24A1DE]" />
              <h3 className="text-sm font-bold text-[--text-primary]">Telegram Bot & Topic Routing</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="password"
                  value={config.telegram_bot_token || ""}
                  onChange={setConfigField("telegram_bot_token")}
                  placeholder="123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] mb-1">
                  Main Chat ID / Supergroup ID
                </label>
                <input
                  type="text"
                  value={config.telegram_chat_id || ""}
                  onChange={setConfigField("telegram_chat_id")}
                  placeholder="-100123456789"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Telegram Topic Threads */}
            <div className="pt-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] mb-2">
                Forum Topic Thread IDs (Optional)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { key: "telegram_thread_news" as const, label: "📰 News Topic ID" },
                  { key: "telegram_thread_calendar" as const, label: "📅 Calendar Topic ID" },
                  { key: "telegram_thread_signals" as const, label: "⚡ Signals Topic ID" },
                  { key: "telegram_thread_alerts" as const, label: "🎯 Executions Topic ID" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <span className="text-[10px] text-[--text-tertiary] block mb-1">{label}</span>
                    <input
                      type="text"
                      value={config[key] || ""}
                      onChange={setConfigField(key)}
                      placeholder="e.g. 7"
                      className={inputCls}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Save Settings Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,212,161,0.25)]"
              style={{ background: "var(--accent)", color: "#000000" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving Configuration..." : "Save Integration Settings"}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: ALERT HISTORY & AUDIT LOG ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="rounded-2xl border p-5 space-y-4 bg-[--bg-card]" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[--accent]" />
              <h3 className="text-sm font-bold text-[--text-primary]">Surveillance & Dispatch Audit Log</h3>
              <span className="text-[10px] font-mono text-[--text-tertiary]">
                ({history.length} logged events)
              </span>
            </div>

            {/* Filter pills & Clear */}
            <div className="flex items-center gap-2 flex-wrap">
              {(["all", "target", "news", "calendar", "signals"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setHistoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors border ${
                    historyFilter === cat
                      ? "shadow-sm"
                      : "hover:text-[--text-primary]"
                  }`}
                  style={
                    historyFilter === cat
                      ? { background: "var(--accent)", color: "#000000", borderColor: "var(--accent)" }
                      : { background: "var(--bg-base)", color: "var(--text-secondary)", borderColor: "var(--border)" }
                  }
                >
                  {cat}
                </button>
              ))}

              {history.length > 0 && (
                <button
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem("journex_alert_history");
                    toast.info("Alert log cleared");
                  }}
                  className="p-1.5 rounded-lg border text-[--text-tertiary] hover:text-[--loss] hover:bg-[--loss]/10 transition-colors ml-2"
                  style={{ borderColor: "var(--border)" }}
                  title="Clear Log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {history.filter((h) => historyFilter === "all" || h.type === historyFilter).length === 0 ? (
              <div className="p-12 text-center text-xs text-[--text-tertiary]">
                No alert history events matching current filter.
              </div>
            ) : (
              history
                .filter((h) => historyFilter === "all" || h.type === historyFilter)
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border bg-[--bg-base] flex items-start gap-3 transition-colors hover:border-[--border-strong]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        item.type === "target"
                          ? "bg-[--accent]/15 text-[--accent]"
                          : item.type === "news"
                          ? "bg-[#ff5c73]/15 text-[#ff5c73]"
                          : item.type === "calendar"
                          ? "bg-[#8b5cf6]/15 text-[#8b5cf6]"
                          : "bg-blue-500/15 text-blue-400"
                      }`}
                    >
                      {item.type === "target" ? "🎯" : item.type === "news" ? "📰" : item.type === "calendar" ? "📅" : "⚡"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[--text-primary] truncate">
                          {item.channel}
                        </span>
                        <span className="text-[10px] font-mono text-[--text-tertiary] shrink-0">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-xs text-[--text-secondary] mt-0.5 leading-relaxed break-words">
                        {item.message}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
