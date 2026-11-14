"use client";

import { getBackendUrl, fetchWithAuth } from "@/lib/utils";
import AdminOnly from "@/components/AdminOnly";
import { useIsAdmin } from "@/lib/role";
import { useBrokerAccounts, useCsvTrades } from "@/hooks/useCsvTrades";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Upload,
  Plus,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  Shield,
  Network,
  X,
  LayoutGrid,
  List,
  ChevronDown,
  Sliders,
  ExternalLink,
  HelpCircle,
  Lock,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "@/lib/useSession";
import { useBridgeUrl } from "@/hooks/useBridgeUrl";
import BrokerArchitectureSelector from "@/components/accounts/BrokerArchitectureSelector";

function AccountCard({
  account,
  onSetMaster,
  onToggleCopier,
  onUpdateMultiplier,
  onSync,
  onRemove,
  syncLoading,
  isPro,
}: {
  account: any;
  onSetMaster: (id: number) => void;
  onToggleCopier: (id: number) => void;
  onUpdateMultiplier: (id: number, val: number) => void;
  onSync: (acc: any) => void;
  onRemove: (id: number) => void;
  syncLoading: boolean;
  isPro: boolean;
}) {
  const isMaster = account.isMaster;

  return (
    <div
      className={`border rounded-xl p-5 relative overflow-hidden transition-all duration-300 ${
        isMaster
          ? "border-[#20e0b2]/40 bg-[#20e0b2]/[0.02] shadow-[0_0_20px_rgba(32,224,178,0.06)]"
          : "border-white/[0.08] bg-[#101014] hover:border-white/20"
      }`}
    >
      {isMaster && (
        <div className="absolute top-0 right-0 bg-[#20e0b2] text-black text-[8.5px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg font-mono">
          Primary Sync Account
        </div>
      )}

      {/* Account Identity */}
      <div className="flex items-center gap-3.5 mb-4">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isMaster
              ? "bg-[#20e0b2]/15 text-[#20e0b2] border border-[#20e0b2]/30"
              : "bg-white/5 text-zinc-400 border border-white/10"
          }`}
        >
          <Wallet className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold font-mono truncate">
            {account.brokerName || account.mt5Server || "MetaTrader 5"}
          </p>
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            #{account.accountNumber}
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </h2>
        </div>
        {account.balance !== null && account.balance !== undefined && (
          <div className="text-right flex-shrink-0">
            <p className="text-base font-bold font-mono text-white">
              ${Number(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest font-mono">
              Balance
            </p>
          </div>
        )}
      </div>

      {/* Sync Button & Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/5">
        <button
          onClick={() => onSync(account)}
          disabled={syncLoading}
          className="flex-1 py-2 px-3 bg-[#20e0b2] hover:bg-[#1bc79e] text-black text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? "animate-spin" : ""}`} />
          <span>Sync Trades</span>
          {!isPro && (
            <span className="text-[8px] bg-black/40 text-[#20e0b2] px-1 py-0.2 rounded font-mono font-bold">
              PRO
            </span>
          )}
        </button>

        {!isMaster && (
          <button
            onClick={() => onSetMaster(account.id)}
            title="Set as Default Account"
            className="px-2.5 py-2 border border-white/10 hover:border-[#20e0b2]/40 rounded-lg text-zinc-400 hover:text-white text-[11px] font-mono transition-colors"
          >
            Set Default
          </button>
        )}

        <button
          onClick={() => onRemove(account.id)}
          title="Disconnect Account"
          className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function AccountsInner() {
  const { data: session } = useSession();
  const isAdmin = useIsAdmin();
  const user = session?.user as any;
  const isPro = Boolean(user?.isPro || user?.plan === "pro" || user?.plan === "lifetime" || isAdmin || !user?.isTrialExpired);
  const userEmail = session?.user?.email ?? undefined;

  const [activeTab, setActiveTab] = useState<"sync" | "csv" | "copier">("sync");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showArchSettings, setShowArchSettings] = useState(false);

  // Dynamic bridge URL
  const { bridgeUrl: BRIDGE } = useBridgeUrl();

  // MT5 state
  const [mt5Accounts, setMt5Accounts] = useState<any[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [connectStatus, setConnectStatus] = useState<{
    loading: boolean;
    success?: boolean;
    msg?: string;
  }>({ loading: false });

  // MT5 Pulse state
  const [mt5Pulse, setMt5Pulse] = useState<{
    connected?: boolean;
    balance?: number;
    equity?: number;
    profit?: number;
    marginLevel?: number;
  } | null>(null);
  const [pulseLoading, setPulseLoading] = useState(false);
  const [masterAccount, setMasterAccount] = useState<number | null>(null);

  // Hook data
  const { accounts, loading: accountsLoading, error: accountsError } = useBrokerAccounts();
  const { trades, loading: tradesLoading, analytics } = useCsvTrades();

  const API_URL = getBackendUrl();

  const fetchDbAccounts = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/accounts`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (res.ok) {
        const data = await res.json();
        const live = (data.data || []).map((acc: any) => ({
          id: acc.id,
          brokerName: acc.brokerName,
          accountNumber: acc.accountNumber,
          mt5Password: acc.mt5Password,
          mt5Server: acc.mt5Server,
          isMaster: acc.isMaster,
          copierEnabled: acc.copierEnabled,
          copierMultiplier: acc.copierMultiplier,
          balance: acc.balance,
          equity: acc.equity,
          lastUpdated: acc.lastUpdated,
        }));
        setMt5Accounts(live);

        const master = live.find((a: any) => a.isMaster);
        if (master) setMasterAccount(master.id);
      }
    } catch (e) {
      console.error("Could not fetch DB accounts:", e);
    }
  };

  useEffect(() => {
    fetchDbAccounts();
  }, []);

  // Poll live MT5 pulse telemetry
  useEffect(() => {
    if (!BRIDGE) return;
    const fetchPulse = async () => {
      try {
        setPulseLoading(true);
        const accRes = await fetchWithAuth(`${BRIDGE}/api/account`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (accRes.ok) {
          const acc = await accRes.json();
          if (acc.success) {
            const data = acc.account || acc;
            setMt5Pulse({
              connected: true,
              balance: data.balance,
              equity: data.equity,
              profit: data.profit,
              marginLevel: data.margin_level,
            });
          } else {
            setMt5Pulse({ connected: false });
          }
        } else {
          setMt5Pulse({ connected: false });
        }
      } catch (_) {
        setMt5Pulse({ connected: false });
      } finally {
        setPulseLoading(false);
      }
    };
    fetchPulse();
    const interval = setInterval(fetchPulse, 10000);
    return () => clearInterval(interval);
  }, [BRIDGE]);

  const handleSaveMt5Account = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !server) return;

    try {
      const newAcc = {
        brokerName: server.split("-")[0] || "MetaTrader",
        accountNumber: login.trim(),
        mt5Password: password.trim(),
        mt5Server: server.trim(),
        isMaster: mt5Accounts.length === 0,
        copierEnabled: false,
        copierMultiplier: 1.0,
      };

      const res = await fetchWithAuth(`${API_URL}/api/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAcc),
      });

      if (res.ok) {
        setIsAddingMode(false);
        setLogin("");
        setPassword("");
        setServer("");
        await fetchDbAccounts();
        toast.success(`Account #${newAcc.accountNumber} connected! Click 'Sync Trades' to import deals.`);
      } else {
        toast.error("Failed to save account. Please verify details.");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save account.");
    }
  };

  const updateAccountInDb = async (id: number, patch: any) => {
    try {
      await fetchWithAuth(`${API_URL}/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const setAsMaster = async (id: number) => {
    setMasterAccount(id);
    for (const a of mt5Accounts) {
      await updateAccountInDb(a.id, { isMaster: a.id === id });
    }
    await fetchDbAccounts();
    toast.success("Default primary account updated");
  };

  const toggleCopier = async (id: number) => {
    if (masterAccount === id) return;
    const acc = mt5Accounts.find((a) => a.id === id);
    if (acc) {
      await updateAccountInDb(id, { copierEnabled: !acc.copierEnabled });
      await fetchDbAccounts();
    }
  };

  const updateMultiplier = async (id: number, val: number) => {
    await updateAccountInDb(id, { copierMultiplier: val });
    await fetchDbAccounts();
  };

  const handleConnectMaster = async (acc: any) => {
    if (!isPro) {
      setConnectStatus({
        loading: false,
        success: false,
        msg: "Live MT5 Auto-Sync is a Pro feature. Upgrade to Pro to sync real broker deals automatically.",
      });
      toast.error("Live MT5 Auto-Sync requires a Pro subscription.");
      return;
    }

    setConnectStatus({
      loading: true,
      msg: `Syncing trades from ${acc.mt5Server || acc.brokerName} #${acc.accountNumber}...`,
    });
    try {
      const res = await fetchWithAuth(`${API_URL}/api/accounts/${acc.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 90 }),
      });
      const data = await res.json();
      if (data.success) {
        const count = data.data?.insertedCount ?? 0;
        setConnectStatus({
          loading: false,
          success: true,
          msg: data.message || `Synced ${count} new trades!`,
        });
        toast.success(`Successfully synced ${count} trades into your Journal!`);
        await fetchDbAccounts();
      } else {
        const errorMsg = data.message || data.error || (data.detail ? JSON.stringify(data.detail) : "Sync failed");
        setConnectStatus({ loading: false, success: false, msg: errorMsg });
        toast.error(`Sync failed: ${errorMsg}`);
      }
    } catch (e: any) {
      setConnectStatus({
        loading: false,
        success: false,
        msg: e.message || "Failed to contact sync engine.",
      });
      toast.error("Could not reach MT5 sync engine on port 5003.");
    }
  };

  const removeMt5Account = async (id: number) => {
    if (!confirm("Are you sure you want to disconnect this broker account?")) return;
    try {
      await fetchWithAuth(`${API_URL}/api/accounts/${id}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
        method: "DELETE",
      });
      if (masterAccount === id) setMasterAccount(null);
      await fetchDbAccounts();
      toast.success("Account disconnected.");
    } catch (e) {
      console.error(e);
    }
  };

  if (accountsLoading || tradesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-[#20e0b2] border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeCopiers = mt5Accounts.filter(
    (a) => a.id !== masterAccount && a.copierEnabled
  );

  return (
    <div className="min-h-screen w-full bg-[#0A0C10] text-[#f4f4f5] flex flex-col pb-16 font-sans">
      {/* ── TOPBAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-white/[0.07] sticky top-0 z-20 bg-[#0A0C10]/95 backdrop-blur-md gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold text-white tracking-tight">
              Broker Accounts &amp; Trade Sync
            </h1>
            <span
              className={`text-[9px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1.5 uppercase font-bold tracking-wider ${
                mt5Pulse?.connected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  mt5Pulse?.connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              {mt5Pulse?.connected ? "MT5 Bridge Live" : "Bridge Standby"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Connect your MetaTrader 5 broker account to automatically import deals and evaluate your edge.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("sync")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "sync"
                ? "bg-[#20e0b2] text-black font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            MT5 Live Sync
          </button>
          <button
            onClick={() => setActiveTab("csv")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "csv"
                ? "bg-[#20e0b2] text-black font-bold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            CSV Statements
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("copier")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "copier"
                  ? "bg-[#20e0b2] text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Trade Copier
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* ── TAB 1: MT5 LIVE SYNC (PRIMARY) ── */}
        {activeTab === "sync" && (
          <div className="space-y-6 animate-fade-in">
            {/* Quick 3-Step Setup Guide Banner */}
            <div className="bg-gradient-to-r from-zinc-900/90 via-[#0e1217] to-zinc-900/90 border border-white/10 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#20e0b2] font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> How Auto-Sync Works (3 Steps)
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">100% Read-Only Safe</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="flex items-start gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  <span className="w-6 h-6 rounded-lg bg-[#20e0b2]/20 text-[#20e0b2] font-black font-mono flex items-center justify-center flex-shrink-0">
                    1
                  </span>
                  <div>
                    <h4 className="font-bold text-white mb-0.5">Enter Broker Login</h4>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      Add your MT5 Server and Login #. Use your read-only Investor password for safety.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  <span className="w-6 h-6 rounded-lg bg-[#20e0b2]/20 text-[#20e0b2] font-black font-mono flex items-center justify-center flex-shrink-0">
                    2
                  </span>
                  <div>
                    <h4 className="font-bold text-white mb-0.5">Click 'Sync Trades'</h4>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      Journex extracts all completed deals, commission, and PnL in ~2 seconds.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  <span className="w-6 h-6 rounded-lg bg-[#20e0b2]/20 text-[#20e0b2] font-black font-mono flex items-center justify-center flex-shrink-0">
                    3
                  </span>
                  <div>
                    <h4 className="font-bold text-white mb-0.5">Audit in Journal</h4>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      Your trades appear in your Journal and Analytics with win rates and equity charts.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Aggregate Telemetry Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#101218] border border-white/10 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">
                  Total Balance
                </span>
                <p className="text-xl font-bold font-mono text-white mt-1">
                  ${mt5Pulse?.connected && mt5Pulse?.balance != null
                    ? Number(mt5Pulse.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : mt5Accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">Aggregated across accounts</span>
              </div>

              <div className="bg-[#101218] border border-white/10 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">
                  Live Equity
                </span>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  ${mt5Pulse?.connected && mt5Pulse?.equity != null
                    ? Number(mt5Pulse.equity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : mt5Accounts.reduce((sum, a) => sum + (Number(a.equity) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">Floating real-time value</span>
              </div>

              <div className="bg-[#101218] border border-white/10 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">
                  Floating P&amp;L
                </span>
                <p
                  className={`text-xl font-bold font-mono mt-1 ${
                    (Number(mt5Pulse?.profit) || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  ${Number(mt5Pulse?.profit || 0).toFixed(2)}
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">Open market positions</span>
              </div>

              <div className="bg-[#101218] border border-white/10 rounded-xl p-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">
                  Margin Health
                </span>
                <p className="text-xl font-bold font-mono text-zinc-200 mt-1">
                  {mt5Pulse?.marginLevel != null ? `${Number(mt5Pulse.marginLevel).toFixed(1)}%` : "Safe (100%)"}
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">Drawdown risk status</span>
              </div>
            </div>

            {/* Sync Feedback Message */}
            {connectStatus.msg && (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
                  connectStatus.loading
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                    : connectStatus.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {connectStatus.loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                  ) : connectStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{connectStatus.msg}</span>
                </div>
                {connectStatus.success && (
                  <Link
                    href="/journal"
                    className="underline text-emerald-400 hover:text-white font-bold ml-4"
                  >
                    View in Journal →
                  </Link>
                )}
              </div>
            )}

            {/* Section Header: Connected Accounts */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#20e0b2]" />
                  Your Connected Broker Accounts
                  <span className="text-xs font-mono font-normal text-zinc-500">
                    ({mt5Accounts.length})
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "list" ? "bg-white/15 text-white" : "text-zinc-500 hover:text-white"
                    }`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "grid" ? "bg-white/15 text-white" : "text-zinc-500 hover:text-white"
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setIsAddingMode(!isAddingMode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20e0b2] hover:bg-[#1bc79e] text-black text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Connect Account</span>
                </button>
              </div>
            </div>

            {/* Add Account Form */}
            {isAddingMode && (
              <form
                onSubmit={handleSaveMt5Account}
                className="bg-[#101218] border border-[#20e0b2]/40 rounded-2xl p-5 space-y-4 shadow-xl animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#20e0b2] font-mono">
                      Connect New Broker Account
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Supports Exness, IC Markets, FTMO, FundedNext, and all MetaTrader 5 brokers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingMode(false)}
                    className="text-zinc-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 font-bold mb-1">
                      MT5 Server Name
                    </label>
                    <input
                      type="text"
                      value={server}
                      onChange={(e) => setServer(e.target.value)}
                      required
                      placeholder="e.g. Exness-MT5Trial7"
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-[#20e0b2]"
                    />
                    <span className="text-[9.5px] text-zinc-500 mt-1 block">
                      From your broker welcome email
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 font-bold mb-1">
                      Account Login / Number
                    </label>
                    <input
                      type="number"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      required
                      placeholder="e.g. 434447746"
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-[#20e0b2]"
                    />
                    <span className="text-[9.5px] text-zinc-500 mt-1 block">
                      Your numerical MT5 ID
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 font-bold mb-1">
                      Password (Investor or Master)
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-[#20e0b2]"
                    />
                    <span className="text-[9.5px] text-zinc-500 mt-1 block">
                      Read-only Investor password supported
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-[10.5px] text-zinc-400 font-mono">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Your credentials are encrypted and only used to fetch closed deals.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingMode(false)}
                      className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#20e0b2] hover:bg-[#1bc79e] text-black font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      Save &amp; Connect Account
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Accounts List / Empty State */}
            {mt5Accounts.length === 0 && !isAddingMode ? (
              <div className="border border-dashed border-white/15 rounded-2xl p-10 text-center bg-[#101218] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#20e0b2]/10 border border-[#20e0b2]/20 flex items-center justify-center mx-auto text-[#20e0b2]">
                  <Wallet className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">No Broker Accounts Connected Yet</h4>
                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Connect your first MetaTrader 5 account to start syncing real trades into your Journal and Analytics with zero manual effort.
                </p>
                <button
                  onClick={() => setIsAddingMode(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20e0b2] hover:bg-[#1bc79e] text-black text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Connect Your MT5 Account
                </button>
              </div>
            ) : (
              <>
                {viewMode === "list" ? (
                  <div className="bg-[#101218] border border-white/10 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-black/30 text-[9.5px] uppercase font-bold text-zinc-400 tracking-wider border-b border-white/5 font-mono">
                        <tr>
                          <th className="px-5 py-3">Broker &amp; Account</th>
                          <th className="px-5 py-3">Live Balance</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-zinc-300">
                        {mt5Accounts.map((acc) => {
                          const isMaster = masterAccount === acc.id;

                          return (
                            <tr
                              key={acc.id}
                              className={`hover:bg-white/[0.02] transition-colors ${
                                isMaster ? "bg-[#20e0b2]/[0.02]" : ""
                              }`}
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                      isMaster
                                        ? "bg-[#20e0b2]/20 text-[#20e0b2] border border-[#20e0b2]/40"
                                        : "bg-white/5 text-zinc-400 border border-white/10"
                                    }`}
                                  >
                                    <Wallet className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <h4 className="font-bold text-white text-sm">
                                        #{acc.accountNumber}
                                      </h4>
                                      {isMaster && (
                                        <span className="text-[8px] bg-[#20e0b2]/20 text-[#20e0b2] border border-[#20e0b2]/30 px-1.5 py-0.2 rounded font-bold uppercase">
                                          Default
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-sans">
                                      {acc.mt5Server || acc.brokerName}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <span className="font-bold text-white text-sm">
                                  ${acc.balance !== null && acc.balance !== undefined
                                    ? Number(acc.balance).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                      })
                                    : "—"}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <span className="inline-flex items-center gap-1.5 text-[10.5px] text-emerald-400 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Ready to Sync
                                </span>
                              </td>

                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {!isMaster && (
                                    <button
                                      onClick={() => setAsMaster(acc.id)}
                                      className="px-2.5 py-1.5 text-[10px] text-zinc-400 hover:text-white border border-white/10 rounded-lg hover:border-white/20 transition-all cursor-pointer"
                                    >
                                      Set Default
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleConnectMaster(acc)}
                                    disabled={connectStatus.loading}
                                    className="px-3.5 py-1.5 bg-[#20e0b2] hover:bg-[#1bc79e] text-black text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                                  >
                                    <RefreshCw
                                      className={`w-3.5 h-3.5 ${
                                        connectStatus.loading ? "animate-spin" : ""
                                      }`}
                                    />
                                    <span>Sync Trades</span>
                                    {!isPro && (
                                      <span className="text-[8px] bg-black/40 text-[#20e0b2] px-1 py-0.2 rounded font-bold">
                                        PRO
                                      </span>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => removeMt5Account(acc.id)}
                                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    title="Disconnect Account"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mt5Accounts.map((acc) => (
                      <AccountCard
                        key={acc.id}
                        account={acc}
                        onSetMaster={setAsMaster}
                        onToggleCopier={toggleCopier}
                        onUpdateMultiplier={updateMultiplier}
                        onSync={handleConnectMaster}
                        onRemove={removeMt5Account}
                        syncLoading={connectStatus.loading}
                        isPro={isPro}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Collapsible Connection Architecture / Troubleshooting */}
            <div className="pt-2">
              <button
                onClick={() => setShowArchSettings(!showArchSettings)}
                className="w-full flex items-center justify-between p-4 bg-[#101218] border border-white/10 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#20e0b2]" />
                  <span className="font-bold text-white">Connection Architecture &amp; VPS Settings</span>
                  <span className="text-[10px] text-zinc-500">
                    (Option A Local PC Bridge / Option B 24/7 Cloud VPS)
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                    showArchSettings ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showArchSettings && (
                <div className="pt-3 animate-in fade-in duration-150">
                  <BrokerArchitectureSelector
                    currentBridgeUrl={BRIDGE}
                    isProUser={isPro}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: CSV STATEMENTS (MANUAL IMPORT) ── */}
        {activeTab === "csv" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101218] border border-white/10 rounded-2xl p-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#20e0b2]" />
                  Manual Broker Statement Upload
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Upload an HTML or CSV statement report exported directly from MetaTrader 5, MT4, or cTrader.
                </p>
              </div>
              <Link
                href="/journal"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#20e0b2] hover:bg-[#1bc79e] text-black text-xs font-bold transition-all shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Upload CSV in Journal
              </Link>
            </div>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#101218] border border-white/10 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">
                  Total Trades
                </span>
                <p className="text-2xl font-bold font-mono text-white mt-1">
                  {analytics?.totalTrades || 0}
                </p>
              </div>

              <div className="p-4 bg-[#101218] border border-white/10 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">
                  Win Rate
                </span>
                <p className="text-2xl font-bold font-mono text-[#20e0b2] mt-1">
                  {analytics?.winRate != null ? Number(analytics.winRate).toFixed(1) : "0.0"}%
                </p>
              </div>

              <div className="p-4 bg-[#101218] border border-white/10 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">
                  Net P&amp;L
                </span>
                <p
                  className={`text-2xl font-bold font-mono mt-1 ${
                    (Number(analytics?.totalProfit) || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  ${analytics?.totalProfit != null ? Number(analytics.totalProfit).toFixed(2) : "0.00"}
                </p>
              </div>

              <div className="p-4 bg-[#101218] border border-white/10 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">
                  Profit Factor
                </span>
                <p className="text-2xl font-bold font-mono text-[#20e0b2] mt-1">
                  {analytics?.profitFactor != null ? Number(analytics.profitFactor).toFixed(2) : "0.00"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: TRADE COPIER (ADVANCED / ADMIN) ── */}
        {activeTab === "copier" && isAdmin && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#101218] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Network className="w-4 h-4 text-[#20e0b2]" />
                <h3 className="text-sm font-bold text-white">Multi-Terminal Trade Copier Matrix</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Mirror trades in real-time from your Master MT5 terminal account to multiple slave accounts with custom lot multipliers.
              </p>
            </div>

            {/* Copier Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#101218] border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">
                    Broadcasting Master Node
                  </span>
                  <p className="text-base font-bold font-mono text-[#20e0b2] mt-1">
                    {masterAccount ? `#${mt5Accounts.find((a) => a.id === masterAccount)?.accountNumber}` : "UNASSIGNED"}
                  </p>
                </div>
                <Shield className="w-6 h-6 text-[#20e0b2]" />
              </div>

              <div className="bg-[#101218] border border-white/10 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">
                    Active Slaves
                  </span>
                  <p className="text-base font-bold font-mono text-white mt-1">
                    {activeCopiers.length} Receiving Nodes
                  </p>
                </div>
                <Network className="w-6 h-6 text-zinc-400" />
              </div>
            </div>

            {/* Slave Accounts Configuration */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-wider">
                Copier Slave Routing Controls
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mt5Accounts.map((acc) => (
                  <AccountCard
                    key={acc.id}
                    account={acc}
                    onSetMaster={setAsMaster}
                    onToggleCopier={toggleCopier}
                    onUpdateMultiplier={updateMultiplier}
                    onSync={handleConnectMaster}
                    onRemove={removeMt5Account}
                    syncLoading={connectStatus.loading}
                    isPro={isPro}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return <AccountsInner />;
}
