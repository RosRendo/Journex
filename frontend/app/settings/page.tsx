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

    // 1. Test bridge health
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

    // 2. Test AI API key
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
    <div className="max-w-[1200px] mx-auto space-y-6 pb-20">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight mb-1 flex items-center gap-3" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
            <Settings2 className="w-8 h-8 text-[--accent]" /> Environment Configuration
          </h1>
          <p className="text-[13px] font-medium flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <MonitorSmartphone className="w-3.5 h-3.5" /> Manage terminal preferences, limits, and backend bridge topology
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="px-5 py-2.5 rounded-xl font-bold text-[12px] uppercase tracking-wider text-black flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,212,161,0.2)] hover:shadow-[0_0_25px_rgba(0,212,161,0.4)]" style={{ background: "var(--accent)" }}>
            <Save className="w-4 h-4" /> Commit Changes
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* SIDEBAR NAVIGATION */}
        <div className="w-full lg:w-64 space-y-2 shrink-0">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-[13px] transition-all border outline-none"
                style={{
                  background: isActive ? "var(--bg-elevated)" : "transparent",
                  borderColor: isActive ? "var(--border-strong)" : "transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)"
                }}
              >
                <tab.icon className={`w-4 h-4 ${isActive ? "text-[--accent]" : "text-[--text-tertiary]"}`} />
                {tab.label}
              </button>
            );
          })}
          
          <div className="pt-8 mt-8 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[13px] text-[--loss] hover:bg-[--loss]/10 transition-colors">
              <LogOut className="w-4 h-4" /> Disconnect Session
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 space-y-6">
          
          {/* PROFILE */}
          {activeTab === "profile" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="border rounded-2xl p-8" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <h3 className="text-[18px] font-bold text-[--text-primary] mb-6 flex items-center gap-2"><User className="w-5 h-5 text-[--text-tertiary]"/> Identity Credentials</h3>
                
                <div className="space-y-6 max-w-lg">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-2">Operator Alias</label>
                    <input type="text" value={user?.name || "Ghost Protocol"} readOnly className="w-full bg-[--bg-base] border rounded-xl px-4 py-3 text-[14px] font-bold text-[--text-secondary] outline-none" style={{ borderColor: "var(--border)", cursor: "not-allowed" }} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-2">Registered Relay (Email)</label>
                    <input type="email" value={user?.email || "classified@op.com"} readOnly className="w-full bg-[--bg-base] border rounded-xl px-4 py-3 text-[14px] font-mono text-[--text-secondary] outline-none" style={{ borderColor: "var(--border)", cursor: "not-allowed" }} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-2">Base Computation Standard</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-[--bg-elevated] border rounded-xl px-4 py-3 text-[14px] font-bold text-[--text-primary] outline-none focus:border-[--accent]" style={{ borderColor: "var(--border)" }}>
                      <option value="USD">United States Dollar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                      <option value="GBP">British Pound (GBP)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WORKSPACE & THEME */}
          {activeTab === "environment" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="border rounded-2xl p-8" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <h3 className="text-[18px] font-bold text-[--text-primary] mb-6 flex items-center gap-2"><Palette className="w-5 h-5 text-[--text-tertiary]"/> Workspace Aesthetics</h3>
                
                <div className="space-y-8 max-w-lg">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-3">Master UI Theme</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {["Deep Space (Default)", "Cyberpunk Neon", "Midnight Ash", "Polar White (Locked)"].map(t => (
                        <div key={t} onClick={() => !t.includes("Locked") && setTheme(t)} className={`border rounded-xl p-4 cursor-pointer transition-all ${theme === t ? "border-[--accent] bg-[--accent]/5" : "hover:bg-[--bg-elevated]"}`} style={{ borderColor: theme === t ? "var(--accent)" : "var(--border)", opacity: t.includes("Locked") ? 0.4 : 1 }}>
                          <div className="w-4 h-4 rounded-full mb-3 shadow-inner" style={{ background: t.includes("Space") ? "#050505" : t.includes("Ash") ? "#1a1a1a" : t.includes("White") ? "#ffffff" : "#0f0814", border: "1px solid var(--border-strong)" }} />
                          <p className="text-[12px] font-bold text-[--text-primary]">{t}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}>
                    <div>
                      <p className="text-[13px] font-bold text-[--text-primary]">Automatic State Persistence</p>
                      <p className="text-[11px] text-[--text-secondary] mt-0.5">Saves chart drawings and configurations dynamically.</p>
                    </div>
                    <div onClick={() => setAutoSaveEnabled(!autoSaveEnabled)} className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors relative ${autoSaveEnabled ? "bg-[--accent]" : "bg-[--border-strong]"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${autoSaveEnabled ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ENGINE LIMITS */}
          {activeTab === "risk" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="border rounded-2xl p-8" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <h3 className="text-[18px] font-bold text-[--text-primary] mb-6 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-[--warning]"/> Hardware Rule Enforcements</h3>
                
                <div className="space-y-6 max-w-lg">
                  <div className="p-4 rounded-xl bg-[--warning]/10 border border-[--warning]/30 text-[--warning] text-[12px] font-medium flex items-start gap-3">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>These limits establish hard borders for automated execution and module validation. Overruling requires operator pin.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-2">Systematic Risk Per Trade (%)</label>
                    <input type="number" step="0.1" value={riskPerTrade} onChange={(e) => setRiskPerTrade(e.target.value)} className="w-full bg-[--bg-base] border rounded-xl px-4 py-3 text-[14px] font-mono font-bold text-[--text-primary] outline-none focus:border-[--accent]" style={{ borderColor: "var(--border)" }} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-2">Hard Stop: Maximum Daily Drawdown (%)</label>
                    <input type="number" step="0.1" value={maxDailyLoss} onChange={(e) => setMaxDailyLoss(e.target.value)} className="w-full bg-[--bg-base] border rounded-xl px-4 py-3 text-[14px] font-mono font-bold text-[--loss] outline-none focus:border-[--loss]" style={{ borderColor: "var(--border)" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API & BRIDGE */}
          {activeTab === "api" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="border rounded-2xl p-8" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <h3 className="text-[18px] font-bold text-[--text-primary] mb-6 flex items-center gap-2"><Server className="w-5 h-5 text-[--text-tertiary]"/> Topology & Bridge Routing</h3>
                
                <div className="space-y-6 max-w-xl">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-2">MT5 Bridge Target Address</label>
                    <div className="flex gap-2">
                       <input type="text" value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} className="flex-1 bg-[--bg-base] border rounded-xl px-4 py-3 text-[13px] font-mono font-bold text-[--text-primary] outline-none focus:border-[--accent]" style={{ borderColor: "var(--border)" }} />
                       <button onClick={runDiagnostics} disabled={diagRunning} className="px-4 py-2 rounded-xl border font-bold text-[12px] uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50" style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent)/5" }}>
                         {diagRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                         {diagRunning ? "Testing..." : "Run Diagnostics"}
                       </button>
                    </div>
                  </div>

                  {/* DIAGNOSTICS RESULTS */}
                  {(diagRunning || Object.keys(diagResults).length > 0) && (
                    <div className="rounded-2xl border p-5 space-y-3 mt-2" style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-3 flex items-center gap-2">
                        <RefreshCw className={`w-3 h-3 ${diagRunning ? "animate-spin" : ""}`} /> Live System Check
                      </p>
                      
                      {/* Bridge */}
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="font-medium text-[--text-secondary]">MT5 Bridge</span>
                        <span className="flex items-center gap-1.5 font-bold">
                          {!diagResults.bridge ? <Loader2 className="w-4 h-4 animate-spin text-[--text-tertiary]" /> :
                           diagResults.bridge === "ok" ? <><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Online</span></> :
                           <><XCircle className="w-4 h-4 text-red-400" /><span className="text-red-400">Offline</span></>}
                        </span>
                      </div>

                      {/* MT5 Account */}
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="font-medium text-[--text-secondary]">MT5 Account</span>
                        <span className="flex items-center gap-1.5 font-bold">
                          {!diagResults.mt5 ? <Loader2 className="w-4 h-4 animate-spin text-[--text-tertiary]" /> :
                           diagResults.mt5 === "ok" ? (
                             <span className="text-emerald-400 flex items-center gap-1.5">
                               <CheckCircle2 className="w-4 h-4" />
                               {diagResults.account ?? "Connected"} · ${diagResults.balance?.toFixed(2) ?? "0.00"}
                             </span>
                           ) : <><XCircle className="w-4 h-4 text-red-400" /><span className="text-red-400">No Account. Open MT5 and log in.</span></>}
                        </span>
                      </div>

                      {/* AI API Key */}
                      <div className="flex items-start justify-between text-[13px]">
                        <span className="font-medium text-[--text-secondary]">AI API Key</span>
                        <span className="flex items-center gap-1.5 font-bold text-right max-w-[60%]">
                          {diagResults.aiTest === undefined ? <Loader2 className="w-4 h-4 animate-spin text-[--text-tertiary]" /> :
                           diagResults.aiTest === "skipped" ? <span className="text-[--text-tertiary] font-normal">No key — enter one to test</span> :
                           diagResults.aiTest === "ok" ? <><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Valid — AI bullets active</span></> :
                           <span className="text-red-400 flex items-start gap-1.5"><XCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{diagResults.aiError ?? "Invalid key"}</span></span>}
                        </span>
                      </div>
                    </div>
                  )}


                  <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                     <h4 className="text-[13px] font-bold text-[--text-primary] mb-4">Internal Webhooks</h4>
                     <p className="text-[12px] text-[--text-secondary] mb-4">Go to <span className="text-[--accent]">Alerts & Monitors</span> module to inject external destination URLs via the active console matrix.</p>
                     
                     <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed" style={{ borderColor: "var(--border-strong)" }}>
                       <Key className="w-5 h-5 text-[--text-tertiary]" />
                       <div>
                         <p className="text-[12px] font-bold text-[--text-primary]">API Key Provisioning</p>
                         <p className="text-[10px] font-mono text-[--text-tertiary] mt-0.5">AUTH_TK_*** HIDDEN</p>
                       </div>
                       <button className="ml-auto text-[11px] font-bold text-[--accent] uppercase tracking-wider">Rotate Key</button>
                     </div>
                  </div>

                  <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                     <h4 className="text-[13px] font-bold text-[--text-primary] mb-4">AI Engine Provider</h4>
                     <p className="text-[12px] text-[--text-secondary] mb-4">Connect your OpenAI API key to power real-time NLP market reasoning across the entire dashboard.</p>
                     
                     <div className="space-y-4">
                       <div>
                         <label className="block text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-2">LLM Provider</label>
                         <select 
                           value={aiProvider} 
                           onChange={(e) => setAiProvider(e.target.value)}
                           className="w-full bg-[--bg-base] border rounded-xl px-4 py-3 text-[13px] font-bold text-[--text-primary] outline-none focus:border-[--accent]"
                           style={{ borderColor: "var(--border)" }}
                         >
                           <option value="openai">OpenAI (GPT-3.5 / GPT-4)</option>
                           <option value="gemini">Google Gemini (1.5 Pro)</option>
                           <option value="claude">Anthropic Claude (Opus / Sonnet)</option>
                         </select>
                       </div>
                       <div>
                         <label className="block text-[10px] uppercase font-bold tracking-widest text-[--text-tertiary] mb-2">
                            {aiProvider === "openai" ? "OpenAI API Key" : aiProvider === "gemini" ? "Gemini API Key" : "Anthropic API Key"}
                         </label>
                         <input 
                           type="password" 
                           placeholder={aiProvider === "gemini" ? "AIza..." : "sk-..."} 
                           value={aiKey} 
                           onChange={(e) => setAiKey(e.target.value)} 
                           className="w-full bg-[--bg-base] border rounded-xl px-4 py-3 text-[13px] font-mono text-[--text-primary] outline-none focus:border-[--accent]" 
                           style={{ borderColor: "var(--border)" }} 
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
