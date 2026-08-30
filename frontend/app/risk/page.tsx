"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, DollarSign, TrendingDown, TrendingUp, AlertCircle,
  CheckCircle2, Loader2, ChevronDown, Activity, Target, Zap, ShieldAlert,
  ShieldCheck, Award, Flame, CheckCircle, Shield, Brain, Layers, Briefcase
} from "lucide-react";
import { toast } from "sonner";
import { getBackendUrl } from "@/lib/utils";
import { getSession } from "@/lib/useSession";

// Widget Imports
import { DrawdownVisualization } from "@/components/dashboard/widgets/DrawdownVisualization";
import { VisualPositionSizer } from "@/components/widgets/VisualPositionSizer";
import PreTradeChecklist from "@/components/validation/PreTradeChecklist";
import TradingPlanEnforcer from "@/components/validation/TradingPlanEnforcer";
import SetupQualityScorer from "@/components/validation/SetupQualityScorer";
import EmotionalStateChecker from "@/components/validation/EmotionalStateChecker";
import RiskLimitGuard from "@/components/validation/RiskLimitGuard";

// --- PAIR SYMBOLS ---
const SYMBOLS = ["XAUUSD","EURUSD","GBPUSD","USDJPY","GBPJPY","AUDUSD","USDCAD","USDCHF","USOIL","US100","US30","BTCUSD"];

const MT5_API = process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge";

