"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { api } from "../../lib/terminalApi";

interface ApiKeysSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export default function ApiKeysSettings({ open, onOpenChange, onSaved }: ApiKeysSettingsProps) {
  const [keys, setKeys] = useState<Record<string, string>>({
    marketaux: "",
    newsapi: "",
    tradingeconomics: "",
    discord_webhook: "",
    telegram_bot_token: "",
    telegram_chat_id: "",
    telegram_thread_news: "",
    telegram_thread_calendar: "",
    myfxbook_email: "",
    myfxbook_password: "",
  });
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaved(false);
    api
      .get("/settings/api-keys")
      .then((r) => {
        setConfigured(r.data?.configured || {});
        // Show empty fields (don't expose existing secrets); user types only what changes
        setKeys((prev) => ({
          ...prev,
          telegram_chat_id: r.data?.telegram_chat_id || "",
          telegram_thread_news: r.data?.telegram_thread_news || "",
          telegram_thread_calendar: r.data?.telegram_thread_calendar || "",
          myfxbook_email: r.data?.myfxbook_email || "",
        }));
      })
      .catch(() => {});
  }, [open]);

  const onChange = (k: string, v: string) => setKeys((prev) => ({ ...prev, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    try {
      // Only send fields the user typed (non-empty)
      const payload = Object.fromEntries(Object.entries(keys).filter(([_, v]) => v !== ""));
      await api.post("/settings/api-keys", payload);
      const r = await api.get("/settings/api-keys");
      setConfigured(r.data?.configured || {});
      setSaved(true);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ name, label, hint, mask = true }: { name: string; label: string; hint?: string; mask?: boolean }) => {
    const cfgKey =
      name === "telegram_bot_token"
        ? "telegram"
        : name === "myfxbook_email" || name === "myfxbook_password"
        ? "myfxbook"
        : name;
    return (
      <label className="flex flex-col gap-1 text-[10px]">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 uppercase tracking-widest">{label}</span>
          <span className={`text-[9px] font-mono ${configured[cfgKey] ? "text-emerald-500" : "text-zinc-600"}`}>
            {configured[cfgKey] ? "● configured" : "○ not set"}
          </span>
        </div>
        <input
          data-testid={`apikey-${name}`}
          type={mask ? "password" : "text"}
          value={keys[name] || ""}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={configured[cfgKey] ? "•••• (paste to overwrite, or 'CLEAR' to remove)" : "paste key…"}
          className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
        />
        {hint && <span className="text-[9px] text-zinc-600 font-mono">{hint}</span>}
      </label>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="api-keys-dialog"
        className="bg-black border border-zinc-800 rounded-none max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="text-[11px] uppercase tracking-[0.2em] text-amber-500">
            API Keys — Data Providers
          </DialogTitle>
          <DialogDescription className="text-[10px] text-zinc-500 font-mono">
            Marketaux + NewsAPI power the real News tab. Discord/Telegram receive trade & news alerts.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 mt-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          <Field
            name="marketaux"
            label="Marketaux API Token"
            hint="Free 100 req/day @ marketaux.com (signup, no card)"
          />
          <Field
            name="newsapi"
            label="NewsAPI Key"
            hint="Free 100 req/day @ newsapi.org (developer tier)"
          />
          <Field
            name="tradingeconomics"
            label="Trading Economics Key"
            hint="Free guest:guest demo works; full key from tradingeconomics.com/api"
          />
          <Field
            name="discord_webhook"
            label="Discord Webhook URL"
            hint="Server settings → Integrations → Webhooks → Copy URL"
          />
          <Field
            name="telegram_bot_token"
            label="Telegram Bot Token"
            hint="Talk to @BotFather → /newbot → paste token"
          />
          <Field
            name="telegram_chat_id"
            label="Telegram Chat ID"
            mask={false}
            hint="Send a message to your bot, then visit api.telegram.org/bot{TOKEN}/getUpdates"
          />
          <Field
            name="telegram_thread_news"
            label="Telegram Topic: News (ID)"
            mask={false}
            hint="The thread ID for News (e.g. 7)"
          />
          <Field
            name="telegram_thread_calendar"
            label="Telegram Topic: Calendar (ID)"
            mask={false}
            hint="The thread ID for Calendar Events (e.g. 8)"
          />
          <Field
            name="myfxbook_email"
            label="MyFXBook Email"
            mask={false}
            hint="Free account at myfxbook.com — powers real retail positioning data"
          />
          <Field
            name="myfxbook_password"
            label="MyFXBook Password"
            hint="Stored encrypted; used only to fetch community outlook"
          />
        </div>

        {saved && (
          <div data-testid="apikeys-saved" className="text-[11px] text-emerald-500 font-mono mt-2">
            ✓ Saved
          </div>
        )}
        <DialogFooter className="mt-3 gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="text-[11px] uppercase tracking-widest border border-zinc-700 hover:border-zinc-500 px-3 py-1.5"
          >
            Close
          </button>
          <button
            data-testid="apikeys-save"
            onClick={onSave}
            disabled={saving}
            className="text-[11px] uppercase tracking-widest border border-amber-500 text-amber-500 hover:bg-amber-500/10 px-3 py-1.5"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
