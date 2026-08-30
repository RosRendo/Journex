"use client";

import { getBackendUrl, fetchWithAuth } from "@/lib/utils";
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
import { useSession } from "@/lib/useSession";
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
  const borderColor = account.isMaster
    ? "border-[rgba(32,224,178,0.3)]/30 bg-[#20e0b2]/[0.01]"
    : "border-[rgba(255,255,255,0.07)] bg-[#101014]";

  return (
    <div
      className={`border rounded-xl p-5 relative overflow-hidden transition-all duration-350 ${borderColor}`}
    >
      {account.isMaster && (
        <div className="absolute top-0 right-0 bg-[#20e0b2] text-emerald-950 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg z-10 font-mono">
          Master Node
        </div>
      )}
      <div className="flex items-center gap-4 mb-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${account.isMaster ? "bg-[#20e0b2]/10 text-emerald-450" : "bg-black/25 text-zinc-550 border border-zinc-805"}`}
        >
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono">
            {account.brokerName || account.mt5Server}
          </p>
          <h2 className="text-sm font-bold text-white font-mono">
            #{account.accountNumber}
          </h2>
        </div>
        <div className="ml-auto text-right">
          {account.balance !== null && (
            <p className="text-base font-bold font-mono text-white">
              ${Number(account.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest font-mono">
            Balance
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-[rgba(255,255,255,0.07)]">
        {!account.isMaster ? (
          <div className="flex items-center justify-between w-full font-mono">
            <button
              onClick={() => onToggleCopier(account.id)}
              className={`py-1.5 px-3 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors border ${
                account.copierEnabled
                  ? "bg-[#20e0b2]/10 text-[#20e0b2] border-[rgba(32,224,178,0.3)]/20"
                  : "bg-black/35 text-zinc-500 border-[rgba(255,255,255,0.07)] hover:text-white"
              }`}
            >
              {account.copierEnabled ? "Copier Active" : "Enable Copier"}
            </button>
            {account.copierEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase font-bold text-zinc-550">
                  Mult:
                </span>
                <select
                  value={account.copierMultiplier}
                  onChange={(e) =>
                    onUpdateMultiplier(account.id, parseFloat(e.target.value))
                  }
                  className="bg-black/35 border border-zinc-850 text-[10px] font-bold px-2 py-1 rounded outline-none text-zinc-350 cursor-pointer"
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
          <div className="w-full text-center font-mono">
            <span className="text-[9px] font-bold text-[#20e0b2] flex justify-center items-center gap-1.5 uppercase tracking-widest">
              <Shield className="w-3.5 h-3.5" /> Broadcasting Node
            </span>
          </div>
        )}
      </div>

      {!account.isMaster && (
        <button
          onClick={() => onSetMaster(account.id)}
          className="w-full mt-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-zinc-500 hover:bg-black/25 hover:text-white transition-colors border border-[rgba(255,255,255,0.07)]/20 font-mono hover:border-[rgba(255,255,255,0.07)]"
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

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

  const API_URL = getBackendUrl();

  const fetchDbAccounts = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/accounts`, {
        headers: { "ngrok-skip-browser-warning": "true" },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const dbAccs = json.data || [];
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
      } catch (e) {
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
    if (!login || !password || !server) return;

    try {
      const newAcc = {
        brokerName: server.split("-")[0] || "MetaTrader",
        accountNumber: login,
        mt5Password: password,
        mt5Server: server,
        isMaster: mt5Accounts.length === 0,
        copierEnabled: false,
        copierMultiplier: 1.0,
        balance: 0,
        equity: 0,
      };

      const res = await fetchWithAuth(`${API_URL}/api/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAcc),
      });

      if (!res.ok) {
        alert("Failed to save account node.");
        return;
      }

      await fetchDbAccounts();
      setIsAddingMode(false);
      setLogin("");
      setPassword("");
      setServer("");
    } catch (e) {
      alert("Network error: Could not save node.");
    }
  };

  const updateAccountInDb = async (id: number, data: any) => {
    try {
      await fetchWithAuth(`${API_URL}/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const setAsMaster = async (id: number) => {
    try {
      for (const acc of mt5Accounts) {
        if (acc.isMaster && acc.id !== id) {
          await updateAccountInDb(acc.id, { isMaster: false });
        }
      }
      await updateAccountInDb(id, { isMaster: true, copierEnabled: false });
      await fetchDbAccounts();
    } catch (e) {
      console.error(e);
    }
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
    setConnectStatus({
      loading: true,
      msg: `Routing Bridge to Master Node #${acc.accountNumber}...`,
    });
    try {
      const res = await fetchWithAuth(`${BRIDGE}/api/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: parseInt(acc.accountNumber, 10) || 0,
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
        const errorMsg = data.error || (data.detail ? JSON.stringify(data.detail) : "Unknown error");
        setConnectStatus({ loading: false, success: false, msg: errorMsg });
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
      await fetchWithAuth(`${API_URL}/api/accounts/${id}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
        method: "DELETE",
      });
      if (masterAccount === id) setMasterAccount(null);
      await fetchDbAccounts();
    } catch (e) {
      console.error(e);
    }
  };

  if (accountsLoading || tradesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-10 h-10 border-2 border-[rgba(32,224,178,0.3)] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const activeCopiers = mt5Accounts.filter(
    (a) => a.id !== masterAccount && a.copierEnabled,
  );

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col pb-12 font-sans">
      
      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-20 bg-[#09090b]">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#f4f4f5]">Account Matrix &amp; Copier</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#20e0b2] animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-widest font-mono text-[#71717a]">Topology Control Active</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-0 border-l border-[rgba(255,255,255,0.07)]">
          <button
            onClick={() => setActiveTab("mt5")}
            className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap ${
              activeTab === "mt5" ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            Live Copier Grid
          </button>
          <button
            onClick={() => setActiveTab("csv")}
            className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap ${
              activeTab === "csv" ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            CSV Analytics
          </button>
        </div>
      </div>

      {/* Main container */}
      <div className="flex-1 w-full p-6 space-y-4">

      {/* --- MT5 LIVE TAB --- */}
      {activeTab === "mt5" && (
        <div className="space-y-4 animate-fade-in flex flex-col gap-4">
          
          {/* Aggregate Stats Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Aggregate Capital Card */}
            <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 shadow-md flex flex-col justify-between relative overflow-hidden">
              <h3 className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-1.5 font-mono">
                <Server className="w-3.5 h-3.5 text-zinc-400" /> Aggregate Capital
              </h3>
              <div className="space-y-2 relative z-10 font-mono text-[11px]">
                <div className="flex justify-between items-end border-b border-zinc-850/40 pb-2">
                  <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                    Total Balance
                  </span>
                  <span className="text-base font-black text-white">
                    ${mt5Pulse?.connected && mt5Pulse?.balance != null
                      ? mt5Pulse.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })
                      : mt5Accounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-end pb-1">
                  <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                    Combined Equity
                  </span>
                  <span className="text-sm font-bold text-zinc-200">
                    ${mt5Pulse?.connected && mt5Pulse?.equity != null
                      ? mt5Pulse.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })
                      : mt5Accounts.reduce((acc, a) => acc + (Number(a.equity) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Pulse Strip */}
            <div
              className={`md:col-span-2 flex flex-col justify-center p-4 rounded-xl border relative shadow-md ${mt5Pulse?.connected ? "bg-[#20e0b2]/[0.01] border-[rgba(32,224,178,0.3)]/20" : "bg-[#101014] border-[rgba(255,255,255,0.07)]"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${mt5Pulse?.connected ? "bg-[#20e0b2] animate-pulse" : "bg-zinc-700"}`}
                  />
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest font-mono`}
                    style={{
                      color: mt5Pulse?.connected ? "#34d399" : "#71717a",
                    }}
                  >
                    {pulseLoading
                      ? "Scanning Node..."
                      : mt5Pulse?.connected
                        ? "Master Bridge Active"
                        : "Bridge Offline"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-5 font-mono">
                {mt5Pulse?.connected ? (
                  [
                    ["Balance", mt5Pulse.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—", "$"],
                    ["Equity", mt5Pulse.equity?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—", "$"],
                    ["Float P&L", mt5Pulse.profit?.toFixed(2) ?? "—", "$"],
                    ["Margin Level", mt5Pulse.marginLevel?.toFixed(1) ?? "—", "%"],
                  ].map(([label, val, symbol]) => (
                    <div key={label as string} className="flex flex-col items-start text-[11px]">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-550">
                        {label}
                      </span>
                      <span
                        className="font-bold text-xs"
                        style={{
                          color:
                            label === "Float P&L"
                              ? Number(mt5Pulse.profit) >= 0
                                ? "#20e0b2"
                                : "#ff5c73"
                              : "#f4f4f5",
                        }}
                      >
                        {symbol}
                        {val}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-zinc-550">
                    Assign a Master Node and Initialize the MT5 Python bridge to see live routing metrics.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Node Counts Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono mb-1">
                  Master Node Configuration
                </p>
                <p className="text-base font-bold font-mono">
                  {masterAccount ? (
                    <span className="text-[#20e0b2]">
                      #
                      {
                        mt5Accounts.find((a) => a.id === masterAccount)
                          ?.accountNumber
                      }
                    </span>
                  ) : (
                    <span className="text-zinc-650 font-mono">UNASSIGNED</span>
                  )}
                </p>
              </div>
              <Shield className={`w-6 h-6 ${masterAccount ? "text-[#20e0b2]" : "text-zinc-750"}`} />
            </div>

            <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold font-mono mb-1">
                  Active Slaves Matrix
                </p>
                <p className="text-base font-bold font-mono">
                  <span className="text-[#20e0b2]">
                    {activeCopiers.length}
                  </span>{" "}
                  <span className="text-zinc-500 text-[10px] font-sans mx-1">
                    Nodes Routing
                  </span>
                </p>
              </div>
              <Network className={`w-6 h-6 ${activeCopiers.length > 0 ? "text-[#20e0b2]" : "text-zinc-750"}`} />
            </div>
          </div>

          {connectStatus.msg && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2.5 font-mono text-[11px] ${
                connectStatus.success 
                  ? "bg-[#20e0b2]/10 border border-[rgba(32,224,178,0.3)]/20 text-emerald-450" 
                  : connectStatus.loading 
                    ? "bg-blue-500/10 border border-blue-500/20 text-blue-450" 
                    : "bg-[rgba(255,92,115,0.08)] border border-[rgba(255,92,115,0.2)] text-red-450"
              }`}
            >
              {connectStatus.loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : connectStatus.success ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <p className="font-bold">
                {connectStatus.msg}
              </p>
            </div>
          )}

          {/* Matrix Header & View mode */}
          <div className="flex items-center justify-between mt-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-mono">
              Topology Nodes Matrix
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex bg-black/20 border border-[rgba(255,255,255,0.07)] rounded-lg p-1 mr-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white/10 text-white" : "text-zinc-550 hover:text-zinc-350"}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white/10 text-white" : "text-zinc-550 hover:text-zinc-350"}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => setIsAddingMode(!isAddingMode)}
                className="flex items-center gap-1 text-[10px] font-bold font-sans uppercase tracking-wider bg-white/5 border border-white/5 text-zinc-350 hover:bg-white/10 px-3.5 py-2 rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Node
              </button>
            </div>
          </div>

          {isAddingMode && (
            <form
              onSubmit={handleSaveMt5Account}
              className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 space-y-4"
            >
              <h3 className="text-xs font-bold tracking-widest uppercase text-[#20e0b2] font-mono">
                Deploy New Node Topology
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                    Server Topology
                  </label>
                  <input
                    type="text"
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    required
                    placeholder="MetaQuotes-Demo"
                    className="w-full bg-black/35 border border-[rgba(255,255,255,0.07)] rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-[rgba(32,224,178,0.3)] text-white placeholder-zinc-700"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                    Node Login (ID)
                  </label>
                  <input
                    type="number"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    required
                    placeholder="12345678"
                    className="w-full bg-black/35 border border-[rgba(255,255,255,0.07)] rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-[rgba(32,224,178,0.3)] text-white placeholder-zinc-700"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                    Encryption Key (Password)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-black/35 border border-[rgba(255,255,255,0.07)] rounded-lg px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-[rgba(32,224,178,0.3)] text-white placeholder-zinc-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3.5 border-t border-[rgba(255,255,255,0.07)] font-mono text-[9px] font-bold">
                <button
                  type="button"
                  onClick={() => setIsAddingMode(false)}
                  className="px-4 py-2 uppercase tracking-wider text-zinc-550 hover:text-white transition-colors"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#20e0b2] text-emerald-950 uppercase tracking-wider rounded-lg hover:bg-[#20e0b2] transition-all font-black"
                >
                  Deploy Node
                </button>
              </div>
            </form>
          )}

          {mt5Accounts.length === 0 && !isAddingMode ? (
            <div className="border border-dashed border-[rgba(255,255,255,0.07)] rounded-xl p-12 text-center bg-[#101014]">
              <Server className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1.5">
                Matrix Topology Empty
              </h3>
              <p className="text-zinc-500 text-xs max-w-sm mx-auto leading-relaxed">
                Deploy terminal nodes to build your copier matrix. You need at least one Master Node to broadcast signals to Slaves.
              </p>
            </div>
          ) : (
            <>
              {/* --- LIST VIEW --- */}
              {viewMode === "list" && (
                <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-[#101014]/85 text-[9px] uppercase font-bold text-zinc-500 tracking-wider border-b border-[rgba(255,255,255,0.07)]">
                      <tr>
                        <th className="px-4 py-3">Node / ID</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Role / Copier</th>
                        <th className="px-4 py-3">Multiplier</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/40 font-medium text-zinc-300 font-mono">
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
                            className={`hover:bg-white/[0.01] border-b border-[rgba(255,255,255,0.04)] transition-colors ${isMaster ? "bg-[#20e0b2]/[0.02]" : ""}`}
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMaster ? "bg-[#20e0b2]/10 text-[#20e0b2]" : isEnabled ? "bg-[#20e0b2]/10 text-[#20e0b2] border border-[rgba(32,224,178,0.3)]/20" : "bg-black/25 text-zinc-600 border border-zinc-850"}`}
                                >
                                  {isMaster ? (
                                    <Shield className="w-4 h-4" />
                                  ) : isEnabled ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                  ) : (
                                    <Server className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-bold text-white text-[11px] font-mono">
                                    #{acc.accountNumber}
                                  </h3>
                                  <p className="text-[8px] text-zinc-550 uppercase tracking-wider font-mono">
                                    {acc.mt5Server}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {isMaster ? (
                                <span className="flex items-center gap-1 text-[8px] font-bold text-[#20e0b2] uppercase tracking-widest px-2 py-0.5 bg-[#20e0b2]/10 rounded border border-[rgba(32,224,178,0.3)]/20 w-fit">
                                  <Shield className="w-2.5 h-2.5" /> Master Node
                                </span>
                              ) : isEnabled ? (
                                <span className="flex items-center gap-1 text-[8px] font-bold text-[#20e0b2] uppercase tracking-widest px-2 py-0.5 bg-[#20e0b2]/10 rounded border border-[rgba(32,224,178,0.3)]/20 w-fit">
                                  <Network className="w-2.5 h-2.5" /> Copying Live
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[8px] font-bold text-zinc-550 uppercase tracking-widest px-2 py-0.5 bg-black/25 rounded border border-[rgba(255,255,255,0.07)] w-fit">
                                  Idle / Standby
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {!isMaster ? (
                                <button
                                  onClick={() => toggleCopier(acc.id)}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all border ${
                                    isEnabled 
                                      ? "bg-[rgba(255,92,115,0.08)] text-[#ff5c73] border-[rgba(255,92,115,0.2)] hover:bg-[rgba(255,92,115,0.12)]" 
                                      : "bg-[#20e0b2]/10 text-[#20e0b2] border-[rgba(32,224,178,0.3)]/20 hover:bg-[#20e0b2]/20"
                                  }`}
                                >
                                  {isEnabled
                                    ? "Disable Copier"
                                    : "Enable Copier"}
                                </button>
                              ) : (
                                <p className="text-[9px] text-zinc-650 italic">
                                  Master node cannot copy
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {!isMaster && isEnabled ? (
                                <div className="flex items-center bg-black/25 border border-[rgba(255,255,255,0.07)] rounded-lg overflow-hidden w-fit font-mono text-[10px]">
                                  <button
                                    onClick={() =>
                                      updateMultiplier(
                                        acc.id,
                                        Math.max(0.1, multiplier - 0.1),
                                      )
                                    }
                                    className="px-2 py-1 text-zinc-550 hover:text-white hover:bg-white/5"
                                  >
                                    -
                                  </button>
                                  <span className="px-2.5 font-bold text-center text-white w-10">
                                    {multiplier.toFixed(1)}x
                                  </span>
                                  <button
                                    onClick={() =>
                                      updateMultiplier(acc.id, multiplier + 0.1)
                                    }
                                    className="px-2 py-1 text-zinc-550 hover:text-white hover:bg-white/5"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <span className="text-zinc-650 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isMaster ? (
                                  <button
                                    onClick={() => setAsMaster(acc.id)}
                                    className="px-2.5 py-1.5 border border-[rgba(255,255,255,0.07)] hover:border-[rgba(32,224,178,0.3)]/50 text-[9px] uppercase font-bold tracking-widest rounded-lg transition-colors text-zinc-400 hover:text-[#20e0b2]"
                                  >
                                    Set Master
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleConnectMaster(acc)}
                                    disabled={connectStatus.loading}
                                    className="px-2.5 py-1.5 bg-[#20e0b2] hover:bg-emerald-450 text-emerald-950 text-[9px] uppercase font-bold tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 font-mono font-black"
                                  >
                                    <RefreshCw
                                      className={`w-3 h-3 ${connectStatus.loading ? "animate-spin" : ""}`}
                                    />
                                    Initialize
                                  </button>
                                )}
                                <button
                                  onClick={() => removeMt5Account(acc.id)}
                                  className="p-1.5 text-zinc-600 hover:text-[#ff5c73] transition-colors rounded-lg hover:bg-[rgba(255,92,115,0.08)] border border-transparent hover:border-[rgba(255,92,115,0.2)]"
                                >
                                  <X className="w-3.5 h-3.5" />
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mt5Accounts.map((acc) => {
                    const multiplier =
                      typeof acc.copierMultiplier === "string"
                        ? parseFloat(acc.copierMultiplier)
                        : acc.copierMultiplier || 1.0;
                    return (
                      <div
                        key={acc.id}
                        className={`bg-[#101014] border rounded-xl p-4 flex flex-col justify-between transition-colors relative overflow-hidden ${acc.isMaster ? "border-[rgba(32,224,178,0.3)]/30 bg-[#20e0b2]/[0.01]" : acc.copierEnabled ? "border-[rgba(32,224,178,0.3)]/20" : "border-zinc-850"}`}
                      >
                        {acc.isMaster && (
                          <div className="absolute top-3 right-[-30px] bg-[#20e0b2] text-emerald-950 text-[8px] font-black uppercase tracking-widest px-8 py-0.5 rotate-45 shadow-md font-mono">
                            MASTER
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${acc.isMaster ? "bg-[#20e0b2]/10 text-[#20e0b2]" : acc.copierEnabled ? "bg-[#20e0b2]/10 text-[#20e0b2] border border-[rgba(32,224,178,0.3)]/20" : "bg-black/25 border border-[rgba(255,255,255,0.07)] text-zinc-600"}`}
                            >
                              {acc.isMaster ? (
                                <Shield className="w-5 h-5" />
                              ) : acc.copierEnabled ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Server className="w-5 h-5" />
                              )}
                            </div>
                          </div>

                          <h3 className="text-base font-bold font-mono tracking-tight mb-1">
                            #{acc.accountNumber}
                          </h3>
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-black/25 text-zinc-550 rounded uppercase tracking-wider font-mono border border-zinc-850">
                            {acc.mt5Server}
                          </span>
                        </div>

                        {/* Configuration Area */}
                        <div className="mt-5 pt-4 border-t border-zinc-850 space-y-3.5">
                          {!acc.isMaster && (
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <div>
                                <p className="font-bold text-white">
                                  Proxy Copier Routing
                                </p>
                              </div>
                              <button
                                onClick={() => toggleCopier(acc.id)}
                                className={`w-9 h-5 rounded-full relative transition-colors ${acc.copierEnabled ? "bg-[#20e0b2]" : "bg-zinc-800"}`}
                              >
                                <span
                                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${acc.copierEnabled ? "left-4.5" : "left-0.5"}`}
                                />
                              </button>
                            </div>
                          )}

                          {!acc.isMaster && acc.copierEnabled && (
                            <div className="flex items-center justify-between pt-1 font-mono text-[10px]">
                              <span className="font-bold uppercase tracking-wider text-zinc-550">
                                Risk Multiplier
                              </span>
                              <div className="flex items-center bg-black/25 border border-[rgba(255,255,255,0.07)] rounded-lg overflow-hidden">
                                <button
                                  onClick={() =>
                                    updateMultiplier(
                                      acc.id,
                                      Math.max(0.1, multiplier - 0.1),
                                    )
                                  }
                                  className="px-2 py-1 text-zinc-550 hover:text-white hover:bg-white/5"
                                >
                                  -
                                </button>
                                <span className="font-bold w-10 text-center text-white">
                                  {multiplier.toFixed(1)}x
                                </span>
                                <button
                                  onClick={() =>
                                    updateMultiplier(acc.id, multiplier + 0.1)
                                  }
                                  className="px-2 py-1 text-zinc-555 hover:text-white hover:bg-white/5"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 pt-1 font-mono text-[9px] font-bold">
                            {!acc.isMaster ? (
                              <button
                                onClick={() => setAsMaster(acc.id)}
                                className="flex-1 border border-[rgba(255,255,255,0.07)] hover:border-[rgba(32,224,178,0.3)]/50 text-[8px] uppercase tracking-widest rounded-lg py-2 transition-colors text-zinc-400 hover:text-[#20e0b2]"
                              >
                                Set Master
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConnectMaster(acc)}
                                disabled={connectStatus.loading}
                                className="flex-1 bg-[#20e0b2] hover:bg-emerald-450 text-emerald-950 uppercase tracking-widest rounded-lg py-2 hover:opacity-80 transition-all flex items-center justify-center gap-1.5 font-black"
                              >
                                <RefreshCw
                                  className={`w-3 h-3 ${connectStatus.loading ? "animate-spin" : ""}`}
                                />
                                Initialize
                              </button>
                            )}

                            <button
                              onClick={() => removeMt5Account(acc.id)}
                              className="w-8 flex flex-col items-center justify-center text-zinc-600 border border-[rgba(255,255,255,0.07)] hover:border-red-500/50 hover:text-[#ff5c73] hover:bg-[rgba(255,92,115,0.08)] rounded-lg transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
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
      {activeTab === "csv" && (
        <div className="space-y-4 animate-fade-in flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono">
                Static Archives Matrix
              </h2>
            </div>
            <Link
              href="/journal"
              className="flex items-center gap-1 text-[10px] font-bold font-sans uppercase tracking-wider bg-white/5 border border-white/5 text-zinc-350 hover:bg-white/10 px-3.5 py-2 rounded-lg transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-455" />
              Upload Database
            </Link>
          </div>

          {accountsError && (
            <div className="p-3 bg-[rgba(255,92,115,0.08)] border border-[rgba(255,92,115,0.2)] rounded-lg text-[#ff5c73] text-xs font-bold font-mono">
              {accountsError}
            </div>
          )}

          {trades.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl text-center shadow-md">
                <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-550 mb-2 font-mono">
                  Total Executions
                </p>
                <p className="text-xl font-mono font-black text-white">
                  {analytics?.totalTrades || 0}
                </p>
              </div>
              <div className="p-4 bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl text-center shadow-md">
                <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-550 mb-2 font-mono">
                  Win Rate
                </p>
                <p className="text-xl font-mono font-black text-[#20e0b2]">
                  {analytics?.winRate.toFixed(1) || 0}%
                </p>
              </div>
              <div className="p-4 bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl text-center shadow-md">
                <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-550 mb-2 font-mono">
                  Net Gross
                </p>
                <p
                  className={`text-xl font-mono font-black ${(analytics?.totalProfit || 0) >= 0 ? "text-emerald-450" : "text-red-450"}`}
                >
                  ${analytics?.totalProfit.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="p-4 bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl text-center shadow-md">
                <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-550 mb-2 font-mono">
                  Profit Factor
                </p>
                <p className="text-xl font-mono font-black text-[#20e0b2]">
                  {analytics?.profitFactor.toFixed(2) || 0}
                </p>
              </div>
            </div>
          )}

          {accounts.length === 0 && !accountsLoading && !accountsError ? (
            <div className="border border-dashed border-[rgba(255,255,255,0.07)] rounded-xl p-12 text-center bg-[#101014]">
              <Wallet className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1.5">
                No CSV Accounts Logged
              </h3>
              <p className="text-zinc-500 text-xs max-w-sm mx-auto">
                Upload a broker CSV statement report to start parsing performance analytics.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[200px]">
              {accountsLoading ? (
                <div className="col-span-full flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-2 border-[rgba(32,224,178,0.3)] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
                      Loading Matrix...
                    </p>
                  </div>
                </div>
              ) : (
                accounts.map((account: any) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onSetMaster={() => {}}
                    onToggleCopier={() => {}}
                    onUpdateMultiplier={() => {}}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
  );
}