export default function RiskDeskPage() {
  const [activeTab, setActiveTab] = useState<"calculator" | "drawdown" | "compliance" | "validation">("calculator");

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col pb-12 font-sans">
      
      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-20 bg-[#09090b]">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#f4f4f5]">Risk & Compliance Desk</h1>
          <p className="text-[9px] font-bold uppercase tracking-widest font-mono text-[#71717a] mt-0.5">Position sizing · Drawdown · Prop rules · Validation</p>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-0 border-l border-[rgba(255,255,255,0.07)]">
          <button
            onClick={() => setActiveTab("calculator")}
            className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap ${
              activeTab === "calculator" ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            Calculator
          </button>
          <button
            onClick={() => setActiveTab("drawdown")}
            className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap ${
              activeTab === "drawdown" ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            Drawdown
          </button>
          <button
            onClick={() => setActiveTab("compliance")}
            className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap ${
              activeTab === "compliance" ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            Compliance
          </button>
          <button
            onClick={() => setActiveTab("validation")}
            className={`py-3 px-4 text-[9px] uppercase tracking-widest font-bold font-mono transition-all border-b-2 whitespace-nowrap ${
              activeTab === "validation" ? "border-[#20e0b2] text-[#20e0b2]" : "border-transparent text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            Validation Hub
          </button>
        </div>
      </div>

      {/* ── WORKSPACE ── */}
      <div className="flex-1 w-full">
        {activeTab === "calculator" && <CalculatorSubDesk />}
        {activeTab === "drawdown" && <DrawdownGuardDesk />}
        {activeTab === "compliance" && <PropComplianceDesk />}
        {activeTab === "validation" && <ValidationDesk />}
      </div>
    </div>
  );
}

// ── SUB-COMPONENT 1: CALCULATOR DESK ──
type InputKeys = "balance" | "leverage" | "riskPercent" | "stopLossPips" | "pipValue" | "sl" | "tp" | "rewardRatio";
type Inputs = Record<InputKeys, number>;

const defaultInput: Inputs = { balance: 6000, leverage: 30, riskPercent: 1, stopLossPips: 50, pipValue: 10, sl: 0, tp: 0, rewardRatio: 2 };

function FieldInput({ label, value, onChange, suffix, highlighted = "none" }: {
  label: string; value: number; onChange: (v: string) => void;
  suffix?: string; highlighted?: "bull" | "bear" | "none";
}) {
  const [isFocused, setIsFocused] = useState(false);
  const borderColor = highlighted === "bull" ? "rgba(49,170,143,0.2)" : highlighted === "bear" ? "rgba(255,77,77,0.2)" : "rgba(255, 255, 255, 0.05)";
  const glowColor = highlighted === "bull" ? "rgba(49,170,143,0.15)" : highlighted === "bear" ? "rgba(255,77,77,0.15)" : "rgba(255, 255, 255, 0.05)";

  return (
    <div className="relative group font-mono">
      <label className="block text-[9px] font-bold uppercase tracking-widest mb-1.5 transition-colors duration-300 text-zinc-500">
        {label}
      </label>
      <div className="relative">
        <input
          type="number" inputMode="decimal" value={value || ""}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg px-3.5 py-2.5 text-xs font-bold outline-none transition-all duration-300 bg-black/25 text-white border border-[rgba(255,255,255,0.07)] focus:border-[#20e0b2]"
          style={{ 
            boxShadow: isFocused ? `0 0 15px ${glowColor}` : "none"
          }}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-50 text-zinc-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function CalculatorSubDesk() {
  const [input, setInput] = useState<Inputs>(defaultInput);
  const [symbol, setSymbol] = useState("XAUUSD");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [executing, setExecuting] = useState(false);
  const [mt5Connected, setMt5Connected] = useState<boolean | null>(null);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [livePrice, setLivePrice] = useState<{ ask: number; bid: number; pip_size: number; digits: number } | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [autoRrEnabled, setAutoRrEnabled] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"calculate" | "table">("calculate");

  const { balance, leverage, riskPercent, stopLossPips, pipValue, sl, tp, rewardRatio } = input;
  const riskAmount = (riskPercent / 100) * balance;
  const lotSize = stopLossPips * pipValue === 0 ? 0 : riskAmount / (stopLossPips * pipValue);
  const marginRequired = leverage === 0 ? 0 : 100000 / leverage;
  const targetProfit = riskAmount * rewardRatio;

  const handleChange = (key: InputKeys, value: string) => {
    const n = parseFloat(value);
    setInput((prev) => ({ ...prev, [key]: isNaN(n) ? 0 : n }));
  };

  const getHeaders = async () => {
    const session = await getSession();
    const token = (session?.user as any)?.apiToken;
    const headers: Record<string, string> = {
      "ngrok-skip-browser-warning": "true",
      "Content-Type": "application/json"
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const checkConnection = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${getBackendUrl()}/api/bridge/api/calculations`, { headers, signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      if (data.error) { 
        setMt5Connected(false); 
        return; 
      }
      setMt5Connected(true);
      if (data.account_balance > 0) {
        setAccountBalance(data.account_balance);
        setInput((prev) => ({ ...prev, balance: Math.round(data.account_balance) }));
      }
    } catch (err) {
      setMt5Connected(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const fetchLivePrice = useCallback(async () => {
    if (mt5Connected === false) return;
    setFetchingPrice(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${getBackendUrl()}/api/bridge/api/symbol-price?symbol=${symbol}`, { headers });
      const data = await res.json();
      if (data.success) setLivePrice(data);
    } catch { } finally { setFetchingPrice(false); }
  }, [symbol, mt5Connected]);

  useEffect(() => { 
    fetchLivePrice(); 
  }, [fetchLivePrice, symbol]);

  useEffect(() => {
    if (!autoRrEnabled || !livePrice || stopLossPips <= 0) return;
    const entryPrice = direction === "BUY" ? livePrice.ask : livePrice.bid;
    const slDist = stopLossPips * livePrice.pip_size;
    const tpDist = stopLossPips * rewardRatio * livePrice.pip_size;
    const factor = Math.pow(10, livePrice.digits);
    const newSl = Math.round((direction === "BUY" ? entryPrice - slDist : entryPrice + slDist) * factor) / factor;
    const newTp = Math.round((direction === "BUY" ? entryPrice + tpDist : entryPrice - tpDist) * factor) / factor;
    setInput((prev) => ({ ...prev, sl: newSl, tp: newTp }));
  }, [autoRrEnabled, livePrice, direction, stopLossPips, rewardRatio]);

  const executeTrade = async () => {
    if (lotSize <= 0) { toast.error("Lot size is 0 — check your inputs"); return; }
    if (sl <= 0 || tp <= 0) { toast.error("Please enter SL and TP prices before executing"); return; }
    setExecuting(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${getBackendUrl()}/api/bridge/api/execute-trade`, {
        method: "POST", 
        headers,
        body: JSON.stringify({ 
          symbol, 
          direction, 
          lot_size: parseFloat(lotSize.toFixed(4)), 
          sl, 
          tp,
          comment: `Journex ${riskPercent}% Risk | 1:${rewardRatio} RR` 
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`✅ Trade executed! Ticket #${data.ticket} | ${direction} ${data.lot_size} ${symbol} @ ${data.price}`, { duration: 8000 });
      } else { 
        toast.error(`❌ ${data.error}`, { duration: 7000 }); 
      }
    } catch { 
      toast.error("Network error — is the MT5 bridge running?"); 
    } finally { 
      setExecuting(false); 
    }
  };

  const riskTableRows = [0.5, 1, 1.5, 2, 3].map((pct) => {
    const risk = (pct / 100) * balance;
    return { pct, risk, r1: risk * 1, r2: risk * 2, r3: risk * 3, lots: stopLossPips * pipValue === 0 ? 0 : risk / (stopLossPips * pipValue) };
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* MT5 Status Alerts */}
      {mt5Connected === false && (
        <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-[9px] font-bold bg-[#ff5c73]/10 border border-[#ff5c73]/25 text-[#ff5c73] font-mono uppercase tracking-wider">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>MT5 bridge link is inactive. Trade execution disabled. Run:</span>
          <code className="font-mono bg-black/35 border border-white/10 px-2 py-0.5 rounded text-white text-[9px] lowercase">python mt5_bridge.py</code>
        </div>
      )}
      {mt5Connected === true && accountBalance !== null && (
        <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-[9px] font-bold bg-[#20e0b2]/10 border border-[#20e0b2]/20 text-[#20e0b2] font-mono uppercase tracking-wider">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>MT5 link active. Live balance: <strong className="font-mono text-white text-xs">${accountBalance.toLocaleString()}</strong> synchronized</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex justify-between items-center bg-[#101014] p-3 border border-zinc-850 rounded-xl">
        <div className="flex gap-1.5 font-mono text-[9px] font-bold uppercase tracking-wider">
          {([["calculate", "Lot Calculator"], ["table", "Risk Matrix"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveSubTab(id)}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeSubTab === id ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-350"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchLivePrice}
          disabled={fetchingPrice || !mt5Connected}
          className="px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.07)] bg-white/5 text-zinc-300 font-mono font-bold text-[9px] uppercase tracking-wider hover:bg-white/10 flex items-center gap-1.5 cursor-pointer"
        >
          <Activity className={`w-3.5 h-3.5 ${fetchingPrice ? "animate-pulse text-[#20e0b2]" : "text-zinc-500"}`} />
          Refresh Price
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === "calculate" ? (
          <motion.div 
            key="calc"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          >
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-lg p-5 md:p-6 space-y-6 bg-[#101014] border border-zinc-850">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-4 font-mono text-[9px] font-bold">
                  <span className="text-zinc-550 uppercase tracking-widest flex items-center gap-1.5">
                    <Calculator size={13} className="text-[#20e0b2]" /> Parameters Control
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-500 hover:text-zinc-350">
                    <input 
                      type="checkbox" 
                      checked={autoRrEnabled} 
                      onChange={(e) => setAutoRrEnabled(e.target.checked)}
                      className="rounded border-[rgba(255,255,255,0.07)] text-[#20e0b2] bg-black/45 w-3.5 h-3.5 cursor-pointer" 
                    />
                    <span>Auto SL/TP Limits</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldInput label="Account Balance" value={balance} onChange={(v) => handleChange("balance", v)} suffix="$" />
                  <FieldInput label="Risk Exposure %" value={riskPercent} onChange={(v) => handleChange("riskPercent", v)} suffix="%" />
                  <FieldInput label="Stop Loss (Pips)" value={stopLossPips} onChange={(v) => handleChange("stopLossPips", v)} suffix="Pips" highlighted="bear" />
                  <FieldInput label="Target Reward Ratio" value={rewardRatio} onChange={(v) => handleChange("rewardRatio", v)} suffix="R" highlighted="bull" />
                  <FieldInput label="Pip Value (standard lot)" value={pipValue} onChange={(v) => handleChange("pipValue", v)} suffix="$" />
                  <FieldInput label="Leverage Scale" value={leverage} onChange={(v) => handleChange("leverage", v)} suffix="x" />
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-lg p-5 md:p-6 space-y-4 bg-[#101014] border border-zinc-850">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-550 flex items-center gap-1.5 border-b border-zinc-850 pb-4 font-mono">
                   <Target size={13} className="text-[#20e0b2]" /> Target Distribution
                </span>
                
                <div className="space-y-3 pt-1 font-mono text-[11px]">
                  <div className="flex justify-between items-end">
                    <span className="text-zinc-500">Total Capital Risked</span>
                    <span className="font-bold text-[#ff5c73]">-${riskAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-zinc-500">Target Protocol Yield</span>
                    <span className="font-bold text-[#20e0b2]">+${targetProfit.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between items-end pt-3 border-t border-zinc-850">
                    <span className="text-[9px] font-black uppercase text-[#20e0b2]">Lot Sizing</span>
                    <span className="text-2xl font-black text-white leading-none">{lotSize.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-5 md:p-6 bg-[#101014] border border-zinc-850 font-mono text-[10px] space-y-4">
                <div className="relative w-full">
                  <select
                    value={symbol} onChange={(e) => setSymbol(e.target.value)}
                    className="w-full appearance-none rounded-lg px-3 py-2.5 text-xs font-bold outline-none bg-black/25 border border-[rgba(255,255,255,0.07)] text-white cursor-pointer"
                  >
                    {SYMBOLS.map((s) => <option key={s} value={s} className="bg-zinc-950">{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 text-white pointer-events-none" />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setDirection("SELL")} className={`flex-1 py-2 rounded-lg font-black text-xs uppercase tracking-wider border ${direction === "SELL" ? "bg-[#ff5c73] text-white border-transparent" : "bg-[#ff5c73]/10 text-[#ff5c73] border-[#ff5c73]/20"}`}>SELL</button>
                  <button onClick={() => setDirection("BUY")} className={`flex-1 py-2 rounded-lg font-black text-xs uppercase tracking-wider border ${direction === "BUY" ? "bg-[#20e0b2] text-[#101014] border-transparent" : "bg-[#20e0b2]/10 text-[#20e0b2] border-[#20e0b2]/20"}`}>BUY</button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FieldInput label="SL Price Target" value={sl} onChange={(v) => handleChange("sl", v)} highlighted="bear" />
                  <FieldInput label="TP Price Target" value={tp} onChange={(v) => handleChange("tp", v)} highlighted="bull" />
                </div>

                <button
                  onClick={executeTrade} 
                  disabled={executing || !mt5Connected || lotSize <= 0}
                  className="w-full flex items-center justify-center gap-1.5 py-3 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-30 bg-white text-black cursor-pointer"
                >
                  {executing ? <Loader2 className="animate-spin w-4 h-4" /> : <><Zap size={13} /> Deploy Execution ({lotSize.toFixed(2)} Lots)</>}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="table"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-lg overflow-hidden bg-[#101014] border border-[rgba(255,255,255,0.07)]"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] whitespace-nowrap font-mono">
                <thead>
                  <tr className="bg-black/25 border-b border-zinc-850 text-[9px] uppercase font-bold tracking-wider text-zinc-500">
                    <th className="px-5 py-4 font-bold">Risk Exposure</th>
                    <th className="px-5 py-4 font-bold text-right text-[#ff5c73]">Risk ($)</th>
                    <th className="px-5 py-4 font-bold text-right text-[#20e0b2]">Lot Sizing</th>
                    <th className="px-5 py-4 font-bold text-right text-zinc-550">1.0R Reward</th>
                    <th className="px-5 py-4 font-bold text-right text-zinc-400">2.0R Reward</th>
                    <th className="px-5 py-4 font-bold text-right text-white">3.0R Reward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/40">
                  {riskTableRows.map((r) => (
                    <tr key={r.pct} className="transition-colors hover:bg-white/[0.01]">
                      <td className="px-5 py-3.5 font-bold text-white">{r.pct}%</td>
                      <td className="px-5 py-3.5 text-right text-[#ff5c73]">${r.risk.toFixed(0)}</td>
                      <td className="px-5 py-3.5 text-right font-black text-xs text-[#20e0b2]">{r.lots.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right text-zinc-500">${r.r1.toFixed(0)}</td>
                      <td className="px-5 py-3.5 text-right text-zinc-400">${r.r2.toFixed(0)}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-white">${r.r3.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── SUB-COMPONENT 2: DRAWDOWN GUARD DESK ──
function DrawdownGuardDesk() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="w-4 h-4 text-[#ff5c73]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-white font-display">Portfolio Asset Exposure</h2>
          </div>
          <div className="space-y-5 font-mono text-[11px]">
            <div>
              <div className="flex justify-between font-bold mb-1.5">
                <span className="text-yellow-500">Gold (#XAU)</span>
                <span className="text-white">34%</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/35 overflow-hidden">
                <div className="h-full bg-yellow-500 w-[34%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-bold mb-1.5">
                <span className="text-blue-400">USD Pairs</span>
                <span className="text-white">21%</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/35 overflow-hidden">
                <div className="h-full bg-blue-400 w-[21%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-bold mb-1.5">
                <span className="text-[#20e0b2]">GBP Pairs</span>
                <span className="text-white">18%</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/35 overflow-hidden">
                <div className="h-full bg-[#20e0b2] w-[18%]" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg p-5 flex flex-col gap-3 font-mono text-[10px]">
          <div className="p-3 rounded-lg border border-[#20e0b2]/20 bg-[#20e0b2]/5">
            <h3 className="text-[8px] font-bold text-zinc-550 uppercase tracking-widest mb-1">Correlation Risk</h3>
            <p className="text-base font-black text-[#20e0b2]">LOW EXPOSURE</p>
          </div>
          <div className="p-3 rounded-lg border border-zinc-850 bg-black/10">
            <h3 className="text-[8px] font-bold text-zinc-555 uppercase tracking-widest mb-1">AI Recommendation</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">Avoid Gold exposure to stay aligned with daily targets.</p>
          </div>
        </div>
      </div>

      <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-lg p-6 relative overflow-hidden">
        <h2 className="text-xs font-black uppercase tracking-wider text-white mb-4">Drawdown Heatmaps</h2>
        <DrawdownVisualization trades={[]} />
      </div>
    </div>
  );
}

// ── SUB-COMPONENT 3: COMPLIANCE & TARGETS DESK ──
const DEFAULT_ACCOUNT = {
  id: "WAITING-ACCOUNT",
  size: 100000,
  balance: 100000,
  equity: 100000,
  daily_start_balance: 100000,
  max_daily_loss_pct: 5,
  max_overall_loss_pct: 10,
  profit_target_pct: 10,
  days_traded: 0,
  min_days: 0,
};

function PropComplianceDesk() {
  const [accountSizesInput, setAccountSizesInput] = useState<string>("10000, 25000, 50000, 100000, 200000");
  const [risk, setRisk] = useState<string>("0.5");
  const [phase1Target, setPhase1Target] = useState<string>("8");
  const [phase2Target, setPhase2Target] = useState<string>("5");
  const [rows, setRows] = useState<any[] | null>(null);
  
  const [acc, setAcc] = useState(DEFAULT_ACCOUNT);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const res = await fetch(`${MT5_API}/api/account`, { headers: { "ngrok-skip-browser-warning": "true" } });
        if (!res.ok) throw new Error("Offline");
        const data = await res.json();
        
        if (data.login) {
          setAcc({
            id: `MT5-${data.login}`,
            size: data.balance > 0 ? (Math.ceil(data.balance / 10000) * 10000) : 100000,
            balance: data.balance,
            equity: data.equity,
            daily_start_balance: data.balance,
            max_daily_loss_pct: 5,
            max_overall_loss_pct: 10,
            profit_target_pct: 10,
            days_traded: 0,
            min_days: 0
          });
        }
      } catch (e) {}
    };
    fetchAccount();
    const t = setInterval(fetchAccount, 5000);
    return () => clearInterval(t);
  }, []);

  const targetProfitAmount = acc.size * (acc.profit_target_pct / 100);
  const currentProfit = acc.equity - acc.size;
  const profitProgress = Math.max(0, Math.min(100, (currentProfit / targetProfitAmount) * 100));

  const maxDailyLossAmount = acc.daily_start_balance * (acc.max_daily_loss_pct / 100);
  const currentDailyLoss = Math.max(0, acc.daily_start_balance - acc.equity);
  const dailyLossProgress = Math.max(0, Math.min(100, (currentDailyLoss / maxDailyLossAmount) * 100));

  const maxOverallLossAmount = acc.size * (acc.max_overall_loss_pct / 100);
  const currentOverallLoss = Math.max(0, acc.size - acc.equity);
  const overallLossProgress = Math.max(0, Math.min(100, (currentOverallLoss / maxOverallLossAmount) * 100));

  const calculateTable = () => {
    const accounts = accountSizesInput.split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n) && n > 0);
    const r = parseFloat(risk) / 100;
    const p1 = parseFloat(phase1Target) / 100;
    const p2 = parseFloat(phase2Target) / 100;
    if (accounts.length === 0 || isNaN(r) || isNaN(p1) || isNaN(p2)) return;

    setRows(accounts.map((account) => ({
      accountSize: account, riskAmount: account * r, tradesPhase1: Math.floor(p1 / r), gainPhase1: account * p1, tradesPhase2: Math.floor(p2 / r), gainPhase2: account * p2,
    })));
  };

  useEffect(() => { calculateTable(); }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
      <div className="border border-[rgba(255,255,255,0.07)] bg-[#101014] rounded-lg flex flex-col overflow-hidden">
        <div className="p-5 border-b border-zinc-850 bg-black/10 flex justify-between items-start font-mono">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Active Challenge</h2>
            <div className="text-sm font-bold text-white mt-1 flex items-center gap-2">
              {acc.id} <span className="text-[9px] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.07)] bg-black/25">PHASE 1</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-550 block">Live Equity</span>
            <span className="text-lg font-black font-mono text-[#20e0b2]">{`$${acc.equity.toLocaleString()}`}</span>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1">
          <div>
            <div className="flex justify-between items-end mb-1 font-mono text-xs">
              <h3 className="font-bold text-zinc-400">Profit Target ({acc.profit_target_pct}%)</h3>
              <span className="text-[#20e0b2] font-bold">${currentProfit.toFixed(0)} / ${targetProfitAmount.toFixed(0)}</span>
            </div>
            <div className="h-1.5 w-full bg-black/35 rounded-full overflow-hidden border border-zinc-850">
              <div className="h-full bg-[#20e0b2] rounded-full" style={{ width: `${profitProgress}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1 font-mono text-xs">
              <h3 className="font-bold text-zinc-400">Daily Loss Limit ({acc.max_daily_loss_pct}%)</h3>
              <span className="text-white font-bold">${currentDailyLoss.toFixed(0)} / ${maxDailyLossAmount.toFixed(0)}</span>
            </div>
            <div className="h-1.5 w-full bg-black/35 rounded-full overflow-hidden border border-zinc-850">
              <div className="h-full bg-[#ff5c73] rounded-full" style={{ width: `${dailyLossProgress}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1 font-mono text-xs">
              <h3 className="font-bold text-zinc-400">Max Overall Loss ({acc.max_overall_loss_pct}%)</h3>
              <span className="text-white font-bold">${currentOverallLoss.toFixed(0)} / ${maxOverallLossAmount.toFixed(0)}</span>
            </div>
            <div className="h-1.5 w-full bg-black/35 rounded-full overflow-hidden border border-zinc-850">
              <div className="h-full bg-[#ff5c73] rounded-full" style={{ width: `${overallLossProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="border border-[rgba(255,255,255,0.07)] bg-[#101014] rounded-lg flex flex-col overflow-hidden">
        <div className="p-5 border-b border-zinc-850 bg-black/10">
          <h2 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-[#20e0b2]" /> Challenge Matrix Forge
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[9px] uppercase font-bold text-zinc-550 tracking-wider mb-1.5 font-mono">Account Scale Sizes (CSV)</label>
            <input type="text" value={accountSizesInput} onChange={e => setAccountSizesInput(e.target.value)} className="w-full bg-black/20 border border-[rgba(255,255,255,0.07)] text-xs font-mono text-white rounded-lg px-3 py-2 outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-3 font-mono text-[9px]">
            <div>
              <label className="block uppercase font-bold text-zinc-500 tracking-wider mb-1">Risk (%)</label>
              <input type="number" step="0.1" value={risk} onChange={e => setRisk(e.target.value)} className="w-full bg-black/20 border border-[rgba(255,255,255,0.07)] rounded-lg p-2 text-xs font-bold text-white" />
            </div>
            <div>
              <label className="block uppercase font-bold text-zinc-500 tracking-wider mb-1">P1 Target (%)</label>
              <input type="number" step="1" value={phase1Target} onChange={e => setPhase1Target(e.target.value)} className="w-full bg-black/20 border border-[rgba(255,255,255,0.07)] rounded-lg p-2 text-xs font-bold text-white" />
            </div>
            <div>
              <label className="block uppercase font-bold text-zinc-500 tracking-wider mb-1">P2 Target (%)</label>
              <input type="number" step="1" value={phase2Target} onChange={e => setPhase2Target(e.target.value)} className="w-full bg-black/20 border border-[rgba(255,255,255,0.07)] rounded-lg p-2 text-xs font-bold text-white" />
            </div>
          </div>
          <button onClick={calculateTable} className="w-full py-2.5 bg-[#20e0b2] hover:bg-[#20e0b2]/80 text-[#101014] text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer">
            Calculate Rules Matrix
          </button>
        </div>

        {rows && (
          <div className="overflow-x-auto border-t border-zinc-850">
            <table className="w-full text-left font-mono text-[10px]">
              <thead>
                <tr className="border-b border-zinc-850 bg-black/10 text-zinc-500">
                  <th className="px-4 py-2 text-[9px] uppercase font-bold">Scale Size</th>
                  <th className="px-4 py-2 text-[9px] uppercase font-bold">Risk Per trade</th>
                  <th className="px-4 py-2 text-[9px] uppercase font-bold text-center">P1 Trades</th>
                  <th className="px-4 py-2 text-[9px] uppercase font-bold text-right text-[#20e0b2]">P1 Gain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/40">
                {rows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01]">
                    <td className="px-4 py-2 font-bold text-white">${r.accountSize.toLocaleString()}</td>
                    <td className="px-4 py-2 text-zinc-400">${r.riskAmount.toFixed(0)}</td>
                    <td className="px-4 py-2 text-center"><span className="px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400 font-bold border border-[rgba(255,255,255,0.07)]">{r.tradesPhase1}W</span></td>
                    <td className="px-4 py-2 text-right font-bold text-[#20e0b2]">${r.gainPhase1.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SUB-COMPONENT 4: VALIDATION DESK ──
function ValidationDesk() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
      <PreTradeChecklist />
      <TradingPlanEnforcer />
      <SetupQualityScorer />
      <EmotionalStateChecker />
      <RiskLimitGuard />
    </div>
  );
}


