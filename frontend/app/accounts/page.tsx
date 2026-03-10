"use client";

import { useBrokerAccounts, useBrokerAnalytics } from "@/hooks/useCsvTrades";
import { useCsvTrades } from "@/hooks/useCsvTrades";
import { Wallet, TrendingUp, TrendingDown, Upload, Plus, Server, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5000/bridge";

function AccountCard({ account }: { account: any }) {
  const { analyticsData } = useBrokerAnalytics(account.id);

  return (
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {account.brokerName}
          </p>
          <h2 className="text-lg font-bold">#{account.accountNumber}</h2>
        </div>
        <div className="ml-auto text-right">
          {account.balance !== null && (
            <p className="text-2xl font-bold">
              ${Number(account.balance).toLocaleString()}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Balance</p>
        </div>
      </div>

      {analyticsData && (
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-primary/10">
          <div>
            <p className="text-xs text-muted-foreground">Trades</p>
            <p className="text-lg font-bold">
              {analyticsData.metrics?.totalTrades || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="text-lg font-bold text-profit">
              {(analyticsData.metrics?.winRate || 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total P&L</p>
            <p
              className={`text-lg font-bold ${(analyticsData.metrics?.totalProfit || 0) >= 0 ? "text-profit" : "text-loss"}`}
            >
              ${(analyticsData.metrics?.totalProfit || 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-muted-foreground">
        Last updated: {account.lastUpdated
          ? new Date(account.lastUpdated).toLocaleDateString()
          : "Never"}
      </div>
    </div>
  );
}

export default function Accounts() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email ?? undefined;
  const [activeTab, setActiveTab] = useState<"mt5" | "csv">("mt5");

  // MT5 state
  const [mt5Accounts, setMt5Accounts] = useState<any[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [connectStatus, setConnectStatus] = useState<{ loading: boolean, success?: boolean, msg?: string }>({ loading: false });

  // CSV state
  const { accounts, loading: accountsLoading, error: accountsError } = useBrokerAccounts();
  const { analytics, trades, loading: tradesLoading } = useCsvTrades();

  useEffect(() => {
    const saved = localStorage.getItem("mt5LiveAccounts");
    if (saved) {
      setMt5Accounts(JSON.parse(saved));
    }
  }, []);

  const handleSaveMt5Account = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !password || !server) return;

    const newAcc = { id: Date.now(), login: parseInt(login), password, server };
    const updated = [...mt5Accounts, newAcc];
    setMt5Accounts(updated);
    localStorage.setItem("mt5LiveAccounts", JSON.stringify(updated));
    setIsAddingMode(false);
    setLogin("");
    setPassword("");
    setServer("");
  };

  const handleConnect = async (acc: any) => {
    setConnectStatus({ loading: true, msg: `Switching live terminal to #${acc.login}...` });
    try {
      const res = await fetch(`${BRIDGE}/api/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: acc.login,
          password: acc.password,
          server: acc.server,
          email: userEmail,  // saves credentials keyed to this Gmail for auto-reconnect
        })
      });
      const data = await res.json();
      if (data.success) {
        const bal = data.account?.balance ? ` | Balance: $${data.account.balance.toLocaleString()}` : "";
        setConnectStatus({ loading: false, success: true, msg: `${data.message}${bal} — credentials saved for auto-reconnect` });
      } else {
        setConnectStatus({ loading: false, success: false, msg: data.error });
      }
    } catch (e: any) {
      setConnectStatus({ loading: false, success: false, msg: e.message || "Failed to contact MT5 bridge." });
    }
  };

  const removeMt5Account = (id: number) => {
    const next = mt5Accounts.filter(a => a.id !== id);
    setMt5Accounts(next);
    localStorage.setItem("mt5LiveAccounts", JSON.stringify(next));
  };

  if (accountsLoading || tradesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Account Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your Live MT5 connection strings and past CSV import databases
          </p>
        </div>
        <div className="flex items-center bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setActiveTab("mt5")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "mt5" ? "bg-primary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            Live MT5 Bridge
          </button>
          <button
            onClick={() => setActiveTab("csv")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "csv" ? "bg-primary text-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            CSV Import Backlogs
          </button>
        </div>
      </div>

      {/* --- MT5 LIVE TAB --- */}
      {activeTab === "mt5" && (
        <div className="space-y-6 animate-fade-in">
          {connectStatus.msg && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${connectStatus.success ? "bg-green-500/10 border border-green-500/20 text-green-500" : connectStatus.loading ? "bg-blue-500/10 border border-blue-500/20 text-blue-500" : "bg-red-500/10 border border-red-500/20 text-red-500"}`}>
              {connectStatus.loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : connectStatus.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="text-sm font-medium">{connectStatus.msg}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Trading Terminals</h2>
            <button
              onClick={() => setIsAddingMode(!isAddingMode)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add MT5 Credential
            </button>
          </div>

          {isAddingMode && (
            <form onSubmit={handleSaveMt5Account} className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">New MT5 Connection</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Server Name (Exact)</label>
                  <input type="text" value={server} onChange={e => setServer(e.target.value)} required placeholder="e.g. MetaQuotes-Demo" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Account Login (ID)</label>
                  <input type="number" value={login} onChange={e => setLogin(e.target.value)} required placeholder="12345678" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddingMode(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">Save Credential</button>
              </div>
            </form>
          )}

          {mt5Accounts.length === 0 && !isAddingMode ? (
            <div className="border border-dashed border-border rounded-lg p-12 text-center bg-card/50">
              <Server className="w-12 h-12 text-muted-foreground opacity-50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Live Terminals Registered</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Add your MetaTrader 5 account credentials to allow the dashboard to switch your background terminal broker instantly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mt5Accounts.map(acc => (
                <div key={acc.id} className="bg-card border border-border rounded-lg p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Server className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 bg-secondary rounded text-muted-foreground uppercase">{acc.server}</span>
                    </div>
                    <h3 className="text-xl font-bold font-mono-nums tracking-tight mb-1">#{acc.login}</h3>
                    <p className="text-sm text-muted-foreground">Stored Credentials</p>
                  </div>

                  <div className="flex gap-2 mt-6 pt-4 border-t border-border">
                    <button
                      onClick={() => handleConnect(acc)}
                      disabled={connectStatus.loading}
                      className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 text-sm font-semibold rounded-md py-2 transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Connect Now
                    </button>
                    <button
                      onClick={() => removeMt5Account(acc.id)}
                      className="px-3 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- CSV TAB --- */}
      {activeTab === "csv" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">Static CSV Backlogs</h2>
              <p className="text-sm text-muted-foreground mt-1">Historically parsed broker reports</p>
            </div>
            <Link
              href="/journal"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload File Setup
            </Link>
          </div>

          {(accountsError) && (
            <div className="p-4 bg-loss/10 border border-loss/20 rounded text-loss text-sm">
              {accountsError}
            </div>
          )}

          {trades.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-card border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold mt-1">{analytics?.totalTrades || 0}</p>
              </div>
              <div className="p-4 bg-card border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-4 h-4 text-profit" />
                  <p className="text-2xl font-bold text-profit">
                    {analytics?.winRate.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
              <div className="p-4 bg-card border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p
                  className={`text-2xl font-bold mt-1 ${(analytics?.totalProfit || 0) >= 0 ? "text-profit" : "text-loss"}`}
                >
                  ${analytics?.totalProfit.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="p-4 bg-card border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Profit Factor</p>
                <p className="text-2xl font-bold mt-1 text-profit">
                  {analytics?.profitFactor.toFixed(2) || 0}
                </p>
              </div>
            </div>
          )}

          {accounts.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-12 text-center bg-card/50">
              <Wallet className="w-12 h-12 text-muted-foreground opacity-50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Broker Accounts Yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Upload a broker CSV backward report to automatically analyze it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account: any) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          )}

          {/* Performance Breakdown */}
          {analytics && trades.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Winning Trades</p>
                  <p className="text-xl font-bold text-profit">{analytics.winningTrades}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Losing Trades</p>
                  <p className="text-xl font-bold text-loss">{analytics.losingTrades}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Avg Win</p>
                  <p className="text-xl font-bold text-profit">${analytics.avgWin.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Avg Loss</p>
                  <p className="text-xl font-bold text-loss">
                    -${Math.abs(analytics.avgLoss).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
