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
} from "lucide-react";
import { toast } from "sonner";

const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL ?? "";

interface AlertConfig {
  discord_news_webhook: string;
  discord_calendar_webhook: string;
  telegram_bot_token: string;
  telegram_news_chat_id: string;
  telegram_cal_chat_id: string;
}

const DEFAULT: AlertConfig = {
  discord_news_webhook: "",
  discord_calendar_webhook: "",
  telegram_bot_token: "",
  telegram_news_chat_id: "",
  telegram_cal_chat_id: "",
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

  useEffect(() => {
    fetch(`${BRIDGE}/api/alert-config`)
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
      const res = await fetch(`${BRIDGE}/api/alert-config/test?type=${type}`, {
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
