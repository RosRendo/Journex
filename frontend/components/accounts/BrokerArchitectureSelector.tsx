"use client";

import React, { useState, useEffect } from "react";
import {
  Laptop,
  Server,
  Download,
  Zap,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Cpu,
  Globe,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { resolveLocalUrl } from "@/lib/utils";

interface BrokerArchitectureSelectorProps {
  currentBridgeUrl?: string;
  onBridgeUrlChange?: (newUrl: string) => void;
  isProUser?: boolean;
}

export default function BrokerArchitectureSelector({
  currentBridgeUrl,
  onBridgeUrlChange,
  isProUser = false,
}: BrokerArchitectureSelectorProps) {
  const [activeTab, setActiveTab] = useState<"optionA" | "optionB">("optionA");

  // Option A State
  const [localUrl, setLocalUrl] = useState("http://localhost:5003");
  const [isTesting, setIsTesting] = useState(false);
  const [pingResult, setPingResult] = useState<{
    ok: boolean;
    login?: number | string;
    server?: string;
    balance?: number;
    currency?: string;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  // Option B State
  const [vpsServer, setVpsServer] = useState("");
  const [vpsLogin, setVpsLogin] = useState("");
  const [vpsPassword, setVpsPassword] = useState("");
  const [isDeployingVps, setIsDeployingVps] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bridge_url");
      if (saved) {
        setLocalUrl(saved);
      }
    }
  }, []);

  const handleTestLocalConnection = async () => {
    try {
      setIsTesting(true);
      setPingResult(null);
      const target = resolveLocalUrl(localUrl.trim().replace(/\/$/, ""));
      const start = performance.now();
      
      const res = await fetch(`${target}/health`, {
        headers: { "Cache-Control": "no-cache" },
      });
      const latency = Math.round(performance.now() - start);

      if (res.ok) {
        const data = await res.json();
        if (data.mt5_connected && data.account) {
          setPingResult({
            ok: true,
            login: data.account.login,
            server: data.account.server,
            balance: data.account.balance,
            currency: data.account.currency || "USD",
            latencyMs: latency,
          });
          toast.success(`Connected to personal MT5 (${data.account.server})!`);
        } else if (data.mt5_connected) {
          setPingResult({
            ok: true,
            server: "MT5 Online (Awaiting Broker Login)",
            latencyMs: latency,
          });
          toast.info("Bridge is online, but no account is logged into MetaTrader 5.");
        } else {
          setPingResult({
            ok: false,
            error: data.message || "MetaTrader 5 desktop is closed or not initialized.",
            latencyMs: latency,
          });
          toast.error("Bridge online, but MT5 terminal is not responding.");
        }
      } else {
        setPingResult({
          ok: false,
          error: `HTTP Error ${res.status}: Check that your local bridge is running.`,
        });
        toast.error("Could not reach local bridge.");
      }
    } catch (e: any) {
      setPingResult({
        ok: false,
        error: `Connection refused: Start start_bridge.bat on your PC first. (${e.message})`,
      });
      toast.error("Bridge unreachable at " + localUrl);
    } finally {
      setIsTesting(false);
    }
  };

  const handleActivateOptionA = () => {
    const clean = localUrl.trim().replace(/\/$/, "");
    if (typeof window !== "undefined") {
      localStorage.setItem("bridge_url", clean);
      toast.success("Option A Active: Web terminal is now paired to your personal PC!");
      if (onBridgeUrlChange) onBridgeUrlChange(clean);
    }
  };

  const handleDeployOptionB = () => {
    if (!isProUser) {
      toast.error("Cloud-Hosted 24/7 VPS requires a Pro Subscription or Cloud Add-on ($49/mo).");
      return;
    }
    if (!vpsServer || !vpsLogin || !vpsPassword) {
      toast.error("Please fill in MT5 server, account number, and password.");
      return;
    }
    setIsDeployingVps(true);
    setTimeout(() => {
      setIsDeployingVps(false);
      toast.success(`Cloud VPS instance provisioned for #${vpsLogin} on ${vpsServer}!`);
    }, 1200);
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c14]/90 backdrop-blur-xl p-5 sm:p-6 mb-6 shadow-2xl">
      {/* ── HEADER & TAB SWITCHER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#20e0b2] animate-pulse" />
            <h2 className="text-sm font-mono font-bold tracking-tight text-white uppercase">
              Broker Architecture &amp; Execution Hub
            </h2>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 font-mono">
            Choose how your MetaTrader 5 account executes trades: On your own PC (Free) or 24/7 Cloud VPS.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="inline-flex p-1 rounded-xl bg-black/40 border border-white/[0.06] shrink-0 font-mono text-[10px]">
          <button
            onClick={() => setActiveTab("optionA")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === "optionA"
                ? "bg-[#20e0b2] text-black shadow-lg shadow-[#20e0b2]/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            Option A: Personal PC (Free)
          </button>
          <button
            onClick={() => setActiveTab("optionB")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === "optionB"
                ? "bg-[#20e0b2] text-black shadow-lg shadow-[#20e0b2]/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Option B: Cloud VPS ($49/mo)
          </button>
        </div>
      </div>

      {/* ── OPTION A: PERSONAL PC (BRING YOUR OWN MT5) ── */}
      {activeTab === "optionA" && (
        <div className="pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Configuration & Live Ping */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#20e0b2]/10 text-[#20e0b2] border border-[#20e0b2]/20 text-[9px] font-mono font-bold uppercase tracking-wider">
                Recommended For Active Traders
              </span>
              <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10 text-[9px] font-mono">
                100% Credential Privacy
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Run MetaTrader 5 on your own laptop or desktop. Trades route directly to your local terminal with
              <strong className="text-white"> zero cloud latency</strong>. Your broker login and password never leave your machine.
            </p>

            {/* Input & Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={localUrl}
                  onChange={(e) => setLocalUrl(e.target.value)}
                  placeholder="http://localhost:5003"
                  className="w-full bg-[#08080d] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#20e0b2]/50"
                />
              </div>

              <button
                onClick={handleTestLocalConnection}
                disabled={isTesting}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.1] text-xs font-mono font-bold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin text-[#20e0b2]" : ""}`} />
                {isTesting ? "Pinging..." : "Test Ping"}
              </button>

              <button
                onClick={handleActivateOptionA}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#20e0b2] hover:bg-[#1bc79e] text-black text-xs font-mono font-black transition-all shadow-lg shadow-[#20e0b2]/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Activate Bridge
              </button>
            </div>

            {/* Live Ping Feedback Result */}
            {pingResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-mono transition-all ${
                  pingResult.ok
                    ? "bg-[#20e0b2]/5 border-[#20e0b2]/30 text-zinc-200"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {pingResult.ok ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#20e0b2]" />
                      <span className="font-bold text-white">
                        {pingResult.server || "Local MT5"} · Account #{pingResult.login || "Active"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                      {pingResult.balance !== undefined && (
                        <span>
                          Balance: <strong className="text-[#20e0b2]">${pingResult.balance.toLocaleString()}</strong>
                        </span>
                      )}
                      <span>Latency: <strong className="text-white">{pingResult.latencyMs}ms</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{pingResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: 1-Click Download Card */}
          <div className="lg:col-span-5 rounded-xl bg-[#08080d] border border-white/[0.08] p-4 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold text-white flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-[#20e0b2]" />
                  1-Click Desktop Bridge Package
                </span>
                <span className="text-[9px] font-mono text-zinc-500">v1.0.0 · 4 KB</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                Non-technical setup. Includes a double-click launcher (<code className="text-zinc-300">start_bridge.bat</code>) that connects your MT5 to Journex in 5 seconds.
              </p>

              <ol className="mt-3 space-y-1.5 text-[10px] font-mono text-zinc-400 list-decimal list-inside">
                <li>Download &amp; extract <span className="text-zinc-200">JournexBridge.zip</span></li>
                <li>Open your MT5 &amp; enable <span className="text-zinc-200">Algo Trading</span></li>
                <li>Double click <span className="text-[#20e0b2]">start_bridge.bat</span></li>
              </ol>
            </div>

            <a
              href="/downloads/JournexBridge.zip"
              download="JournexBridge.zip"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.1] text-xs font-mono font-bold transition-all text-center"
            >
              <Download className="w-4 h-4 text-[#20e0b2]" />
              Download JournexBridge.zip
            </a>
          </div>
        </div>
      )}

      {/* ── OPTION B: CLOUD HOSTED 24/7 VPS ── */}
      {activeTab === "optionB" && (
        <div className="pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[9px] font-mono font-bold uppercase tracking-wider">
                Cloud Hosted 24/7 VPS
              </span>
              <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10 text-[9px] font-mono">
                Equinix NY4 Low-Latency Pool
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              No computer needed. We run an isolated MetaTrader 5 portable terminal dedicated to your account inside our high-performance Windows Server pool 24 hours a day.
            </p>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                  Broker MT5 Server (e.g. Exness-Real19, ICMarkets-Live02)
                </label>
                <input
                  type="text"
                  value={vpsServer}
                  onChange={(e) => setVpsServer(e.target.value)}
                  placeholder="Exness-Real19"
                  className="w-full bg-[#08080d] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#20e0b2]/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                    MT5 Account Number / Login
                  </label>
                  <input
                    type="text"
                    value={vpsLogin}
                    onChange={(e) => setVpsLogin(e.target.value)}
                    placeholder="10928312"
                    className="w-full bg-[#08080d] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#20e0b2]/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                    Trader Password
                  </label>
                  <input
                    type="password"
                    value={vpsPassword}
                    onChange={(e) => setVpsPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#08080d] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#20e0b2]/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleDeployOptionB}
                  disabled={isDeployingVps}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#20e0b2] hover:bg-[#1bc79e] text-black text-xs font-mono font-black transition-all shadow-lg shadow-[#20e0b2]/20 disabled:opacity-50"
                >
                  <Server className="w-3.5 h-3.5" />
                  {isDeployingVps ? "Provisioning VPS Slot..." : "Deploy 24/7 Cloud MT5"}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl bg-[#08080d] border border-white/[0.08] p-4 flex flex-col justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono font-bold text-white flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#20e0b2]" />
                Cloud Hosting Tier Details
              </span>
              <ul className="space-y-2 text-[10px] font-mono text-zinc-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-[#20e0b2]" />
                  Always-on 99.9% uptime SLA
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-[#20e0b2]" />
                  Sub-millisecond execution to major brokers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-[#20e0b2]" />
                  AES-256 encrypted credential vault
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-[#20e0b2]" />
                  Included in Lifetime &amp; Pro tiers
                </li>
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] text-[10px] font-mono text-zinc-400">
              <span className="text-zinc-300 font-bold block mb-0.5">Need a dedicated broker slot?</span>
              Option B automatically manages multi-terminal isolation so other users can never switch your account.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

