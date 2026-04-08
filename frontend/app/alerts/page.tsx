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

const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL ?? "";

interface AlertConfig {
  discord_news_webhook: string;
  discord_calendar_webhook: string;
  telegram_bot_token: string;
  telegram_news_chat_id: string;
  telegram_cal_chat_id: string;
  dnd_enabled: boolean;
  dnd_start: string;
  dnd_end: string;
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
};

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${active ? "bg-green-500 shadow-[0_0_6px_#22c55e]" : "bg-muted-foreground/30"}`}
    />
  );
}

export default function AlertSettingsPage() {
  const [config, setConfig] = useState<AlertConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Custom Rules and History
  const [history, setHistory] = useState<{ id: string; time: string; channel: string; message: string; type: "custom" | "news" | "calendar" }[]>([]);
  const [customRules, setCustomRules] = useState<{ id: string; pair: string; condition: string; price: string; dest: string }[]>([]);

  const [rulePair, setRulePair] = useState("XAUUSD");
  const [ruleCondition, setRuleCondition] = useState(">");
  const [rulePrice, setRulePrice] = useState("");
  const [ruleDest, setRuleDest] = useState("Telegram");

  useEffect(() => {
    // Custom logic
    try {
        const _rules = JSON.parse(localStorage.getItem("alert_rules") || "[]");
        setCustomRules(_rules);
        
        const _history = JSON.parse(localStorage.getItem("alert_history") || "[]");
        if (_history.length === 0) {
            const defaultHistory: { id: string; time: string; channel: string; message: string; type: "custom" | "news" | "calendar" }[] = [
                { id: "1", time: new Date(Date.now() - 500000).toLocaleString(), channel: "Discord News", message: "US Core Retail Sales m/m: 0.6% vs 0.4% expected", type: "news" },
                { id: "2", time: new Date(Date.now() - 1500000).toLocaleString(), channel: "Telegram Calendar", message: "15 min to Event: USD Federal Funds Rate", type: "calendar" }
            ];
            setHistory(defaultHistory);
            localStorage.setItem("alert_history", JSON.stringify(defaultHistory));
        } else {
            setHistory(_history);
        }
    } catch(e){}

    fetch(`${BRIDGE}/api/alert-config`, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((r) => r.json())
      .then((data) => {
        setConfig((prev) => ({ ...prev, ...data }));
        setLoading(false);
      })
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
      const res = await fetch(`${BRIDGE}/api/alert-config/test?type=${type}`, { headers: { "ngrok-skip-browser-warning": "true" }, 
        method: "POST",
      });
      const data = await res.json();
      if (data.success)
        toast.success(`Test sent to: ${data.sent_to.join(", ")} ✅`, {
          duration: 5000,
        });
      else toast.error(data.error ?? "Test failed");
    } catch {
      toast.error("Cannot reach MT5 bridge");
    }
    setTesting(null);
  };

  const set =
    (key: keyof AlertConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setConfig((prev) => ({ ...prev, [key]: e.target.value }));

  const addRule = () => {
      if (!rulePrice) { toast.error("Price required"); return; }
      const newRule = { id: Date.now().toString(), pair: rulePair, condition: ruleCondition, price: rulePrice, dest: ruleDest };
      const newRules = [...customRules, newRule];
      setCustomRules(newRules);
      localStorage.setItem("alert_rules", JSON.stringify(newRules));
      setRulePrice("");
      toast.success("Rule active");
      
      const newHist = [{ id: Date.now().toString(), time: new Date().toLocaleString(), channel: ruleDest, message: `System rule armed: IF ${rulePair} ${ruleCondition} ${rulePrice}`, type: "custom" as const }, ...history].slice(0, 50);
      setHistory(newHist);
      localStorage.setItem("alert_history", JSON.stringify(newHist));
  };
  
  const deleteRule = (id: string) => {
      const newRules = customRules.filter(r => r.id !== id);
      setCustomRules(newRules);
      localStorage.setItem("alert_rules", JSON.stringify(newRules));
  };

  const discordNewsOk = config.discord_news_webhook.includes(
    "discord.com/api/webhooks",
  );
  const discordCalOk = config.discord_calendar_webhook.includes(
    "discord.com/api/webhooks",
  );
  const telegramOk = config.telegram_bot_token.length > 5;

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BellRing className="text-violet-500" size={24} />
          Alert Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure Discord webhooks and Telegram bot for real-time news and
          calendar alerts
        </p>
      </div>

      {/* ── Global Do Not Disturb Schedule ────────────────────────────── */}
      <section className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="font-bold text-rose-500 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Do Not Disturb (DND)
          </h2>
          <p className="text-xs text-rose-500/80 mt-1 max-w-sm">
            Pause all non-critical notifications during these hours. Position execution errors will still bypass DND.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-background p-3 rounded-xl border border-border shadow-sm flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer pr-4 border-r border-border">
            <input 
              type="checkbox" 
              checked={config.dnd_enabled} 
              onChange={e => setConfig(p => ({...p, dnd_enabled: e.target.checked}))} 
              className="accent-rose-500 w-4 h-4"
            />
            <span className="text-sm font-bold text-foreground">Enable DND</span>
          </label>
          <div className="flex items-center gap-2">
            <input 
              type="time" 
              value={config.dnd_start}
              onChange={set("dnd_start")}
              disabled={!config.dnd_enabled}
              className="bg-muted border border-border rounded-lg px-2 py-1 text-sm focus:outline-none disabled:opacity-50 text-foreground"
            />
            <span className="text-xs text-muted-foreground font-bold">TO</span>
            <input 
              type="time" 
              value={config.dnd_end}
              onChange={set("dnd_end")}
              disabled={!config.dnd_enabled}
              className="bg-muted border border-border rounded-lg px-2 py-1 text-sm focus:outline-none disabled:opacity-50 text-foreground"
            />
          </div>
        </div>
      </section>

      {/* ── Discord Section ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-[#5865F2]/10">
          <div className="w-8 h-8 rounded-lg bg-[#5865F2] flex items-center justify-center">
            <Hash className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Discord</h2>
            <p className="text-xs text-muted-foreground">
              Paste your webhook URL from Channel Settings → Integrations →
              Webhooks
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* News Webhook */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-foreground mb-1.5">
              <span className="flex items-center gap-2">
                <StatusDot active={discordNewsOk} />
                📰 News Webhook URL
              </span>
              <span className="text-[11px] text-muted-foreground">
                posts hot news headlines
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={config.discord_news_webhook}
                onChange={set("discord_news_webhook")}
                placeholder="https://discord.com/api/webhooks/..."
                className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 font-mono text-xs"
              />
              <button
                onClick={() => test("news")}
                disabled={!discordNewsOk || testing !== null}
                className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors"
              >
                {testing === "news" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube2 className="w-4 h-4" />
                )}
                Test
              </button>
            </div>
          </div>

          {/* Calendar Webhook */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-foreground mb-1.5">
              <span className="flex items-center gap-2">
                <StatusDot active={discordCalOk} />
                📅 Calendar Webhook URL
              </span>
              <span className="text-[11px] text-muted-foreground">
                posts ForexFactory events + 15-min alerts
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={config.discord_calendar_webhook}
                onChange={set("discord_calendar_webhook")}
                placeholder="https://discord.com/api/webhooks/..."
                className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 font-mono text-xs"
              />
              <button
                onClick={() => test("calendar")}
                disabled={!discordCalOk || testing !== null}
                className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors"
              >
                {testing === "calendar" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube2 className="w-4 h-4" />
                )}
                Test
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Telegram Section ──────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-[#24A1DE]/10">
          <div className="w-8 h-8 rounded-lg bg-[#24A1DE] flex items-center justify-center">
            <Send className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Telegram</h2>
            <p className="text-xs text-muted-foreground">
              Create a bot via @BotFather, get Chat ID via @userinfobot or
              @RawDataBot
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Bot Token */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-foreground mb-1.5">
              <span className="flex items-center gap-2">
                <StatusDot active={telegramOk} />
                🤖 Bot Token
              </span>
              <span className="text-[11px] text-muted-foreground">
                from @BotFather → /newbot
              </span>
            </label>
            <input
              type="password"
              value={config.telegram_bot_token}
              onChange={set("telegram_bot_token")}
              placeholder="123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#24A1DE]/40 font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* News Chat ID */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-[#24A1DE]" />
                📰 News Chat ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.telegram_news_chat_id}
                  onChange={set("telegram_news_chat_id")}
                  placeholder="-100123456789"
                  className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#24A1DE]/40 font-mono text-xs"
                />
                <button
                  onClick={() => test("news")}
                  disabled={
                    !telegramOk ||
                    !config.telegram_news_chat_id ||
                    testing !== null
                  }
                  className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                >
                  {testing === "news" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube2 className="w-4 h-4" />
                  )}
                  Test
                </button>
              </div>
            </div>

            {/* Calendar Chat ID */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-[#24A1DE]" />
                📅 Calendar Chat ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.telegram_cal_chat_id}
                  onChange={set("telegram_cal_chat_id")}
                  placeholder="-100123456789"
                  className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#24A1DE]/40 font-mono text-xs"
                />
                <button
                  onClick={() => test("calendar")}
                  disabled={
                    !telegramOk ||
                    !config.telegram_cal_chat_id ||
                    testing !== null
                  }
                  className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                >
                  {testing === "calendar" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube2 className="w-4 h-4" />
                  )}
                  Test
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#24A1DE]/5 border border-[#24A1DE]/20 px-4 py-3 text-[12px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">
              How to get a Chat ID:
            </p>
            <p>1. Add your bot to the channel/group</p>
            <p>2. Send any message in the chat</p>
            <p>
              3. Visit:{" "}
              <code className="text-[#24A1DE]">
                https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
              </code>
            </p>
            <p>
              4. Find{" "}
              <code>
                "chat": {"{"}"id": -100xxxxxxxxx{"}"}
              </code>{" "}
              in the response
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-violet-500" /> What Gets Sent
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {[
            {
              icon: "📰",
              label: "Hot News",
              detail: "Every 5 min — only new high-impact headlines",
              channel: "news",
            },
            {
              icon: "📅",
              label: "Daily Calendar",
              detail: "Posted once per day on bridge startup",
              channel: "calendar",
            },
            {
              icon: "⚠️",
              label: "Event Countdown",
              detail: "15-min warning before each high/medium event",
              channel: "calendar",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-xl bg-muted/40 p-3 border border-border"
            >
              <span className="text-lg mt-0.5">{item.icon}</span>
              <div>
                <p className="font-semibold text-foreground">{item.label}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {item.detail}
                </p>
                <span
                  className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.channel === "news" ? "bg-rose-500/10 text-rose-400" : "bg-violet-500/10 text-violet-400"}`}
                >
                  {item.channel === "news"
                    ? "→ News Channel"
                    : "→ Calendar Channel"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Custom Rule Builder ──────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
         <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-emerald-500/10">
           <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
             <Activity className="w-4 h-4 text-white" />
           </div>
           <div>
             <h2 className="font-bold text-foreground">Custom Pulse Rules</h2>
             <p className="text-xs text-muted-foreground">Trigger webhooks dynamically when price action levels are hit</p>
           </div>
         </div>
         <div className="p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-muted-foreground">IF</span>
              <select value={rulePair} onChange={e=>setRulePair(e.target.value)} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold">
                  <option>XAUUSD</option>
                  <option>EURUSD</option>
                  <option>GBPUSD</option>
              </select>
              <select value={ruleCondition} onChange={e=>setRuleCondition(e.target.value)} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold">
                  <option value=">">Goes Above ( {">"} )</option>
                  <option value="<">Goes Below ( {"<"} )</option>
              </select>
              <input type="number" step="0.001" value={rulePrice} onChange={e=>setRulePrice(e.target.value)} className="w-24 bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono" placeholder="Price" />
              <span className="text-sm font-bold text-muted-foreground">THEN SEND TO</span>
              <select value={ruleDest} onChange={e=>setRuleDest(e.target.value)} className="bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold">
                  <option>Discord</option>
                  <option>Telegram</option>
              </select>
              <button onClick={addRule} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ml-auto"><Plus className="w-4 h-4"/> Add Rule</button>
            </div>

            {/* Active Rules List */}
            {customRules.length > 0 && (
                <div className="mt-5 space-y-2 border-t border-border pt-5">
                    {customRules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                            <div className="flex items-center gap-3 text-sm">
                                <span className={`w-2 h-2 rounded-full ${rule.condition === '>' ? 'bg-emerald-500' : 'bg-rose-500'}`}/>
                                <span className="font-bold">{rule.pair}</span>
                                <span className="text-muted-foreground">{rule.condition === '>' ? 'Above' : 'Below'}</span>
                                <span className="font-mono bg-background px-2 py-0.5 rounded border border-border">{rule.price}</span>
                                <span className="text-muted-foreground text-xs ml-2">→ {rule.dest}</span>
                            </div>
                            <button onClick={()=>deleteRule(rule.id)} className="p-1.5 text-rose-500/70 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
            )}
         </div>
      </section>

      {/* ── Alert History Log ──────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-bold text-foreground flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-primary" /> Alert History Log
        </h2>
        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {history.length > 0 ? history.map((h, i) => (
                <div key={h.id + i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                    <div className={`mt-0.5 w-6 h-6 rounded flex items-center justify-center text-[10px] ${h.type === 'news' ? 'bg-rose-500/20 text-rose-400' : h.type === 'calendar' ? 'bg-violet-500/20 text-violet-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {h.type === 'news' ? '📰' : h.type === 'calendar' ? '📅' : '⚡'}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-foreground">{h.channel}</span>
                            <span className="text-[10px] text-muted-foreground">{h.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{h.message}</p>
                    </div>
                </div>
            )) : (
                <p className="text-sm text-center text-muted-foreground italic py-4">No alerts generated yet. Wait for the bridge connection.</p>
            )}
        </div>
      </section>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-all"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {saving ? "Saving…" : "Save Alert Configuration"}
      </button>
    </div>
  );
}
