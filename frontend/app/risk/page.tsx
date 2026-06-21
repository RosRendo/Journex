"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, DollarSign, TrendingDown, TrendingUp, AlertCircle,
  CheckCircle2, Loader2, ChevronDown, Activity, Target, Zap, ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { getBackendUrl } from "@/lib/utils";
import { getSession } from "@/lib/useSession";

type InputKeys = "balance" | "leverage" | "riskPercent" | "stopLossPips" | "pipValue" | "sl" | "tp" | "rewardRatio";
type Inputs = Record<InputKeys, number>;

const defaultInput: Inputs = { balance: 6000, leverage: 30, riskPercent: 1, stopLossPips: 50, pipValue: 10, sl: 0, tp: 0, rewardRatio: 2 };
const SYMBOLS = ["XAUUSD","EURUSD","GBPUSD","USDJPY","GBPJPY","AUDUSD","USDCAD","USDCHF","USOIL","US100","US30","BTCUSD"];

function FieldInput({ label, value, onChange, suffix, highlighted = "none" }: {
  label: string; value: number; onChange: (v: string) => void;
  suffix?: string; highlighted?: "bull" | "bear" | "none";
}) {
  const [isFocused, setIsFocused] = useState(false);
  const borderColor = highlighted === "bull" ? "var(--bull)" : highlighted === "bear" ? "var(--bear)" : "rgba(255, 255, 255, 0.1)";
  const glowColor = highlighted === "bull" ? "rgba(0, 212, 161, 0.15)" : highlighted === "bear" ? "rgba(255, 77, 106, 0.15)" : "rgba(255, 255, 255, 0.05)";

  return (
    <div className="relative group">
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5 transition-colors duration-300" 
             style={{ color: isFocused ? "var(--accent)" : "var(--text-tertiary)" }}>
        {label}
      </label>
      <div className="relative">
        <input
          type="number" inputMode="decimal" value={value || ""}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-[13px] font-mono font-bold outline-none transition-all duration-300 bg-black/25 text-white"
          style={{ 
            border: `1px solid ${isFocused ? "var(--accent)" : borderColor}`, 
            boxShadow: isFocused ? `0 0 15px ${glowColor}` : "none"
          }}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold opacity-50 text-gray-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function RiskPage() {
  const [input, setInput] = useState<Inputs>(defaultInput);
  const [symbol, setSymbol] = useState("XAUUSD");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [executing, setExecuting] = useState(false);
  const [mt5Connected, setMt5Connected] = useState<boolean | null>(null);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [livePrice, setLivePrice] = useState<{ ask: number; bid: number; pip_size: number; digits: number } | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [autoRrEnabled, setAutoRrEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"calculate" | "table">("calculate");

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
    const token = session?.user?.email;
    const headers: Record<string, string> = {
      "ngrok-skip-browser-warning": "true",
      "Content-Type": "application/json"
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const checkConnection = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${getBackendUrl()}/api/bridge/api/calculations`, { 
        headers, 
        signal: AbortSignal.timeout(3000) 
      });
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

  // Risk table data: 5 risk levels × 3 RR ratios
  const riskTableRows = [0.5, 1, 1.5, 2, 3].map((pct) => {
    const risk = (pct / 100) * balance;
    return { pct, risk, r1: risk * 1, r2: risk * 2, r3: risk * 3, lots: stopLossPips * pipValue === 0 ? 0 : risk / (stopLossPips * pipValue) };
  });

  return (
    <div className="space-y-8 max-w-5xl pb-20 mx-auto px-4 md:px-0">
      
      {/* Decorative Blur */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[150px] pointer-events-none opacity-10 bg-gradient-to-r from-[--accent] to-cyan-500 -z-10" />

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wider mb-3 bg-rose-500/10 border border-rose-500/20 text-red-400 uppercase">
            <ShieldAlert size={12} />
            Risk & Size Protocol
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white" style={{ fontFamily: "var(--font-display, Syne, sans-serif)" }}>
            Risk <span className="text-[--accent]">Management</span>
          </h1>
          <p className="text-sm mt-1 text-[--text-secondary] max-w-xl leading-relaxed">
            Calculate optimal position sizes, model portfolio risk tables, and deploy execution orders directly to MT5 terminal.
          </p>
        </div>
        <button
          onClick={fetchLivePrice}
          disabled={fetchingPrice || !mt5Connected}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-white/10 disabled:opacity-40 shadow-lg border border-white/5 bg-white/[0.02] text-white backdrop-blur-md"
        >
          <Activity className={`w-4 h-4 ${fetchingPrice ? "animate-pulse text-[--accent]" : "text-gray-400"}`} />
          Refresh Live Price
        </button>
      </motion.div>

      {/* MT5 Status Alerts */}
      {mt5Connected === false && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="flex items-center gap-3 rounded-2xl px-5 py-4 text-xs backdrop-blur-md font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>MT5 bridge link is inactive. Trade execution disabled. Initialize the bridge by running:</span>
          <code className="font-mono bg-black/35 border border-white/10 px-2 py-0.5 rounded text-white text-[11px]">python mt5_bridge.py</code>
        </motion.div>
      )}
      {mt5Connected === true && accountBalance !== null && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="flex items-center gap-3 rounded-2xl px-5 py-4 text-xs backdrop-blur-md font-bold bg-emerald-500/10 border border-emerald-500/20 text-[--accent] shadow-[0_0_20px_rgba(0,212,161,0.05)]"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>MT5 link active. Live balance: <strong className="font-mono text-white text-sm">${accountBalance.toLocaleString()}</strong> synchronized</span>
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit border border-white/5 bg-black/40 backdrop-blur-md">
        {([["calculate", "Lot Size Calculator"], ["table", "Risk Matrix Table"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === id 
                ? "bg-[--accent] text-black shadow-[0_0_15px_rgba(0,212,161,0.3)]" 
                : "text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "calculate" ? (
          <motion.div 
            key="calc"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          >
            {/* Input Form Panel */}
            <div className="lg:col-span-3 space-y-6">
              <div className="rounded-2xl p-6 md:p-8 space-y-6 backdrop-blur-xl shadow-2xl border border-white/5 bg-black/40 relative overflow-hidden">
                
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)] opacity-[0.015] blur-[120px] pointer-events-none rounded-full" />

                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Calculator size={14} className="text-[--accent]" /> 
                    <span>Parameters Control</span>
                  </span>
                  <label className="flex items-center gap-2 text-xs cursor-pointer font-bold text-gray-400 hover:text-white transition-colors">
                    <input 
                      type="checkbox" 
                      checked={autoRrEnabled} 
                      onChange={(e) => setAutoRrEnabled(e.target.checked)}
                      className="rounded border-white/10 text-[--accent] bg-black/45 focus:ring-0 w-4 h-4 cursor-pointer" 
                    />
                    <span>Auto-Calculate SL/TP Limits</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
                  <FieldInput label="Account Balance" value={balance} onChange={(v) => handleChange("balance", v)} suffix="$" />
                  <FieldInput label="Risk Exposure %" value={riskPercent} onChange={(v) => handleChange("riskPercent", v)} suffix="%" />
                  <FieldInput label="Stop Loss (Pips)" value={stopLossPips} onChange={(v) => handleChange("stopLossPips", v)} suffix="Pips" highlighted="bear" />
                  <FieldInput label="Target Reward Ratio" value={rewardRatio} onChange={(v) => handleChange("rewardRatio", v)} suffix="R" highlighted="bull" />
                  <FieldInput label="Pip Value (standard lot)" value={pipValue} onChange={(v) => handleChange("pipValue", v)} suffix="$" />
                  <FieldInput label="Leverage Scale" value={leverage} onChange={(v) => handleChange("leverage", v)} suffix="x" />
                </div>
              </div>
            </div>

            {/* Calculations & Execution */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Output Panel */}
              <div className="rounded-2xl p-6 md:p-8 space-y-5 backdrop-blur-xl shadow-2xl border border-white/5 bg-black/40">
                <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/5 pb-4">
                   <Target size={14} className="text-[--accent]" /> 
                   <span>Target Distribution</span>
                </span>
                
                <div className="space-y-4 pt-1">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-gray-400">Total Capital Risked</span>
                    <span className="text-xl font-mono font-bold text-[--bear] shadow-sm">-${riskAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-gray-400">Target Protocol Yield</span>
                    <span className="text-xl font-mono font-bold text-[--bull]">+${targetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  
                  <div className="flex justify-between items-end pt-4 border-t border-white/5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[--accent]">Lot Sizing</span>
                    <span className="text-3xl font-black font-mono leading-none text-white">{lotSize.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Approx. Margin Commitment</span>
                    <span className="text-xs font-mono font-bold text-gray-400">${((marginRequired * lotSize)/100).toFixed(2)}</span>
                  </div>
                </div>

                {/* Styled Gradient RR Visual Bar */}
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between text-[9px] font-bold font-mono">
                    <span className="text-[--bear] uppercase tracking-wider">1.0R Risk Exposure</span>
                    <span className="text-[--accent] uppercase tracking-wider">{rewardRatio.toFixed(1)}R Reward Target</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-white/5 border border-white/5 shadow-inner">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-rose-500 to-red-500" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(1 / (1 + rewardRatio)) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                    <motion.div 
                      className="h-full bg-gradient-to-r from-[--accent] to-teal-400" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(rewardRatio / (1 + rewardRatio)) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                    />
                  </div>
                </div>
              </div>

              {/* Execution Block */}
              <div className="rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl border border-[--accent]/30 bg-black/40 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle at center, var(--accent) 0%, transparent 70%)" }} />
                
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-full">
                      <select
                        value={symbol} onChange={(e) => setSymbol(e.target.value)}
                        className="w-full appearance-none rounded-xl px-4 py-3 text-xs font-bold outline-none font-mono bg-black/40 border border-white/10 text-white"
                      >
                        {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 text-white pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setDirection("SELL")}
                      className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 border ${
                        direction === "SELL" 
                          ? "bg-red-500 text-white border-transparent shadow-[0_0_15px_rgba(239,68,68,0.35)]" 
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      SELL
                    </button>
                    <button 
                      onClick={() => setDirection("BUY")}
                      className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 border ${
                        direction === "BUY" 
                          ? "bg-[--accent] text-black border-transparent shadow-[0_0_15px_rgba(0,212,161,0.35)]" 
                          : "bg-emerald-500/10 text-[--accent] border-emerald-500/20"
                      }`}
                    >
                      BUY
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput label="SL Price Target" value={sl} onChange={(v) => handleChange("sl", v)} highlighted="bear" />
                    <FieldInput label="TP Price Target" value={tp} onChange={(v) => handleChange("tp", v)} highlighted="bull" />
                  </div>

                  <button
                    onClick={executeTrade} 
                    disabled={executing || !mt5Connected || lotSize <= 0}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-30 hover:scale-[1.02] bg-white text-black shadow-md"
                  >
                    {executing ? <Loader2 className="animate-spin w-4 h-4" /> : <><Zap size={14} /> Send MT5 Order ({lotSize.toFixed(2)} Lots)</>}
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        ) : (
          /* Risk Matrix Table */
          <motion.div 
            key="table"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl border border-white/5 bg-black/40"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-gray-400">Risk Exposure</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-right text-red-400">Risk ($)</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-right text-[--accent]">Lot Allocation</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-right text-emerald-400">1.0R Reward</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-right text-emerald-400">2.0R Reward</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-right text-emerald-400">3.0R Reward</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {riskTableRows.map((r, i) => (
                    <motion.tr 
                      key={r.pct} 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4 font-bold text-white">{r.pct}%</td>
                      <td className="px-6 py-4 text-right text-red-400/80">${r.risk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right font-bold text-[14px] text-[--accent]">{r.lots.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-gray-400">${r.r1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right text-gray-300">${r.r2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-right font-bold text-white">${r.r3.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </motion.tr>
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
