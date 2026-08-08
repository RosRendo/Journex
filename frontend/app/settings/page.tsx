"use client";

import React, { useState, useEffect } from "react";
import { signOut, useSession } from "@/lib/useSession";
import { User, DollarSign, ShieldAlert, LogOut, Settings2, MonitorSmartphone, BellRing, Key, Palette, Save, Server, CheckCircle2, XCircle, Loader2, RefreshCw, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function EnvironmentSettings() {
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState("profile");
  
  // States
  const [currency, setCurrency] = useState("USD");
  const [riskPerTrade, setRiskPerTrade] = useState("2.5");
  const [maxDailyLoss, setMaxDailyLoss] = useState("5.0");
  const [theme, setTheme] = useState("Deep Space (Default)");
  const [bridgeUrl, setBridgeUrl] = useState("/api/bridge");
  const [aiProvider, setAiProvider] = useState("openai");
  const [aiKey, setAiKey] = useState("");
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // Diagnostics state
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResults, setDiagResults] = useState<{
    bridge?: "ok" | "fail" | "pending";
    mt5?: "ok" | "fail" | "pending";
    account?: string;
    balance?: number;
    aiTest?: "ok" | "fail" | "pending" | "skipped";
    aiError?: string;
  }>({});

  const runDiagnostics = async () => {
    setDiagRunning(true);
    setDiagResults({});
    const bridge = localStorage.getItem("bridge_url") || "/api/bridge";
    const apiKey = localStorage.getItem("ai_key");
    const provider = localStorage.getItem("ai_provider") || "openai";
    const next: typeof diagResults = {};

    try {
      setDiagResults({ bridge: "pending" });
      const r = await fetch(`${bridge}/health`, { headers: { "ngrok-skip-browser-warning": "true" },  signal: AbortSignal.timeout(4000) });
      const d = await r.json();
      next.bridge = d.status === "running" ? "ok" : "fail";
      next.mt5 = d.connected ? "ok" : "fail";
      if (d.connected) {
        try {
          const ar = await fetch(`${bridge}/api/account`, { headers: { "ngrok-skip-browser-warning": "true" } });
          const acc = await ar.json();
          if (acc.success) {
            next.account = `Login #${acc.login} · ${acc.currency ?? "USD"}`;
            next.balance = acc.balance;
          }
        } catch {}  
      }
    } catch {
      next.bridge = "fail";
      next.mt5 = "fail";
    }

    if (!apiKey) {
      next.aiTest = "skipped";
    } else {
      try {
        const r2 = await fetch(`${bridge}/api/ai-analysis?symbol=XAUUSD&ai_key=${encodeURIComponent(apiKey)}&provider=${provider}`,
          { headers: { "ngrok-skip-browser-warning": "true" }, signal: AbortSignal.timeout(15000) }
        );
        const d2 = await r2.json();
        next.aiTest = d2.success ? "ok" : "fail";
        next.aiError = d2.error;
      } catch (e: any) {
        next.aiTest = "fail";
        next.aiError = e.message;
      }
    }

    setDiagResults(next);
    setDiagRunning(false);
  };

  useEffect(() => {
    const savedAi = localStorage.getItem("ai_key");
    if (savedAi) setAiKey(savedAi);
    const savedProv = localStorage.getItem("ai_provider");
    if (savedProv) setAiProvider(savedProv);
    const savedBridge = localStorage.getItem("bridge_url");
    if (savedBridge) setBridgeUrl(savedBridge);
  }, []);

  const handleSave = () => {
    localStorage.setItem("ai_key", aiKey);
    localStorage.setItem("ai_provider", aiProvider);
    if (bridgeUrl) {
      localStorage.setItem("bridge_url", bridgeUrl);
    }
    toast.success("Configuration committed successfully!");
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/auth");
  };

  const TABS = [
    { id: "profile", label: "Operator Profile", icon: User },
    { id: "environment", label: "Workspace & Theme", icon: Palette },
    { id: "risk", label: "Engine Limits", icon: ShieldAlert },
    { id: "api", label: "Bridge & Webhooks", icon: Server },
  ];

  return (
    <div className="min-h-screen w-full bg-[#05050a] text-text-primary px-4 md:px-6 py-4 flex flex-col gap-4 animate-fade-in pb-16">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111118]/80 p-4 border border-zinc-800/40 rounded-2xl backdrop-blur-xl mt-4">
        <div>
          <h1 className="text-lg font-black tracking-tight text-white font-display flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-emerald-450" />
            Environment Configuration
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-1 mt-0.5">
            <MonitorSmartphone className="w-3.5 h-3.5 text-zinc-450" /> Manage terminal preferences, limits, and backend bridge topology
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-450 text-emerald-950 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)] flex items-center gap-1.5 font-mono font-black">
            <Save className="w-4 h-4" /> Commit Changes
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mt-2">
        
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full lg:w-60 space-y-1.5 shrink-0 font-mono text-[11px] font-bold">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-2.5 px-3 py-3 rounded-lg transition-all border outline-none text-left"
                style={{
                  background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
                  borderColor: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                  color: isActive ? "#fff" : "#71717a"
                }}
              >
                <tab.icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-zinc-600"}`} />
                {tab.label}
              </button>
            );
          })}
          
          <div className="pt-4 mt-4 border-t border-zinc-800/40">
            <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-left">
              <LogOut className="w-3.5 h-3.5" /> Disconnect Session
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1">
          
          {/* PROFILE */}
          {activeTab === "profile" && (
            <div className="animate-fade-in">
              <div className="border border-zinc-800/40 rounded-xl p-6 bg-[#111118] shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300 mb-6 flex items-center gap-1.5 font-mono"><User className="w-4 h-4 text-zinc-500"/> Identity Credentials</h3>
                
                <div className="space-y-5 max-w-lg font-mono text-[11px]">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Operator Alias</label>
                    <input type="text" value={user?.name || "Ghost Protocol"} readOnly className="w-full bg-black/25 border border-zinc-800/50 rounded-lg px-3.5 py-2.5 text-zinc-400 outline-none cursor-not-allowed" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Registered Relay (Email)</label>
                    <input type="email" value={user?.email || "classified@op.com"} readOnly className="w-full bg-black/25 border border-zinc-800/50 rounded-lg px-3.5 py-2.5 text-zinc-400 outline-none cursor-not-allowed" />
                  </div>
                  <div className="flex flex-col gap-1.5 font-mono">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Base Computation Standard</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-[#111118] border border-zinc-800/60 rounded-lg px-3 py-2 text-zinc-300 outline-none focus:border-emerald-400 cursor-pointer">
                      <option value="USD" className="bg-zinc-950">United States Dollar (USD)</option>
                      <option value="EUR" className="bg-zinc-950">Euro (EUR)</option>
                      <option value="GBP" className="bg-zinc-950">British Pound (GBP)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WORKSPACE & THEME */}
          {activeTab === "environment" && (
            <div className="animate-fade-in">
              <div className="border border-zinc-800/40 rounded-xl p-6 bg-[#111118] shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300 mb-6 flex items-center gap-1.5 font-mono"><Palette className="w-4 h-4 text-zinc-500"/> Workspace Aesthetics</h3>
                
                <div className="space-y-6 max-w-lg font-mono">
                  <div>
                    <label className="block text-[9px] uppercase font-bold tracking-widest text-zinc-500 mb-3">Master UI Theme</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      {["Deep Space (Default)", "Cyberpunk Neon", "Midnight Ash", "Polar White (Locked)"].map(t => (
                        <div key={t} onClick={() => !t.includes("Locked") && setTheme(t)} className={`border rounded-lg p-3 cursor-pointer transition-all ${theme === t ? "border-emerald-500/30 bg-emerald-500/[0.02]" : "hover:bg-black/20 border-zinc-800/40"}`} style={{ opacity: t.includes("Locked") ? 0.4 : 1 }}>
                          <div className="w-3.5 h-3.5 rounded-full mb-3 shadow-inner" style={{ background: t.includes("Space") ? "#050505" : t.includes("Ash") ? "#1a1a1a" : t.includes("White") ? "#ffffff" : "#0f0814", border: "1px solid rgba(255,255,255,0.05)" }} />
                          <p className="font-bold text-zinc-200">{t}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-lg border border-zinc-800/50 bg-black/15 text-[11px]">
                    <div>
                      <p className="font-bold text-white">Automatic State Persistence</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Saves chart drawings and configurations dynamically.</p>
                    </div>
                    <div onClick={() => setAutoSaveEnabled(!autoSaveEnabled)} className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors relative ${autoSaveEnabled ? "bg-emerald-505 bg-emerald-500" : "bg-zinc-800"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${autoSaveEnabled ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ENGINE LIMITS */}
          {activeTab === "risk" && (
            <div className="animate-fade-in">
              <div className="border border-zinc-800/40 rounded-xl p-6 bg-[#111118] shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300 mb-6 flex items-center gap-1.5 font-mono"><ShieldAlert className="w-4 h-4 text-red-400"/> Hardware Rule Enforcements</h3>
                
                <div className="space-y-5 max-w-lg font-mono text-[11px]">
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="leading-relaxed">These limits establish hard borders for automated execution and module validation. Overruling requires operator pin.</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-550">Systematic Risk Per Trade (%)</label>
                    <input type="number" step="0.1" value={riskPerTrade} onChange={(e) => setRiskPerTrade(e.target.value)} className="w-full bg-black/25 border border-zinc-800/50 rounded-lg px-3.5 py-2 text-zinc-200 outline-none focus:border-emerald-400" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-550">Hard Stop: Maximum Daily Drawdown (%)</label>
                    <input type="number" step="0.1" value={maxDailyLoss} onChange={(e) => setMaxDailyLoss(e.target.value)} className="w-full bg-black/25 border border-zinc-800/50 rounded-lg px-3.5 py-2 text-red-400 outline-none focus:border-red-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API & BRIDGE */}
          {activeTab === "api" && (
            <div className="animate-fade-in">
              <div className="border border-zinc-800/40 rounded-xl p-6 bg-[#111118] shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300 mb-6 flex items-center gap-1.5 font-mono"><Server className="w-4 h-4 text-zinc-500"/> Topology & Bridge Routing</h3>
                
                <div className="space-y-5 max-w-xl font-mono">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-550">MT5 Bridge Target Address</label>
                    <div className="flex gap-2">
                       <input type="text" value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} className="flex-1 bg-black/25 border border-zinc-800/50 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-450" />
                       <button onClick={runDiagnostics} disabled={diagRunning} className="px-3.5 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50 hover:bg-emerald-500/10">
                         {diagRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                         {diagRunning ? "Testing..." : "Test Node"}
                       </button>
                    </div>
                  </div>

                  {/* DIAGNOSTICS RESULTS */}
                  {(diagRunning || Object.keys(diagResults).length > 0) && (
                    <div className="rounded-lg border border-zinc-850 p-4 space-y-2.5 mt-2 bg-black/15 text-[11px]">
                      <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-550 mb-2 flex items-center gap-1.5">
                        <RefreshCw className={`w-3 h-3 ${diagRunning ? "animate-spin" : ""}`} /> Live System Check
                      </p>
                      
                      {/* Bridge */}
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">MT5 Bridge</span>
                        <span className="flex items-center gap-1.5 font-bold">
                          {!diagResults.bridge ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" /> :
                           diagResults.bridge === "ok" ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Online</span></> :
                           <><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-red-400">Offline</span></>}
                        </span>
                      </div>

                      {/* MT5 Account */}
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">MT5 Account</span>
                        <span className="flex items-center gap-1.5 font-bold">
                          {!diagResults.mt5 ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" /> :
                           diagResults.mt5 === "ok" ? (
                             <span className="text-emerald-400 flex items-center gap-1">
                               <CheckCircle2 className="w-3.5 h-3.5" />
                               {diagResults.account ?? "Connected"} · ${diagResults.balance?.toFixed(2) ?? "0.00"}
                             </span>
                           ) : <><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-red-400">Disconnected</span></>}
                        </span>
                      </div>

                      {/* AI API Key */}
                      <div className="flex items-start justify-between">
                        <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider">AI API Key</span>
                        <span className="flex items-center gap-1.5 font-bold text-right max-w-[60%]">
                          {diagResults.aiTest === undefined ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" /> :
                           diagResults.aiTest === "skipped" ? <span className="text-zinc-550 font-normal">No key</span> :
                           diagResults.aiTest === "ok" ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Valid</span></> :
                           <span className="text-red-400 flex items-start gap-1"><XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{diagResults.aiError ?? "Invalid"}</span></span>}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-zinc-800/40 flex flex-col gap-1.5">
                     <h4 className="text-[11px] font-bold text-white mb-2">Internal Webhooks</h4>
                     <p className="text-[10px] text-zinc-500 leading-relaxed mb-2">Go to <span className="text-emerald-450">Alerts & Monitors</span> module to inject external destination URLs via the active console matrix.</p>
                     
                     <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-zinc-800 bg-black/15">
                       <Key className="w-4 h-4 text-zinc-600" />
                       <div>
                         <p className="text-[11px] font-bold text-white">API Key Provisioning</p>
                         <p className="text-[8px] font-mono text-zinc-650 mt-0.5">AUTH_TK_*** HIDDEN</p>
                       </div>
                       <button className="ml-auto text-[10px] font-bold text-emerald-405 uppercase tracking-wider">Rotate Key</button>
                     </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/40 space-y-4">
                     <h4 className="text-[11px] font-bold text-white">AI Engine Provider</h4>
                     <p className="text-[10px] text-zinc-500 leading-relaxed">Connect your OpenAI API key to power real-time NLP market reasoning across the entire dashboard.</p>
                     
                     <div className="space-y-4 text-[11px]">
                       <div className="flex flex-col gap-1.5">
                         <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-550">LLM Provider</label>
                         <select 
                           value={aiProvider} 
                           onChange={(e) => setAiProvider(e.target.value)}
                           className="w-full bg-[#111118] border border-zinc-800/60 rounded-lg px-3 py-2 text-zinc-300 outline-none focus:border-emerald-400 cursor-pointer"
                         >
                           <option value="openai" className="bg-zinc-950">OpenAI (GPT-3.5 / GPT-4)</option>
                           <option value="gemini" className="bg-zinc-950">Google Gemini (1.5 Pro)</option>
                           <option value="claude" className="bg-zinc-950">Anthropic Claude (Opus / Sonnet)</option>
                         </select>
                       </div>
                       <div className="flex flex-col gap-1.5">
                         <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-550">
                            {aiProvider === "openai" ? "OpenAI API Key" : aiProvider === "gemini" ? "Gemini API Key" : "Anthropic API Key"}
                         </label>
                         <input 
                           type="password" 
                           placeholder={aiProvider === "gemini" ? "AIza..." : "sk-..."} 
                           value={aiKey} 
                           onChange={(e) => setAiKey(e.target.value)} 
                           className="w-full bg-black/25 border border-zinc-800/50 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-800 outline-none focus:border-emerald-450" 
                         />
                       </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
