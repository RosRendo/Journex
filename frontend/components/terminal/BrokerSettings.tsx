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
import { getBroker, saveBroker, testBroker, syncBrokerTrades } from "../../lib/terminalApi";

interface BrokerSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

const PROVIDERS = [
  { value: "mock", label: "Mock (built-in)" },
  { value: "metaapi", label: "MetaApi (Cloud MT5/MT4)" },
  { value: "oanda", label: "OANDA (REST/Stream)" },
  { value: "alpaca", label: "Alpaca (Paper / Live)" },
  { value: "mt5_bridge", label: "MT5 Local Bridge" },
];

const HELP: Record<string, string> = {
  mock: "Built-in mock data. No credentials needed.",
  metaapi: "Cloud MT5 execution. Enter your Broker Server Name (e.g. Exness-Real11), MT5 Account ID, and MT5 Password.",
  oanda: "Practice account: https://www.oanda.com/demo-account/tpa/personal_token  → paste token + account ID. Base URL: https://api-fxpractice.oanda.com",
  alpaca: "Paper account: https://alpaca.markets/  → API Key ID + Secret. Base URL: https://paper-api.alpaca.markets",
  mt5_bridge: "Your local MT5 EA exposing REST/WebSocket. Base URL example: http://localhost:8765",
};

const DEFAULT_BASE_URL: Record<string, string> = {
  mock: "",
  oanda_practice: "https://api-fxpractice.oanda.com",
  oanda_live: "https://api-fxtrade.oanda.com",
  alpaca: "https://paper-api.alpaca.markets",
  mt5_bridge: "http://localhost:5003",
};

