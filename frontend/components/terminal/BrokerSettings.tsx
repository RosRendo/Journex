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
import { Trash2, Edit2, CheckCircle2, XCircle, Plus, ArrowLeft } from "lucide-react";

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
  mt5_bridge: "Your local MT5 EA exposing REST/WebSocket. Base URL example: http://localhost:5003",
};

const DEFAULT_BASE_URL: Record<string, string> = {
  mock: "",
  oanda_practice: "https://api-fxpractice.oanda.com",
  oanda_live: "https://api-fxtrade.oanda.com",
  alpaca: "https://paper-api.alpaca.markets",
  mt5_bridge: "http://localhost:5003",
};

export default function BrokerSettings({ open, onOpenChange, onConnected }: BrokerSettingsProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>("");
  
  // Editor view states
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  
  const [status, setStatus] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmLive, setConfirmLive] = useState("");
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadBrokerSettings();
  }, [open]);

  const loadBrokerSettings = () => {
    getBroker()
      .then((res: any) => {
        setAccounts(res.accounts || []);
        setActiveAccountId(res.activeAccountId || "");
      })
      .catch(() => {});
  };

  const computeBaseUrl = (provider: string, environment: string) => {
    if (provider === "oanda") {
      return environment === "live" ? DEFAULT_BASE_URL.oanda_live : DEFAULT_BASE_URL.oanda_practice;
    }
    return DEFAULT_BASE_URL[provider] || "";
  };

  const onProviderChange = (provider: string) => {
    setEditingAccount((prev: any) => ({
      ...prev,
      provider,
      base_url: computeBaseUrl(provider, prev.environment || "practice"),
    }));
    setStatus(null);
  };

  const onEnvironmentChange = (environment: string) => {
    if (environment === "live" && editingAccount.provider === "oanda" && editingAccount.environment !== "live") {
      setShowLiveConfirm(true);
      return;
    }
    setEditingAccount((prev: any) => ({
      ...prev,
      environment,
      base_url: computeBaseUrl(prev.provider, environment),
    }));
    setStatus(null);
  };

  const confirmLiveSwitch = () => {
    if (confirmLive.trim().toUpperCase() === "I UNDERSTAND") {
      setEditingAccount((prev: any) => ({
        ...prev,
        environment: "live",
        base_url: computeBaseUrl(prev.provider, "live"),
      }));
      setShowLiveConfirm(false);
      setConfirmLive("");
      setStatus(null);
    }
  };

  const handleCreateNew = () => {
    setEditingAccount({
      id: Math.random().toString(36).substring(2, 9),
      name: `Account ${accounts.length + 1}`,
      provider: "mt5_bridge",
      environment: "practice",
      api_key: "",
      api_secret: "",
      account_id: "",
      base_url: "http://localhost:5003",
      connected: false,
    });
    setStatus(null);
  };

  const handleEdit = (acc: any) => {
    setEditingAccount({ ...acc });
    setStatus(null);
  };

  const handleDelete = async (id: string) => {
    const updated = accounts.filter(a => a.id !== id);
    let newActive = activeAccountId;
    if (activeAccountId === id) {
      newActive = updated[0]?.id || "";
      if (typeof window !== "undefined") {
        localStorage.setItem("active_account_id", newActive);
      }
    }
    setAccounts(updated);
    setActiveAccountId(newActive);
    await saveBroker({ accounts: updated, activeAccountId: newActive });
  };

  const handleSelectActive = async (id: string) => {
    setActiveAccountId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_account_id", id);
    }
    await saveBroker({ accounts, activeAccountId: id });
    onConnected?.();
  };

  const handleTestConnection = async (acc: any) => {
    setSaving(true);
    setStatus(null);
    try {
      const tempAccounts = accounts.map(a => a.id === acc.id ? acc : a);
      if (!accounts.find(a => a.id === acc.id)) {
        tempAccounts.push(acc);
      }
      await saveBroker({ accounts: tempAccounts, activeAccountId: acc.id });
      if (typeof window !== "undefined") {
        localStorage.setItem("active_account_id", acc.id);
      }
      const s = await testBroker();
      setStatus(s);
      loadBrokerSettings();
      if (s?.ok && acc.provider !== "mock") {
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

  const onSave = async () => {
    if (!editingAccount) return;
    setSaving(true);
    try {
      const updatedAccounts = [...accounts];
      const index = accounts.findIndex(a => a.id === editingAccount.id);
      if (index !== -1) {
        updatedAccounts[index] = editingAccount;
      } else {
        updatedAccounts.push(editingAccount);
      }
      
      const newActiveId = activeAccountId || editingAccount.id;
      
      await saveBroker({ accounts: updatedAccounts, activeAccountId: newActiveId });
      if (typeof window !== "undefined" && !activeAccountId) {
        localStorage.setItem("active_account_id", newActiveId);
      }
      
      setAccounts(updatedAccounts);
      if (!activeAccountId) setActiveAccountId(newActiveId);
      setEditingAccount(null);
      onConnected?.();
    } catch (e: any) {
      setStatus({
        ok: false,
        message: e?.response?.data?.error || e?.message || "Save failed"
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
        className="bg-black border border-zinc-800 rounded-none max-w-lg overflow-y-auto max-h-[85vh]"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            {editingAccount && (
              <button 
                onClick={() => setEditingAccount(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <DialogTitle className="text-[11px] uppercase tracking-[0.2em] text-amber-500">
              {editingAccount ? "Edit Account Configuration" : "Broker Settings & Instances"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-[10px] text-zinc-500 font-mono">
            {editingAccount 
              ? "Modify parameters for this broker connection. Credentials are encrypted on the server."
              : "Manage multiple MetaTrader or API accounts. Assign distinct ports for local Windows VPS instances."}
          </DialogDescription>
        </DialogHeader>

        {editingAccount ? (
          /* SINGLE ACCOUNT EDITOR */
          <div className="grid grid-cols-1 gap-2 mt-2">
            <label className="flex flex-col gap-1 text-[10px]">
              <span className="text-zinc-500 uppercase tracking-widest">Account Name / Label</span>
              <input
                value={editingAccount.name || ""}
                onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
                placeholder="e.g. Prop Firm EURUSD"
              />
            </label>

            <label className="flex flex-col gap-1 text-[10px]">
              <span className="text-zinc-500 uppercase tracking-widest">Provider</span>
              <select
                value={editingAccount.provider}
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

            {editingAccount.provider === "oanda" && (
              <div className="flex gap-2 items-center my-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Environment</span>
                <button
                  onClick={() => onEnvironmentChange("practice")}
                  className={`text-[10px] uppercase tracking-widest px-2 py-1 border ${
                    editingAccount.environment !== "live"
                      ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                      : "border-zinc-700 text-zinc-500"
                  }`}
                >
                  Practice
                </button>
                <button
                  onClick={() => onEnvironmentChange("live")}
                  className={`text-[10px] uppercase tracking-widest px-2 py-1 border ${
                    editingAccount.environment === "live"
                      ? "border-red-500 text-red-500 bg-red-500/10"
                      : "border-zinc-700 text-zinc-500"
                  }`}
                >
                  LIVE
                </button>
              </div>
            )}

            <div className="text-[10px] text-zinc-500 font-mono mb-1">{HELP[editingAccount.provider]}</div>

            {editingAccount.provider === "metaapi" && (
              <label className="flex flex-col gap-1 text-[10px]">
                <span className="text-zinc-500 uppercase tracking-widest">Broker Server Name</span>
                <input
                  value={editingAccount.base_url || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, base_url: e.target.value })}
                  className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
                  placeholder="e.g. Exness-Real11"
                />
              </label>
            )}

            {editingAccount.provider !== "mock" && editingAccount.provider !== "metaapi" && (
              <label className="flex flex-col gap-1 text-[10px]">
                <span className="text-zinc-500 uppercase tracking-widest">Base URL / Bridge URL</span>
                <input
                  value={editingAccount.base_url || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, base_url: e.target.value })}
                  className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
                />
              </label>
            )}

            {editingAccount.provider === "metaapi" ? (
              <label className="flex flex-col gap-1 text-[10px]">
                <span className="text-zinc-500 uppercase tracking-widest">MT5 Password</span>
                <input
                  type="password"
                  value={editingAccount.api_key || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, api_key: e.target.value })}
                  className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
                />
              </label>
            ) : (
              <label className="flex flex-col gap-1 text-[10px]">
                <span className="text-zinc-500 uppercase tracking-widest">API Key / Token</span>
                <input
                  value={editingAccount.api_key || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, api_key: e.target.value })}
                  className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
                />
              </label>
            )}

            {editingAccount.provider === "alpaca" && (
              <label className="flex flex-col gap-1 text-[10px]">
                <span className="text-zinc-500 uppercase tracking-widest">API Secret (Alpaca only)</span>
                <input
                  type="password"
                  value={editingAccount.api_secret || ""}
                  onChange={(e) => setEditingAccount({ ...editingAccount, api_secret: e.target.value })}
                  className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
                />
              </label>
            )}

            <label className="flex flex-col gap-1 text-[10px]">
              <span className="text-zinc-500 uppercase tracking-widest">
                {editingAccount.provider === "metaapi" ? "MT5 Login (Account ID)" : "Account ID"}
              </span>
              <input
                value={editingAccount.account_id || ""}
                onChange={(e) => setEditingAccount({ ...editingAccount, account_id: e.target.value })}
                className="bg-black border border-zinc-700 focus:border-amber-500 outline-none px-2 py-1 font-mono text-[12px] text-zinc-100"
              />
            </label>

            {status && (
              <div className={`text-[11px] font-mono mt-2 ${status.ok ? "text-emerald-500" : "text-red-500"}`}>
                {status.ok ? "✓" : "✗"} {status.message}
              </div>
            )}

            <DialogFooter className="mt-3 gap-2 flex-row justify-end border-t border-zinc-900 pt-3">
              <button
                onClick={() => setEditingAccount(null)}
                className="text-[11px] uppercase tracking-widest border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 text-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTestConnection(editingAccount)}
                disabled={saving}
                className="text-[11px] uppercase tracking-widest border border-blue-500 text-blue-500 hover:bg-blue-500/10 px-3 py-1.5 disabled:opacity-50"
              >
                {saving ? "Testing..." : "Test Connection"}
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="text-[11px] uppercase tracking-widest border border-amber-500 text-amber-500 hover:bg-amber-500/10 px-3 py-1.5 disabled:opacity-50"
              >
                Save Account
              </button>
            </DialogFooter>
          </div>
        ) : (
          /* ACCOUNTS LIST VIEW */
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Active Accounts Configuration</span>
              <button 
                onClick={handleCreateNew}
                className="flex items-center gap-1 text-[10px] border border-amber-500/30 hover:border-amber-500 text-amber-500 px-2 py-1 font-mono uppercase"
              >
                <Plus className="w-3 h-3" /> Add Account
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="py-8 text-center text-zinc-600 border border-dashed border-zinc-800 font-mono text-[11px]">
                No broker configurations added. Click Add Account to connect a bridge.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {accounts.map((acc) => {
                  const isActive = acc.id === activeAccountId;
                  return (
                    <div 
                      key={acc.id}
                      className={`border p-3 flex justify-between items-center bg-zinc-950 font-mono transition-all ${
                        isActive ? "border-amber-500/80 shadow-md shadow-amber-500/5" : "border-zinc-800"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[12px] font-bold ${isActive ? "text-amber-500" : "text-zinc-200"}`}>
                            {acc.name}
                          </span>
                          {isActive && (
                            <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1 rounded uppercase tracking-wider scale-90">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{acc.provider}</span>
                        <span className="text-[9px] text-zinc-600">{acc.base_url || "Built-in"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {acc.connected ? (
                          <span title="Connected"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></span>
                        ) : (
                          <span title="Disconnected"><XCircle className="w-4 h-4 text-red-500/60" /></span>
                        )}
                        <button
                          onClick={() => handleSelectActive(acc.id)}
                          disabled={isActive}
                          className={`text-[9px] uppercase tracking-widest px-2 py-1 border font-bold ${
                            isActive 
                              ? "border-zinc-800 text-zinc-600 cursor-default" 
                              : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                          }`}
                        >
                          Select
                        </button>
                        <button
                          onClick={() => handleEdit(acc)}
                          className="p-1 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc.id)}
                          className="p-1 border border-zinc-800 hover:border-red-900/50 text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {status && (
              <div className={`text-[11px] font-mono mt-2 ${status.ok ? "text-emerald-500" : "text-red-500"}`}>
                {status.ok ? "✓" : "✗"} {status.message}
              </div>
            )}

            <DialogFooter className="mt-3 gap-2 flex-row justify-end border-t border-zinc-900 pt-3">
              <button
                onClick={() => onOpenChange(false)}
                className="text-[11px] uppercase tracking-widest border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 text-zinc-100"
              >
                Close
              </button>
              <button
                onClick={onSync}
                disabled={syncing}
                className="text-[11px] uppercase tracking-widest border border-blue-500 text-blue-500 hover:bg-blue-500/10 px-3 py-1.5 disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "Sync Trades"}
              </button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>

      {/* Live mode confirmation overlay */}
      {showLiveConfirm && (
        <Dialog open={showLiveConfirm} onOpenChange={setShowLiveConfirm}>
          <DialogContent
            className="bg-black border border-red-500 rounded-none max-w-md"
          >
            <DialogHeader>
              <DialogTitle className="text-[12px] uppercase tracking-[0.2em] text-red-500">
                ⚠ Live Trading Confirmation
              </DialogTitle>
              <DialogDescription className="text-[11px] text-zinc-400 font-mono leading-relaxed">
                You are about to switch from <span className="text-emerald-500">PRACTICE</span> to{" "}
                <span className="text-red-500">LIVE</span>. Real money will be at risk. Orders will
                execute on your funded OANDA account. Type{" "}
                <span className="text-amber-500 font-mono">I UNDERSTAND</span> below to proceed.
              </DialogDescription>
            </DialogHeader>
            <input
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
