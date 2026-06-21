"use client";
import { useState, useEffect } from "react";
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
  Activity
} from "lucide-react";
import { toast } from "sonner";

const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge";

interface AlertConfig {
  discord_news_webhook: string;
  discord_calendar_webhook: string;
  telegram_bot_token: string;
  telegram_news_chat_id: string;
  telegram_cal_chat_id: string;
  dnd_enabled: boolean;
  dnd_start: string;
  dnd_end: string;
  alerts_paused: boolean;
}

const DEFAULT: AlertConfig = {
  discord_news_webhook: "",
  discord_calendar_webhook: "",
  telegram_bot_token: "",
  telegram_news_chat_id: "",
  telegram_cal_chat_id: "",
  dnd_enabled: false,
  dnd_start: "22:00",
  dnd_end: "06:00",
  alerts_paused: true,
};

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${active ? "bg-green-500 shadow-[0_0_6px_#22c55e]" : "opacity-30 bg-white/30"}`}
    />
  );
}

// Shared input class using dashboard design tokens
const inputCls = "w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[--accent] transition-colors";
const inputStyle = { background: "var(--bg-base)", borderColor: "var(--border)", color: "var(--text-primary)" };

export default function AlertSettingsPage() {
  const [config, setConfig] = useState<AlertConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const [history, setHistory] = useState<{ id: string; time: string; channel: string; message: string; type: "custom" | "news" | "calendar" }[]>([]);
  const [customRules, setCustomRules] = useState<{ id: string; pair: string; condition: string; price: string; dest: string }[]>([]);

  const [rulePair, setRulePair] = useState("XAUUSD");
  const [ruleCondition, setRuleCondition] = useState(">");
  const [rulePrice, setRulePrice] = useState("");
  const [ruleDest, setRuleDest] = useState("Telegram");

  useEffect(() => {
    try {
      const _rules = JSON.parse(localStorage.getItem("alert_rules") || "[]");
      setCustomRules(_rules);
      const _history = JSON.parse(localStorage.getItem("alert_history") || "[]");
      if (_history.length === 0) {
        const defaultHistory: typeof history = [
          { id: "1", time: new Date(Date.now() - 500000).toLocaleString(), channel: "Discord News", message: "US Core Retail Sales m/m: 0.6% vs 0.4% expected", type: "news" },
          { id: "2", time: new Date(Date.now() - 1500000).toLocaleString(), channel: "Telegram Calendar", message: "15 min to Event: USD Federal Funds Rate", type: "calendar" }
        ];
        setHistory(defaultHistory);
        localStorage.setItem("alert_history", JSON.stringify(defaultHistory));
      } else {
        setHistory(_history);
      }
    } catch (e) {}

    fetch(`${BRIDGE}/api/alert-config`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((data) => { setConfig((prev) => ({ ...prev, ...data })); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BRIDGE}/api/alert-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) toast.success("Alert config saved!");
      else toast.error(data.error ?? "Save failed");
    } catch {
      toast.error("Cannot reach MT5 bridge");
    }
    setSaving(false);
  };

  const test = async (type: "news" | "calendar") => {
    setTesting(type);
    try {
      const res = await fetch(`${BRIDGE}/api/alert-config/test?type=${type}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
        method: "POST",
      });
      const data = await res.json();
      if (data.success) toast.success(`Test sent to: ${data.sent_to.join(", ")} ✅`, { duration: 5000 });
      else toast.error(data.error ?? "Test failed");
    } catch {
      toast.error("Cannot reach MT5 bridge");
    }
    setTesting(null);
  };

  const setField = (key: keyof AlertConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setConfig((prev) => ({ ...prev, [key]: e.target.value }));

  const addRule = () => {
    if (!rulePrice) { toast.error("Price required"); return; }
    const newRule = { id: Date.now().toString(), pair: rulePair, condition: ruleCondition, price: rulePrice, dest: ruleDest };
    const newRules = [...customRules, newRule];
    setCustomRules(newRules);
    localStorage.setItem("alert_rules", JSON.stringify(newRules));
    setRulePrice("");
    toast.success("Rule armed");
    const newHist = [{ id: Date.now().toString(), time: new Date().toLocaleString(), channel: ruleDest, message: `Rule armed: IF ${rulePair} ${ruleCondition} ${rulePrice}`, type: "custom" as const }, ...history].slice(0, 50);
    setHistory(newHist);
    localStorage.setItem("alert_history", JSON.stringify(newHist));
  };

  const deleteRule = (id: string) => {
    const newRules = customRules.filter(r => r.id !== id);
    setCustomRules(newRules);
    localStorage.setItem("alert_rules", JSON.stringify(newRules));
  };

  const discordNewsOk = config.discord_news_webhook.includes("discord.com/api/webhooks");
  const discordCalOk = config.discord_calendar_webhook.includes("discord.com/api/webhooks");
  const telegramOk = config.telegram_bot_token.length > 5;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-8 max-w-3xl pb-20">

      {/* ── HEADER ── */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest mb-3" style={{ background: "rgba(0,212,161,0.1)", border: "1px solid rgba(0,212,161,0.2)", color: "var(--accent)" }}>
          <BellRing size={12} /> ALERT CONSOLE
        </div>
        <h1 className="text-[32px] font-black tracking-tight" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
          Alert <span style={{ color: "var(--accent)" }}>Configuration</span>
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
          Configure Discord webhooks and Telegram for real-time news and calendar alerts
        </p>
      </div>

      {/* ── Global Status ── */}
      <div className={`rounded-2xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${config.alerts_paused ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
        <div>
          <h2 className={`font-bold flex items-center gap-2 ${config.alerts_paused ? "text-amber-400" : "text-emerald-400"}`}>
            <BellRing className="w-4 h-4" /> Status: {config.alerts_paused ? "PAUSED" : "ACTIVE"}
          </h2>
          <p className="text-xs mt-1 max-w-sm" style={{ color: "var(--text-secondary)" }}>
            Mute or unmute all Discord and Telegram notifications globally.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConfig(prev => ({ ...prev, alerts_paused: true }))}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${config.alerts_paused ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "hover:opacity-80"}`}
            style={!config.alerts_paused ? { background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" } : {}}
          >Pause</button>
          <button
            onClick={() => setConfig(prev => ({ ...prev, alerts_paused: false }))}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${!config.alerts_paused ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "hover:opacity-80"}`}
            style={config.alerts_paused ? { background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" } : {}}
          >Active</button>
        </div>
      </div>

      {/* ── DND ── */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-red-400 flex items-center gap-2"><Bell className="w-4 h-4" /> Do Not Disturb</h2>
          <p className="text-xs text-red-400/70 mt-1 max-w-sm">Pause non-critical notifications during these hours. Execution errors still bypass DND.</p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl border flex-wrap" style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}>
          <label className="flex items-center gap-2 cursor-pointer pr-3 border-r" style={{ borderColor: "var(--border)" }}>
            <input type="checkbox" checked={config.dnd_enabled} onChange={e => setConfig(p => ({ ...p, dnd_enabled: e.target.checked }))} className="accent-red-500 w-4 h-4" />
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Enable DND</span>
          </label>
          <div className="flex items-center gap-2">
            <input type="time" value={config.dnd_start} onChange={setField("dnd_start")} disabled={!config.dnd_enabled}
              className="px-2 py-1 text-sm rounded-lg border focus:outline-none disabled:opacity-50 font-mono" style={{ background: "var(--bg-base)", borderColor: "var(--border)", color: "var(--text-primary)", colorScheme: "dark" }} />
            <span className="text-xs font-bold" style={{ color: "var(--text-tertiary)" }}>TO</span>
            <input type="time" value={config.dnd_end} onChange={setField("dnd_end")} disabled={!config.dnd_enabled}
              className="px-2 py-1 text-sm rounded-lg border focus:outline-none disabled:opacity-50 font-mono" style={{ background: "var(--bg-base)", borderColor: "var(--border)", color: "var(--text-primary)", colorScheme: "dark" }} />
          </div>
        </div>
      </div>

      {/* ── Discord ── */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ background: "rgba(88,101,242,0.08)", borderColor: "var(--border)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#5865F2" }}>
            <Hash className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>Discord</h2>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Paste webhook URL from Channel Settings → Integrations → Webhooks</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {[
            { key: "discord_news_webhook" as const, label: "📰 News Webhook URL", hint: "posts high-impact headlines", ok: discordNewsOk, testType: "news" as const },
            { key: "discord_calendar_webhook" as const, label: "📅 Calendar Webhook URL", hint: "posts ForexFactory events + 15-min alerts", ok: discordCalOk, testType: "calendar" as const },
          ].map(({ key, label, hint, ok, testType }) => (
            <div key={key}>
              <label className="flex items-center justify-between text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                <span className="flex items-center gap-2"><StatusDot active={ok} />{label}</span>
                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{hint}</span>
              </label>
              <div className="flex gap-2">
                <input type="url" value={config[key]} onChange={setField(key)} placeholder="https://discord.com/api/webhooks/..."
                  className={inputCls} style={inputStyle} />
                <button onClick={() => test(testType)} disabled={!ok || testing !== null}
                  className="px-3 py-2 rounded-xl border text-sm font-bold flex items-center gap-1.5 disabled:opacity-40 transition-colors hover:bg-white/5"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  {testing === testType ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                  Test
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Telegram ── */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ background: "rgba(36,161,222,0.08)", borderColor: "var(--border)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#24A1DE" }}>
            <Send className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>Telegram</h2>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Create a bot via @BotFather, get Chat ID via @userinfobot or @RawDataBot</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="flex items-center justify-between text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
              <span className="flex items-center gap-2"><StatusDot active={telegramOk} />🤖 Bot Token</span>
              <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>from @BotFather → /newbot</span>
            </label>
            <input type="password" value={config.telegram_bot_token} onChange={setField("telegram_bot_token")}
              placeholder="123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className={inputCls} style={inputStyle} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: "telegram_news_chat_id" as const, label: "📰 News Chat ID", testType: "news" as const, enabled: telegramOk && !!config.telegram_news_chat_id },
              { key: "telegram_cal_chat_id" as const, label: "📅 Calendar Chat ID", testType: "calendar" as const, enabled: telegramOk && !!config.telegram_cal_chat_id },
            ].map(({ key, label, testType, enabled }) => (
              <div key={key}>
                <label className="flex items-center gap-2 text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                  <MessageCircle className="w-3.5 h-3.5 text-[#24A1DE]" />{label}
                </label>
                <div className="flex gap-2">
                  <input type="text" value={config[key]} onChange={setField(key)} placeholder="-100123456789"
                    className={inputCls} style={inputStyle} />
                  <button onClick={() => test(testType)} disabled={!enabled || testing !== null}
                    className="px-3 py-2 rounded-xl border text-sm font-bold flex items-center gap-1.5 disabled:opacity-40 transition-colors hover:bg-white/5"
                    style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                    {testing === testType ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                    Test
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-4 text-xs space-y-1" style={{ background: "rgba(36,161,222,0.06)", border: "1px solid rgba(36,161,222,0.15)", color: "var(--text-secondary)" }}>
            <p className="font-bold" style={{ color: "var(--text-primary)" }}>How to get a Chat ID:</p>
            <p>1. Add your bot to the channel/group</p>
            <p>2. Send any message in the chat</p>
            <p>3. Visit: <code className="text-[#24A1DE]">https://api.telegram.org/bot{"<TOKEN>"}/getUpdates</code></p>
            <p>4. Find <code>"chat": {"{"}"id": -100xxxxxxxxx{"}"}</code> in the response</p>
          </div>
        </div>
      </div>

      {/* ── What Gets Sent ── */}
      <div className="rounded-2xl border p-6 space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <h2 className="font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Bell className="w-4 h-4 text-violet-400" /> What Gets Sent
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: "📰", label: "Hot News", detail: "Every 5 min — only new high-impact headlines", badge: "→ News Channel", badgeColor: "rgba(244,63,94,0.15)", badgeText: "#f43f5e" },
            { icon: "📅", label: "Daily Calendar", detail: "Posted once per day on bridge startup", badge: "→ Calendar Channel", badgeColor: "rgba(139,92,246,0.15)", badgeText: "#8b5cf6" },
            { icon: "⚠️", label: "Event Countdown", detail: "15-min warning before each high/medium event", badge: "→ Calendar Channel", badgeColor: "rgba(139,92,246,0.15)", badgeText: "#8b5cf6" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-xl p-4 border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
              <span className="text-lg mt-0.5">{item.icon}</span>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{item.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{item.detail}</p>
                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: item.badgeColor, color: item.badgeText }}>{item.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Custom Pulse Rules ── */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ background: "rgba(16,185,129,0.06)", borderColor: "var(--border)" }}>
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>Custom Pulse Rules</h2>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Trigger webhooks when price action levels are hit</p>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold" style={{ color: "var(--text-tertiary)" }}>IF</span>
            {[
              <select key="pair" value={rulePair} onChange={e => setRulePair(e.target.value)} className="rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-[--accent]" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                {["XAUUSD","EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD"].map(p => <option key={p}>{p}</option>)}
              </select>,
              <select key="cond" value={ruleCondition} onChange={e => setRuleCondition(e.target.value)} className="rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-[--accent]" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                <option value=">">Above ( {">"} )</option>
                <option value="<">Below ( {"<"} )</option>
              </select>,
              <input key="price" type="number" step="0.001" value={rulePrice} onChange={e => setRulePrice(e.target.value)} className="w-24 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[--accent]" placeholder="Price" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />,
            ]}
            <span className="text-sm font-bold" style={{ color: "var(--text-tertiary)" }}>THEN SEND TO</span>
            <select value={ruleDest} onChange={e => setRuleDest(e.target.value)} className="rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-[--accent]" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              <option>Discord</option>
              <option>Telegram</option>
            </select>
            <button onClick={addRule} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ml-auto">
              <Plus className="w-4 h-4" /> Add Rule
            </button>
          </div>

          {customRules.length > 0 && (
            <div className="mt-5 space-y-2 border-t pt-5" style={{ borderColor: "var(--border)" }}>
              {customRules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-3 rounded-xl border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`w-2 h-2 rounded-full ${rule.condition === ">" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="font-bold" style={{ color: "var(--text-primary)" }}>{rule.pair}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{rule.condition === ">" ? "Above" : "Below"}</span>
                    <span className="font-mono px-2 py-0.5 rounded border text-xs" style={{ background: "var(--bg-base)", borderColor: "var(--border)", color: "var(--text-primary)" }}>{rule.price}</span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-tertiary)" }}>→ {rule.dest}</span>
                  </div>
                  <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded-lg text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Alert History Log ── */}
      <div className="rounded-2xl border p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <h2 className="font-bold flex items-center gap-2 mb-4" style={{ color: "var(--text-primary)" }}>
          <History className="w-4 h-4 text-violet-400" /> Alert History Log
        </h2>
        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
          {history.length > 0 ? history.map((h, i) => (
            <div key={h.id + i} className="flex items-start gap-3 p-3 rounded-xl border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
              <div className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center text-[10px] ${h.type === "news" ? "bg-red-500/20 text-red-400" : h.type === "calendar" ? "bg-violet-500/20 text-violet-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                {h.type === "news" ? "📰" : h.type === "calendar" ? "📅" : "⚡"}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{h.channel}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{h.time}</span>
                </div>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{h.message}</p>
              </div>
            </div>
          )) : (
            <p className="text-sm text-center italic py-4" style={{ color: "var(--text-tertiary)" }}>No alerts generated yet. Wait for the bridge connection.</p>
          )}
        </div>
      </div>

      {/* Save button */}
      <button onClick={save} disabled={saving}
        className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 shadow-[0_0_20px_rgba(0,212,161,0.2)] hover:shadow-[0_0_30px_rgba(0,212,161,0.3)]"
        style={{ background: "var(--accent)", color: "#000" }}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? "Saving…" : "Save Alert Configuration"}
      </button>
    </div>
  );
}