export default function BrokerSettings({ open, onOpenChange, onConnected }: BrokerSettingsProps) {
  const [cfg, setCfg] = useState<any>({
    provider: "mock",
    environment: "practice",
    api_key: "",
    api_secret: "",
    account_id: "",
    base_url: "",
  });
  const [status, setStatus] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmLive, setConfirmLive] = useState("");
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    getBroker()
      .then((c) => setCfg((prev: any) => ({ ...prev, ...c })))
      .catch(() => {});
  }, [open]);

  const computeBaseUrl = (provider: string, environment: string) => {
    if (provider === "oanda") {
      return environment === "live" ? DEFAULT_BASE_URL.oanda_live : DEFAULT_BASE_URL.oanda_practice;
    }
    return DEFAULT_BASE_URL[provider] || "";
  };

  const onProviderChange = (provider: string) => {
    setCfg((prev: any) => ({
      ...prev,
      provider,
      base_url: computeBaseUrl(provider, prev.environment || "practice"),
    }));
    setStatus(null);
  };

  const onEnvironmentChange = (environment: string) => {
    if (environment === "live" && cfg.provider === "oanda" && cfg.environment !== "live") {
      setShowLiveConfirm(true);
      return;
    }
    setCfg((prev: any) => ({
      ...prev,
      environment,
      base_url: computeBaseUrl(prev.provider, environment),
    }));
    setStatus(null);
  };

  const confirmLiveSwitch = () => {
    if (confirmLive.trim().toUpperCase() === "I UNDERSTAND") {
      setCfg((prev: any) => ({
        ...prev,
        environment: "live",
        base_url: computeBaseUrl(prev.provider, "live"),
      }));
      setShowLiveConfirm(false);
      setConfirmLive("");
      setStatus(null);
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await saveBroker(cfg);
      const s = await testBroker();
      setStatus(s);
      if (s?.ok && cfg.provider !== "mock") {
        onConnected?.();
      }
    } catch (e: any) {
      setStatus({
        ok: false,
        message: e?.response?.data?.error || e?.message || "An unexpected error occurred"
      });
    } finally {
      setSaving(false);
    }
  };

  const onSync = async () => {
    setSyncing(true);
    setStatus(null);
    try {
      const s = await syncBrokerTrades();
      setStatus({
        ok: true,
        message: s.message || `Successfully synced ${s.count || 0} trades.`
      });
      onConnected?.();
    } catch (e: any) {
      setStatus({
        ok: false,
        message: e?.response?.data?.error || e?.message || "Sync failed"
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="broker-settings-dialog"
        className="bg-black border border-zinc-800 rounded-none max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="text-[11px] uppercase tracking-[0.2em] text-amber-500">
            Broker Settings
          </DialogTitle>
          <DialogDescription className="text-[10px] text-zinc-500 font-mono">
            Credentials are persisted server-side. Real provider connections are stubbed until you paste keys.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 mt-2">
          <label className="flex flex-col gap-1 text-[10px]">
            <span className="text-zinc-500 uppercase tracking-widest">Provider</span>
            <select
              data-testid="broker-provider"
              value={cfg.provider}
              onChange={(e) => onProviderChange(e.target.value)}
              className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {cfg.provider === "oanda" && (
            <div className="flex gap-2 items-center">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Environment</span>
              <button
                data-testid="env-practice"
                onClick={() => onEnvironmentChange("practice")}
                className={`text-[10px] uppercase tracking-widest px-2 py-1 border ${
                  cfg.environment !== "live"
                    ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                    : "border-zinc-700 text-zinc-500"
                }`}
              >
                Practice (Free)
              </button>
              <button
                data-testid="env-live"
                onClick={() => onEnvironmentChange("live")}
                className={`text-[10px] uppercase tracking-widest px-2 py-1 border ${
                  cfg.environment === "live"
                    ? "border-red-500 text-red-500 bg-red-500/10"
                    : "border-zinc-700 text-zinc-500"
                }`}
              >
                LIVE (Real $)
              </button>
            </div>
          )}
          <div className="text-[10px] text-zinc-500 font-mono">{HELP[cfg.provider]}</div>

          {cfg.provider === "metaapi" && (
            <label className="flex flex-col gap-1 text-[10px]">
              <span className="text-zinc-500 uppercase tracking-widest">Broker Server Name</span>
              <input
                data-testid="broker-base-url"
                value={cfg.base_url || ""}
                onChange={(e) => setCfg({ ...cfg, base_url: e.target.value })}
                className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
                placeholder="e.g. Exness-Real11"
              />
            </label>
          )}

          {cfg.provider !== "mock" && cfg.provider !== "metaapi" && (
            <label className="flex flex-col gap-1 text-[10px]">
              <span className="text-zinc-500 uppercase tracking-widest">Base URL</span>
              <input
                data-testid="broker-base-url"
                value={cfg.base_url || ""}
                onChange={(e) => setCfg({ ...cfg, base_url: e.target.value })}
                className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
              />
            </label>
          )}

          {cfg.provider === "metaapi" ? (
            <label className="flex flex-col gap-1 text-[10px]">
              <span className="text-zinc-500 uppercase tracking-widest">MT5 Password</span>
              <input
                data-testid="broker-api-key"
                type="password"
                value={cfg.api_key || ""}
                onChange={(e) => setCfg({ ...cfg, api_key: e.target.value })}
                className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-[10px]">
              <span className="text-zinc-500 uppercase tracking-widest">API Key / Token</span>
              <input
                data-testid="broker-api-key"
                value={cfg.api_key || ""}
                onChange={(e) => setCfg({ ...cfg, api_key: e.target.value })}
                className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-[10px]">
            <span className="text-zinc-500 uppercase tracking-widest">API Secret (Alpaca only)</span>
            <input
              data-testid="broker-api-secret"
              type="password"
              value={cfg.api_secret || ""}
              onChange={(e) => setCfg({ ...cfg, api_secret: e.target.value })}
              className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px]">
            <span className="text-zinc-500 uppercase tracking-widest">
              {cfg.provider === "metaapi" ? "MT5 Login (Account ID)" : "Account ID"}
            </span>
            <input
              data-testid="broker-account-id"
              value={cfg.account_id || ""}
              onChange={(e) => setCfg({ ...cfg, account_id: e.target.value })}
              className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
            />
          </label>
        </div>

        {status && (
          <div
            data-testid="broker-status"
            className={`text-[11px] font-mono mt-2 ${
              status.ok ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {status.ok ? "✓" : "✗"} {status.message}
          </div>
        )}

        <DialogFooter className="mt-3 gap-2 flex-row justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="text-[11px] uppercase tracking-widest border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 text-zinc-100"
          >
            Close
          </button>
          <button
            onClick={onSync}
            disabled={saving || syncing}
            className="text-[11px] uppercase tracking-widest border border-blue-500 text-blue-500 hover:bg-blue-500/10 px-3 py-1.5 disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync Trades"}
          </button>
          <button
            data-testid="broker-save"
            onClick={onSave}
            disabled={saving || syncing}
            className="text-[11px] uppercase tracking-widest border border-amber-500 text-amber-500 hover:bg-amber-500/10 px-3 py-1.5 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save & Test"}
          </button>
        </DialogFooter>
      </DialogContent>

      {/* Live mode confirmation overlay */}
      {showLiveConfirm && (
        <Dialog open={showLiveConfirm} onOpenChange={setShowLiveConfirm}>
          <DialogContent
            data-testid="live-confirm-dialog"
            className="bg-black border border-red-500 rounded-none max-w-md"
          >
            <DialogHeader>
              <DialogTitle className="text-[12px] uppercase tracking-[0.2em] text-red-500">
                ⚠ Live Trading Confirmation
              </DialogTitle>
              <DialogDescription className="text-[11px] text-zinc-400 font-mono leading-relaxed">
                You are about to switch from <span className="text-emerald-500">PRACTICE</span> to{" "}
                <span className="text-red-500">LIVE</span>. Real money will be at risk. Orders will
                execute on your funded OANDA account at <span className="text-red-500 font-mono">api-fxtrade.oanda.com</span>.
                Type <span className="text-amber-500 font-mono">I UNDERSTAND</span> below to proceed.
              </DialogDescription>
            </DialogHeader>
            <input
              data-testid="live-confirm-input"
              autoFocus
              value={confirmLive}
              onChange={(e) => setConfirmLive(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmLiveSwitch()}
              placeholder="Type exactly: I UNDERSTAND"
              className="bg-black border border-zinc-700 focus:border-red-500 outline-none px-2 py-1.5 font-mono text-[12px] mt-3 text-zinc-100"
            />
            <DialogFooter className="mt-3 gap-2 flex-row justify-end">
              <button
                onClick={() => {
                  setShowLiveConfirm(false);
                  setConfirmLive("");
                }}
                className="text-[11px] uppercase tracking-widest border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 text-zinc-100"
              >
                Cancel
              </button>
              <button
                data-testid="live-confirm-submit"
                onClick={confirmLiveSwitch}
                disabled={confirmLive.trim().toUpperCase() !== "I UNDERSTAND"}
                className="text-[11px] uppercase tracking-widest border border-red-500 text-red-500 hover:bg-red-500/10 px-3 py-1.5 disabled:opacity-30"
              >
                Switch to LIVE
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
