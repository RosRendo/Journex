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
  const borderColor = highlighted === "bull" ? "rgba(16,185,129,0.2)" : highlighted === "bear" ? "rgba(239,68,68,0.2)" : "rgba(255, 255, 255, 0.05)";
  const glowColor = highlighted === "bull" ? "rgba(0, 212, 161, 0.15)" : highlighted === "bear" ? "rgba(255, 77, 106, 0.15)" : "rgba(255, 255, 255, 0.05)";

  return (
    <div className="relative group font-mono">
      <label className="block text-[9px] font-bold uppercase tracking-widest mb-1.5 transition-colors duration-300 text-zinc-550">
        {label}
      </label>
      <div className="relative">
        <input
          type="number" inputMode="decimal" value={value || ""}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg px-3.5 py-2.5 text-xs font-bold outline-none transition-all duration-300 bg-black/25 text-white"
          style={{ 
            border: `1px solid ${isFocused ? "rgba(16,185,129,0.3)" : borderColor}`, 
            boxShadow: isFocused ? `0 0 15px ${glowColor}` : "none"
          }}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-50 text-zinc-550">
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
    const token = (session?.user as any)?.apiToken;
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

  const riskTableRows = [0.5, 1, 1.5, 2, 3].map((pct) => {
    const risk = (pct / 100) * balance;
    return { pct, risk, r1: risk * 1, r2: risk * 2, r3: risk * 3, lots: stopLossPips * pipValue === 0 ? 0 : risk / (stopLossPips * pipValue) };
  });

  return (
    <div className="min-h-screen w-full bg-[#05050a] text-text-primary px-4 md:px-6 py-4 flex flex-col gap-4 animate-fade-in pb-16">
      
      {/* Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111118]/80 p-4 border border-zinc-800/40 rounded-2xl backdrop-blur-xl mt-4">
        <div>
          <h1 className="text-lg font-black tracking-tight text-white font-display flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-455 text-emerald-400" />
            Risk & Size Protocol
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-1 mt-0.5">
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-450" /> Calculate optimal position sizes and model portfolio risk tables
          </p>
        </div>
        <button
          onClick={fetchLivePrice}
          disabled={fetchingPrice || !mt5Connected}
          className="px-3.5 py-2 rounded-lg border border-zinc-800/40 bg-white/5 text-zinc-300 font-mono font-bold text-[10px] uppercase tracking-wider transition-all hover:bg-white/10 flex items-center gap-1.5"
        >
          <Activity className={`w-3.5 h-3.5 ${fetchingPrice ? "animate-pulse text-emerald-400" : "text-zinc-500"}`} />
          Refresh Price
        </button>
      </div>

      {/* MT5 Status Alerts */}
      {mt5Connected === false && (
        <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono uppercase tracking-wider">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>MT5 bridge link is inactive. Trade execution disabled. Run:</span>
          <code className="font-mono bg-black/35 border border-white/10 px-2 py-0.5 rounded text-white text-[9px] lowercase">python mt5_bridge.py</code>
        </div>
      )}
      {mt5Connected === true && accountBalance !== null && (
        <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono uppercase tracking-wider">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>MT5 link active. Live balance: <strong className="font-mono text-white text-xs">${accountBalance.toLocaleString()}</strong> synchronized</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl w-fit border border-zinc-800/40 bg-black/20 font-mono text-[9px] font-bold uppercase tracking-wider">
        {([["calculate", "Lot Calculator"], ["table", "Risk Matrix"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === id 
                ? "bg-white/10 text-white" 
                : "text-zinc-550 hover:text-zinc-350"
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
            className="grid grid-cols-1 lg:grid-cols-5 gap-4"
          >
            {/* Input Form Panel */}
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-xl p-5 md:p-6 space-y-6 bg-[#111118] border border-zinc-800/40 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-4 font-mono text-[9px] font-bold">
                  <span className="text-zinc-550 uppercase tracking-widest flex items-center gap-1.5">
                    <Calculator size={13} className="text-emerald-400" /> Parameters Control
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-500 hover:text-zinc-300">
                    <input 
                      type="checkbox" 
                      checked={autoRrEnabled} 
                      onChange={(e) => setAutoRrEnabled(e.target.checked)}
                      className="rounded border-zinc-800/60 text-emerald-450 bg-black/45 focus:ring-0 w-3.5 h-3.5 cursor-pointer" 
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

            {/* Calculations & Execution */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Output Panel */}
              <div className="rounded-xl p-5 md:p-6 space-y-4 bg-[#111118] border border-zinc-800/40 shadow-xl">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-550 flex items-center gap-1.5 border-b border-zinc-850 pb-4 font-mono">
                   <Target size={13} className="text-emerald-400" /> Target Distribution
                </span>
                
                <div className="space-y-3 pt-1 font-mono text-[11px]">
                  <div className="flex justify-between items-end">
                    <span className="text-zinc-500 font-bold">Total Capital Risked</span>
                    <span className="font-bold text-red-405">-${riskAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-zinc-500 font-bold">Target Protocol Yield</span>
                    <span className="font-bold text-emerald-400">+${targetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  
                  <div className="flex justify-between items-end pt-4 border-t border-zinc-850">
                    <span className="text-[10px] font-black uppercase text-emerald-450">Lot Sizing</span>
                    <span className="text-2xl font-black text-white leading-none">{lotSize.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-bold uppercase text-zinc-600">Approx. Margin Commitment</span>
                    <span className="text-[10px] text-zinc-500">${((marginRequired * lotSize)/100).toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <div className="flex justify-between text-[8px] font-bold font-mono">
                    <span className="text-red-405 uppercase tracking-wider">1.0R Risk Exposure</span>
                    <span className="text-emerald-400 uppercase tracking-wider">{rewardRatio.toFixed(1)}R Reward Target</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-black/35 border border-zinc-850 shadow-inner">
                    <motion.div 
                      className="h-full bg-red-500" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(1 / (1 + rewardRatio)) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                    <motion.div 
                      className="h-full bg-emerald-500" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(rewardRatio / (1 + rewardRatio)) * 100}%` }}
                      transition={{ duration: 0.3, delay: 0.05 }}
                    />
                  </div>
                </div>
              </div>

              {/* Execution Block */}
              <div className="rounded-xl p-5 md:p-6 bg-[#111118] border border-zinc-800/40 shadow-xl relative overflow-hidden font-mono text-[10px]">
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-full">
                      <select
                        value={symbol} onChange={(e) => setSymbol(e.target.value)}
                        className="w-full appearance-none rounded-lg px-3 py-2.5 text-xs font-bold outline-none bg-black/25 border border-zinc-800/60 text-white cursor-pointer"
                      >
                        {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 text-white pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setDirection("SELL")}
                      className={`flex-1 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all border ${
                        direction === "SELL" 
                          ? "bg-red-500 text-white border-transparent" 
                          : "bg-red-500/10 text-red-405 border-red-500/20"
                      }`}
                    >
                      SELL
                    </button>
                    <button 
                      onClick={() => setDirection("BUY")}
                      className={`flex-1 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all border ${
                        direction === "BUY" 
                          ? "bg-emerald-500 text-emerald-955 text-emerald-950 border-transparent" 
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
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
                    className="w-full flex items-center justify-center gap-1.5 py-3 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all disabled:opacity-30 bg-white text-black cursor-pointer"
                  >
                    {executing ? <Loader2 className="animate-spin w-4 h-4" /> : <><Zap size={13} /> Deploy Execution ({lotSize.toFixed(2)} Lots)</>}
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
            className="rounded-xl overflow-hidden bg-[#111118] border border-zinc-800/40 shadow-xl"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] whitespace-nowrap font-mono">
                <thead>
                  <tr className="bg-black/25 border-b border-zinc-800/45 text-[9px] uppercase font-bold tracking-widest text-zinc-500">
                    <th className="px-5 py-3.5 font-bold">Risk Exposure</th>
                    <th className="px-5 py-3.5 font-bold text-right text-red-400">Risk ($)</th>
                    <th className="px-5 py-3.5 font-bold text-right text-emerald-400">Lot Sizing</th>
                    <th className="px-5 py-3.5 font-bold text-right text-zinc-350">1.0R Reward</th>
                    <th className="px-5 py-3.5 font-bold text-right text-zinc-300">2.0R Reward</th>
                    <th className="px-5 py-3.5 font-bold text-right text-white">3.0R Reward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {riskTableRows.map((r, i) => (
                    <tr 
                      key={r.pct} 
                      className="transition-colors hover:bg-white/[0.01]"
                    >
                      <td className="px-5 py-3.5 font-bold text-white">{r.pct}%</td>
                      <td className="px-5 py-3.5 text-right text-red-405/85">${r.risk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-5 py-3.5 text-right font-black text-xs text-emerald-400">{r.lots.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right text-zinc-500">${r.r1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-5 py-3.5 text-right text-zinc-400">${r.r2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-white">${r.r3.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
