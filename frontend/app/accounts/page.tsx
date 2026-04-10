"use client";

import { useBrokerAccounts } from "@/hooks/useCsvTrades";
import { useCsvTrades } from "@/hooks/useCsvTrades";
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
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useBridgeUrl } from "@/hooks/useBridgeUrl";

function AccountCard({
  account,
  onSetMaster,
  onToggleCopier,
  onUpdateMultiplier,
}: {
  account: any;
  onSetMaster: (id: number) => void;
  onToggleCopier: (id: number) => void;
  onUpdateMultiplier: (id: number, val: number) => void;
}) {
  // Removed analyticsData loading - use account data directly
  const borderColor = account.isMaster
    ? "border-[--profit] shadow-[0_0_15px_rgba(34,197,94,0.15)]"
    : "border-[--border]";

  return (
    <div
      className={`bg-gradient-to-br from-[--bg-elevated] to-transparent border rounded-xl p-6 relative overflow-hidden ${borderColor}`}
    >
      {account.isMaster && (
        <div className="absolute top-0 right-0 bg-[--profit] text-black text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg z-10">
          Master Node
        </div>
      )}
      <div className="flex items-center gap-4 mb-4">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${account.isMaster ? "bg-[--profit]/20" : "bg-[--accent-dim]"}`}
        >
          <Wallet
            className={`w-6 h-6 ${account.isMaster ? "text-[--profit]" : "text-[--accent]"}`}
          />
        </div>
        <div>
          <p className="text-[10px] text-[--text-tertiary] uppercase tracking-widest font-bold">
            {account.brokerName || account.mt5Server}
          </p>
          <h2 className="text-lg font-bold text-[--text-primary]">
            #{account.accountNumber}
          </h2>
        </div>
        <div className="ml-auto text-right">
          {account.balance !== null && (
            <p className="text-xl font-bold font-mono text-[--text-primary]">
              ${Number(account.balance).toLocaleString()}
            </p>
          )}
          <p className="text-[10px] text-[--text-tertiary] uppercase font-bold tracking-widest">
            Balance
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[--border]">
        {!account.isMaster ? (
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => onToggleCopier(account.id)}
              className={`flex-1 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${account.copierEnabled
                  ? "bg-[--profit]/20 text-[--profit] border border-[--profit]/50"
                  : "bg-[--bg-card] text-[--text-secondary] border border-[--border] hover:text-[--text-primary]"
                }`}
            >
              {account.copierEnabled ? "Copier Active" : "Enable Copier"}
            </button>
            {account.copierEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-[--text-tertiary]">
                  Multiplier:
                </span>
                <select
                  value={account.copierMultiplier}
                  onChange={(e) =>
                    onUpdateMultiplier(account.id, parseFloat(e.target.value))
                  }
                  className="bg-[--bg-card] border border-[--border] text-[12px] font-bold px-2 py-1 rounded outline-none"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1.0}>1.0x</option>
                  <option value={2.0}>2.0x</option>
                  <option value={5.0}>5.0x</option>
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full text-center">
            <span className="text-[11px] font-bold text-[--profit] flex justify-center items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Broadcasting Trades
            </span>
          </div>
        )}
      </div>

      {!account.isMaster && (
        <button
          onClick={() => onSetMaster(account.id)}
          className="w-full mt-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] hover:bg-[--bg-card] hover:text-[--text-primary] transition-colors border border-transparent hover:border-[--border]"
        >
          Set As Master Node
        </button>
      )}
    </div>
  );
}

export default function Accounts() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email ?? undefined;
  const [activeTab, setActiveTab] = useState<"mt5" | "csv">("mt5");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list"); // Added List View Support

  // Dynamic bridge URL (fetched at runtime — no Vercel redeploy needed when tunnel URL changes)
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

  // MT5 Live Pulse
  const [mt5Pulse, setMt5Pulse] = useState<{
    connected: boolean;
    balance?: number;
    equity?: number;
    profit?: number;
    marginLevel?: number;
  } | null>(null);
  const [pulseLoading, setPulseLoading] = useState(true);

  // Copier state
  const [masterAccount, setMasterAccount] = useState<number | null>(null);

  // CSV state
  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
  } = useBrokerAccounts();
  const { analytics, trades, loading: tradesLoading } = useCsvTrades();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchDbAccounts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/accounts`, {
        headers: { "ngrok-skip-browser-warning": "true" },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const dbAccs = json.data || [];
        // Only show accounts that have MT5 credentials
        const live = dbAccs.filter((a: any) => a.mt5Password != null);
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

  // Poll MT5 bridge for live account Pulse
  useEffect(() => {
    if (!BRIDGE) return; // wait until dynamic URL is resolved
    const fetchPulse = async () => {
      try {
        setPulseLoading(true);
        const accRes = await fetch(`${BRIDGE}/api/account`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (accRes.ok) {
          const acc = await accRes.json();
          if (acc.success && acc.account) {
            setMt5Pulse({
              connected: true,
              balance: acc.account.balance,
              equity: acc.account.equity,
              profit: acc.account.profit,
              marginLevel: acc.account.margin_level,
            });
          } else {
            setMt5Pulse({ connected: false });
          }
        } else {
          setMt5Pulse({ connected: false });
        }
      } catch (e) {
        setMt5Pulse({ connected: false });
      } finally {
        setPulseLoading(false);
      }
    };
    fetchPulse();
    const interval = setInterval(fetchPulse, 10000);
    return () => clearInterval(interval);
  }, [BRIDGE]); // re-run whenever bridge URL resolves

  const handleSaveMt5Account = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !password || !server) return;

    try {
      const newAcc = {
        brokerName: server.split("-")[0] || "MetaTrader",
        accountNumber: login,
        mt5Password: password,
        mt5Server: server,
        isMaster: mt5Accounts.length === 0, // First account is master by default
        copierEnabled: false,
        copierMultiplier: 1.0,
        balance: 0,
        equity: 0,
      };

      const res = await fetch(`${API_URL}/api/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAcc),
      });
      if (res.ok) await fetchDbAccounts();
    } catch (e) { }

    setIsAddingMode(false);
    setLogin("");
    setPassword("");
    setServer("");
  };

  const updateAccountInDb = async (id: number, data: any) => {
    try {
      await fetch(`${API_URL}/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      await fetchDbAccounts();
    } catch (e) { }
  };

  const setAsMaster = async (id: number) => {
    setMasterAccount(id);
    // Unset all existing masters
    for (const acc of mt5Accounts) {
      if (acc.isMaster) await updateAccountInDb(acc.id, { isMaster: false });
    }
    // Set new master, and disable copy mode on master
    await updateAccountInDb(id, { isMaster: true, copierEnabled: false });
  };

  const toggleCopier = (id: number) => {
    if (masterAccount === id) return; // Cannot copy itself
    const acc = mt5Accounts.find((a) => a.id === id);
    if (acc) updateAccountInDb(id, { copierEnabled: !acc.copierEnabled });
  };

  const updateMultiplier = (id: number, val: number) => {
    updateAccountInDb(id, { copierMultiplier: val });
  };

  const handleConnectMaster = async (acc: any) => {
    setConnectStatus({
      loading: true,
      msg: `Routing Bridge to Master Node #${acc.accountNumber}...`,
    });
    try {
      const res = await fetch(`${BRIDGE}/api/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: acc.accountNumber,
          password: acc.mt5Password,
          server: acc.mt5Server,
          email: userEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConnectStatus({
          loading: false,
          success: true,
          msg: `Master Link Established: Node #${acc.accountNumber}`,
        });
      } else {
        setConnectStatus({ loading: false, success: false, msg: data.error });
      }
    } catch (e: any) {
      setConnectStatus({
        loading: false,
        success: false,
        msg: e.message || "Failed to contact MT5 bridge.",
      });
    }
  };

  const removeMt5Account = async (id: number) => {
    try {
      await fetch(`${API_URL}/api/accounts/${id}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
        method: "DELETE",
      });
      if (masterAccount === id) setMasterAccount(null);
      await fetchDbAccounts();
    } catch (e) { }
  };

  if (accountsLoading || tradesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-12 h-12 border-4 border-[--accent] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const activeCopiers = mt5Accounts.filter(
    (a) => a.id !== masterAccount && a.copierEnabled,
  );

  return (
    <div className="space-y-6 text-[--text-primary]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-3">
            <Network className="w-7 h-7 text-[--accent]" />
            Account Matrix & Trade Copier
          </h1>
          <p className="text-[13px] text-[--text-secondary] mt-1">
            Configure Master/Slave node routing for instantaneous multi-account
            execution.
          </p>
        </div>
        <div className="flex items-center bg-[--bg-card] border border-[--border] rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("mt5")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "mt5" ? "bg-[--accent] text-white shadow-md" : "text-[--text-secondary] hover:text-[--text-primary]"}`}
          >
            Live Copier Grid
          </button>
          <button
            onClick={() => setActiveTab("csv")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "csv" ? "bg-[--accent] text-white shadow-md" : "text-[--text-secondary] hover:text-[--text-primary]"}`}
          >
            CSV Analytics
          </button>
        </div>
      </div>

      {/* --- MT5 LIVE TAB --- */}
      {activeTab === "mt5" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Aggregate Operations Matrix & Pulse Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Aggregate Statistics */}
            <div className="bg-[--bg-card] border border-[--border] rounded-xl p-5 md:col-span-1 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[--accent]/5 rounded-bl-full pointer-events-none" />
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-4 flex items-center gap-2">
                    <Server className="w-3.5 h-3.5" /> Aggregate Capital
                </h3>
                <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-end border-b border-[--border]/50 pb-2">
                       <span className="text-xs font-bold text-[--text-secondary]">Total Matrix Balance</span>
                       <span className="font-mono text-xl font-black text-[--text-primary]">
                          ${mt5Accounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                       </span>
                    </div>
                    <div className="flex justify-between items-end pb-2">
                       <span className="text-xs font-bold text-[--text-secondary]">Combined Equity</span>
                       <span className="font-mono text-lg font-bold text-[--text-primary]">
                          ${mt5Accounts.reduce((acc, a) => acc + (Number(a.equity) || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                       </span>
                    </div>
                </div>
            </div>

            {/* Account Pulse Strip */}
            <div
              className={`md:col-span-2 flex flex-col justify-center p-5 rounded-xl border relative shadow-sm ${mt5Pulse?.connected ? "bg-[--accent]/5 border-[--accent]/25" : "bg-[--bg-card] border-[--border]"}`}
            >
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${mt5Pulse?.connected ? "bg-[--bull] animate-pulse shadow-[0_0_6px_var(--bull)]" : "bg-[--text-tertiary]"}`} />
                    <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: mt5Pulse?.connected ? "var(--accent)" : "var(--text-tertiary)" }}>
                      {pulseLoading ? "Scanning Node..." : mt5Pulse?.connected ? "Master Bridge Active" : "Bridge Offline"}
                    </span>
                  </div>
              </div>

              <div className="flex flex-wrap gap-6 mt-1">
              {mt5Pulse?.connected ? (
                [
                  [
                    "Balance",
                    mt5Pulse.balance?.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    }) ?? "—",
                    "$",
                  ],
                  [
                    "Equity",
                    mt5Pulse.equity?.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    }) ?? "—",
                    "$",
                  ],
                  ["Float P&L", mt5Pulse.profit?.toFixed(2) ?? "—", "$"],
                  ["Margin Level", mt5Pulse.marginLevel?.toFixed(1) ?? "—", "%"],
                ].map(([label, val, symbol]) => (
                  <div
                    key={label as string}
                    className="flex flex-col items-start"
                  >
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-[13px] font-bold font-mono"
                      style={{
                        color:
                          label === "Float P&L"
                            ? Number(mt5Pulse.profit) >= 0
                              ? "var(--bull)"
                              : "var(--bear)"
                            : "var(--text-primary)",
                      }}
                    >
                      {symbol}
                      {val}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-[11px] text-[--text-tertiary] mt-2 block">
                  Assign a Master Node and Initialize the MT5 Python bridge to see live routing metrics.
                </span>
              )}
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-[--bg-card] border border-[--border] rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[--text-tertiary] uppercase tracking-widest font-bold mb-1">
                  Master Node
                </p>
                <p className="text-lg font-bold font-mono">
                  {masterAccount ? (
                    <span className="text-[--accent]">
                      #
                      {
                        mt5Accounts.find((a) => a.id === masterAccount)
                          ?.accountNumber
                      }
                    </span>
                  ) : (
                    <span className="text-[--text-secondary]">UNASSIGNED</span>
                  )}
                </p>
              </div>
              <Shield
                className={`w-8 h-8 ${masterAccount ? "text-[--accent]" : "text-[--border-strong]"}`}
              />
            </div>

            <div className="flex-1 bg-[--bg-card] border border-[--border] rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[--text-tertiary] uppercase tracking-widest font-bold mb-1">
                  Active Slaves
                </p>
                <p className="text-lg font-bold font-mono">
                  <span className="text-[--profit]">
                    {activeCopiers.length}
                  </span>{" "}
                  <span className="text-[--text-tertiary] text-sm font-sans mx-1">
                    Routing
                  </span>
                </p>
              </div>
              <Network
                className={`w-8 h-8 ${activeCopiers.length > 0 ? "text-[--profit]" : "text-[--border-strong]"}`}
              />
            </div>
          </div>

          {connectStatus.msg && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 ${connectStatus.success ? "bg-[--profit]/10 border border-[--profit]/20 text-[--profit]" : connectStatus.loading ? "bg-[--info]/10 border border-[--info]/20 text-[--info]" : "bg-[--loss]/10 border border-[--loss]/20 text-[--loss]"}`}
            >
              {connectStatus.loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : connectStatus.success ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <p className="text-sm font-bold tracking-wide">
                {connectStatus.msg}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 mb-4">
            <h2 className="text-[14px] font-bold uppercase tracking-widest text-[--text-secondary]">
              Terminal Matrix
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex bg-[--bg-card] border border-[--border-strong] rounded-lg p-1 mr-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md ${viewMode === "grid" ? "bg-[--bg-elevated] text-[--text-primary]" : "text-[--text-tertiary] hover:text-[--text-secondary]"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-[--bg-elevated] text-[--text-primary]" : "text-[--text-tertiary] hover:text-[--text-secondary]"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setIsAddingMode(!isAddingMode)}
                className="flex items-center gap-2 px-4 py-2 bg-[--bg-elevated] border border-[--border-strong] text-[--text-primary] rounded-lg text-sm font-bold hover:bg-[--border] transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Node
              </button>
            </div>
          </div>

          {isAddingMode && (
            <form
              onSubmit={handleSaveMt5Account}
              className="bg-[--bg-card] border border-[--border] rounded-xl p-6 space-y-5 shadow-2xl"
            >
              <h3 className="text-sm font-bold tracking-widest uppercase text-[--accent] mb-2">
                Deploy New Terminal Node
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-[--text-tertiary] uppercase tracking-wider mb-2">
                    Server Topology
                  </label>
                  <input
                    type="text"
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    required
                    placeholder="MetaQuotes-Demo"
                    className="w-full bg-[--bg-base] border border-[--border] rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[--accent] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[--text-tertiary] uppercase tracking-wider mb-2">
                    Node Login (ID)
                  </label>
                  <input
                    type="number"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    required
                    placeholder="12345678"
                    className="w-full bg-[--bg-base] border border-[--border] rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[--accent] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[--text-tertiary] uppercase tracking-wider mb-2">
                    Encryption Key
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-[--bg-base] border border-[--border] rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[--accent] transition-colors"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[--border]">
                <button
                  type="button"
                  onClick={() => setIsAddingMode(false)}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[--text-secondary] hover:text-[--text-primary] transition-colors"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[--accent] text-white text-xs font-black uppercase tracking-wider rounded-lg hover:opacity-80 transition-all"
                >
                  Deploy Node
                </button>
              </div>
            </form>
          )}

          {mt5Accounts.length === 0 && !isAddingMode ? (
            <div className="border border-dashed border-[--border-strong] rounded-2xl p-16 text-center bg-[--bg-card]">
              <Server className="w-12 h-12 text-[--text-tertiary] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[--text-primary] mb-2">
                Grid Empty
              </h3>
              <p className="text-[--text-secondary] text-sm max-w-md mx-auto line-height-relaxed">
                Deploy terminal nodes to build your copier matrix. You need at
                least one Master Node to broadcast signals to Slaves.
              </p>
            </div>
          ) : (
            <>
              {/* --- LIST VIEW --- */}
              {viewMode === "list" && (
                <div className="bg-[--bg-card] border border-[--border] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[--bg-elevated] text-[--text-tertiary] text-[10px] uppercase font-bold tracking-widest border-b border-[--border]">
                      <tr>
                        <th className="px-6 py-4">Node / ID</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Role / Copier</th>
                        <th className="px-6 py-4">Multiplier</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mt5Accounts.map((acc) => {
                        const isMaster = masterAccount === acc.id;
                        const isEnabled = acc.copierEnabled || false;
                        const multiplier =
                          typeof acc.copierMultiplier === "string"
                            ? parseFloat(acc.copierMultiplier)
                            : acc.copierMultiplier || 1.0;

                        return (
                          <tr
                            key={acc.id}
                            className={`border-b border-[--border]/50 hover:bg-[--bg-elevated]/50 transition-colors ${isMaster ? "bg-[--accent]/5" : ""}`}
                          >
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMaster ? "bg-[--accent] text-white" : isEnabled ? "bg-[--profit]/20 text-[--profit]" : "bg-[--bg-base] border border-[--border-strong] text-[--text-tertiary]"}`}
                                >
                                  {isMaster ? (
                                    <Shield className="w-5 h-5" />
                                  ) : isEnabled ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                  ) : (
                                    <Server className="w-5 h-5" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-bold font-mono text-[--text-primary]">
                                    #{acc.accountNumber}
                                  </h3>
                                  <p className="text-[10px] text-[--text-tertiary] uppercase tracking-wider">
                                    {acc.mt5Server}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              {isMaster ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[--accent] uppercase tracking-widest px-2.5 py-1 bg-[--accent]/10 rounded border border-[--accent]/20 w-fit">
                                  <Shield className="w-3 h-3" /> Master Node
                                </span>
                              ) : isEnabled ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[--profit] uppercase tracking-widest px-2.5 py-1 bg-[--profit]/10 rounded border border-[--profit]/20 w-fit">
                                  <Network className="w-3 h-3" /> Copying Live
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[--text-tertiary] uppercase tracking-widest px-2.5 py-1 bg-[--bg-base] rounded border border-[--border] w-fit">
                                  Idle / Standby
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-5">
                              {!isMaster ? (
                                <button
                                  onClick={() => toggleCopier(acc.id)}
                                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${isEnabled ? "bg-[--loss]/10 text-[--loss] hover:bg-[--loss]/20" : "bg-[--profit]/10 text-[--profit] hover:bg-[--profit]/20"}`}
                                >
                                  {isEnabled
                                    ? "Disable Copier"
                                    : "Enable Copier"}
                                </button>
                              ) : (
                                <p className="text-[10px] text-[--text-tertiary] italic">
                                  Master nodes cannot copy
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-5">
                              {!isMaster && isEnabled ? (
                                <div className="flex items-center bg-[--bg-base] border border-[--border-strong] rounded-md overflow-hidden w-fit">
                                  <button
                                    onClick={() =>
                                      updateMultiplier(
                                        acc.id,
                                        Math.max(0.1, multiplier - 0.1),
                                      )
                                    }
                                    className="px-2.5 py-1.5 text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-mono px-3 font-bold w-12 text-center text-[--text-primary]">
                                    {multiplier.toFixed(1)}x
                                  </span>
                                  <button
                                    onClick={() =>
                                      updateMultiplier(acc.id, multiplier + 0.1)
                                    }
                                    className="px-2.5 py-1.5 text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[--text-tertiary] text-xs">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!isMaster ? (
                                  <button
                                    onClick={() => setAsMaster(acc.id)}
                                    className="px-3 py-1.5 border border-[--border-strong] hover:border-[--accent] text-[10px] uppercase font-bold tracking-widest rounded transition-colors text-[--text-secondary] hover:text-[--accent]"
                                  >
                                    Set Master
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleConnectMaster(acc)}
                                    disabled={connectStatus.loading}
                                    className="px-3 py-1.5 bg-[--accent] text-white text-[10px] uppercase font-bold tracking-widest rounded hover:opacity-80 transition-all flex items-center justify-center gap-1.5"
                                  >
                                    <RefreshCw
                                      className={`w-3 h-3 ${connectStatus.loading ? "animate-spin" : ""}`}
                                    />{" "}
                                    Initialize
                                  </button>
                                )}
                                <button
                                  onClick={() => removeMt5Account(acc.id)}
                                  className="p-1.5 text-[--text-tertiary] hover:text-[--loss] transition-colors rounded"
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
              )}

              {/* --- GRID VIEW --- */}
              {viewMode === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {mt5Accounts.map((acc) => {
                    const multiplier =
                      typeof acc.copierMultiplier === "string"
                        ? parseFloat(acc.copierMultiplier)
                        : acc.copierMultiplier || 1.0;
                    return (
                      <div
                        key={acc.id}
                        className={`bg-[--bg-card] border-2 rounded-xl p-5 flex flex-col justify-between transition-colors relative overflow-hidden ${acc.isMaster ? "border-[--accent] shadow-[0_0_20px_var(--accent-dim)]" : acc.copierEnabled ? "border-[--profit]" : "border-[--border]"}`}
                      >
                        {/* Master Ribbon */}
                        {acc.isMaster && (
                          <div className="absolute top-3 right-[-30px] bg-[--accent] text-white text-[9px] font-black uppercase tracking-widest px-10 py-1 rotate-45 shadow-md">
                            MASTER
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between items-start mb-5">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center ${acc.isMaster ? "bg-[--accent] text-white" : acc.copierEnabled ? "bg-[--profit]/20 text-[--profit]" : "bg-[--bg-elevated] text-[--text-tertiary]"}`}
                            >
                              {acc.isMaster ? (
                                <Shield className="w-6 h-6" />
                              ) : acc.copierEnabled ? (
                                <CheckCircle2 className="w-6 h-6" />
                              ) : (
                                <Server className="w-6 h-6" />
                              )}
                            </div>
                          </div>

                          <h3 className="text-xl font-bold font-mono tracking-tight mb-1">
                            #{acc.accountNumber}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-[--bg-elevated] text-[--text-secondary] rounded uppercase tracking-wider">
                            {acc.mt5Server}
                          </span>
                        </div>

                        {/* Configuration Area */}
                        <div className="mt-6 pt-5 border-t border-[--border] space-y-4">
                          {!acc.isMaster && (
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[11px] font-bold text-[--text-primary]">
                                  Proxy Copier
                                </p>
                                <p className="text-[9px] text-[--text-tertiary] uppercase">
                                  Mirror Master execution
                                </p>
                              </div>
                              <button
                                onClick={() => toggleCopier(acc.id)}
                                className={`w-11 h-6 rounded-full relative transition-colors ${acc.copierEnabled ? "bg-[--profit]" : "bg-[--border-strong]"}`}
                              >
                                <span
                                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${acc.copierEnabled ? "left-6" : "left-1"}`}
                                />
                              </button>
                            </div>
                          )}

                          {!acc.isMaster && acc.copierEnabled && (
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-secondary]">
                                Risk Multiplier
                              </span>
                              <div className="flex items-center bg-[--bg-base] border border-[--border] rounded-md overflow-hidden">
                                <button
                                  onClick={() =>
                                    updateMultiplier(
                                      acc.id,
                                      Math.max(0.1, multiplier - 0.1),
                                    )
                                  }
                                  className="px-2 py-1 text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"
                                >
                                  -
                                </button>
                                <span className="text-[11px] font-mono px-2 font-bold w-12 text-center text-[--text-primary]">
                                  {multiplier.toFixed(1)}x
                                </span>
                                <button
                                  onClick={() =>
                                    updateMultiplier(acc.id, multiplier + 0.1)
                                  }
                                  className="px-2 py-1 text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            {!acc.isMaster ? (
                              <button
                                onClick={() => setAsMaster(acc.id)}
                                className="flex-1 border border-[--border-strong] hover:border-[--accent] text-[10px] uppercase font-bold tracking-widest rounded-lg py-2 transition-colors text-[--text-secondary] hover:text-[--accent]"
                              >
                                Set Master
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConnectMaster(acc)}
                                disabled={connectStatus.loading}
                                className="flex-1 bg-[--accent] text-white text-[10px] uppercase font-black tracking-widest rounded-lg py-2 hover:opacity-80 transition-all flex items-center justify-center gap-2"
                              >
                                <RefreshCw
                                  className={`w-3.5 h-3.5 ${connectStatus.loading ? "animate-spin" : ""}`}
                                />{" "}
                                Initialize
                              </button>
                            )}

                            <button
                              onClick={() => removeMt5Account(acc.id)}
                              className="w-10 flex flex-col items-center justify-center text-[--text-tertiary] border border-[--border] hover:border-[--loss] hover:text-[--loss] hover:bg-[--loss]/10 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* --- CSV TAB --- */}
      {/* CSV Logic Remains Unmodified but matched in style */}
      {activeTab === "csv" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Same CSV Logic preserved from previous mapping */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-display">
                Static Archives
              </h2>
              <p className="text-[12px] text-[--text-secondary] mt-1">
                Historically parsed broker reports
              </p>
            </div>
            <Link
              href="/journal"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[--bg-elevated] border border-[--border-strong] hover:border-[--text-primary] text-sm font-bold transition-colors text-[--text-primary]"
            >
              <Upload className="w-4 h-4" />
              Upload Database
            </Link>
          </div>

          {accountsError && (
            <div className="p-4 bg-[--loss]/10 border border-[--loss]/20 rounded-xl text-[--loss] text-sm font-bold">
              {accountsError}
            </div>
          )}

          {trades.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 bg-[--bg-card] border border-[--border] rounded-xl text-center">
                <p className="text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-2">
                  Total Executions
                </p>
                <p className="text-2xl font-mono font-bold text-[--text-primary]">
                  {analytics?.totalTrades || 0}
                </p>
              </div>
              <div className="p-5 bg-[--bg-card] border border-[--border] rounded-xl text-center">
                <p className="text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-2">
                  Win Rate
                </p>
                <p className="text-2xl font-mono font-bold text-[--profit]">
                  {analytics?.winRate.toFixed(1) || 0}%
                </p>
              </div>
              <div className="p-5 bg-[--bg-card] border border-[--border] rounded-xl text-center">
                <p className="text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-2">
                  Net Gross
                </p>
                <p
                  className={`text-2xl font-mono font-bold ${(analytics?.totalProfit || 0) >= 0 ? "text-[--profit]" : "text-[--loss]"}`}
                >
                  ${analytics?.totalProfit.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="p-5 bg-[--bg-card] border border-[--border] rounded-xl text-center">
                <p className="text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-2">
                  Profit Factor
                </p>
                <p className="text-2xl font-mono font-bold text-[--profit]">
                  {analytics?.profitFactor.toFixed(2) || 0}
                </p>
              </div>
            </div>
          )}

          {accounts.length === 0 && !accountsLoading && !accountsError ? (
            <div className="border border-dashed border-[--border-strong] rounded-2xl p-12 text-center bg-[--bg-card]">
              <Wallet className="w-12 h-12 text-[--text-tertiary] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[--text-primary] mb-2">
                No CSV Accounts Imported Yet
              </h3>
              <p className="text-[--text-secondary] text-sm max-w-md mx-auto">
                Upload a broker CSV file to start tracking your trading accounts
                and performance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 min-h-[200px]">
              {accountsLoading ? (
                <div className="col-span-full flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-[--accent] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-[--text-secondary]">
                      Loading accounts...
                    </p>
                  </div>
                </div>
              ) : (
                accounts.map((account: any) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onSetMaster={() => { }}
                    onToggleCopier={() => { }}
                    onUpdateMultiplier={() => { }}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
