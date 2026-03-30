"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Calculator, DollarSign, TrendingDown, TrendingUp, AlertCircle,
  CheckCircle2, Loader2, ChevronDown, Activity, Target, Zap,
} from "lucide-react";
import { toast } from "sonner";

const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL ?? "";

type InputKeys = "balance" | "leverage" | "riskPercent" | "stopLossPips" | "pipValue" | "sl" | "tp" | "rewardRatio";
type Inputs = Record<InputKeys, number>;

const defaultInput: Inputs = { balance: 6000, leverage: 30, riskPercent: 1, stopLossPips: 50, pipValue: 10, sl: 0, tp: 0, rewardRatio: 2 };
const SYMBOLS = ["XAUUSD","EURUSD","GBPUSD","USDJPY","GBPJPY","AUDUSD","USDCAD","USDCHF","USOIL","US100","US30","BTCUSD"];

function FieldInput({ label, value, onChange, suffix, highlighted = "none" }: {
  label: string; value: number; onChange: (v: string) => void;
  suffix?: string; highlighted?: "bull" | "bear" | "none";
}) {
  const borderColor = highlighted === "bull" ? "var(--bull)" : highlighted === "bear" ? "var(--bear)" : "var(--border)";
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </label>
      <div className="relative">
        <input
          type="number" inputMode="decimal" value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-[13px] font-mono font-bold outline-none transition-all"
          style={{ background: "var(--bg-input)", border: `1px solid ${borderColor}`, color: "var(--text-primary)" }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold" style={{ color: "var(--text-tertiary)" }}>
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

  useEffect(() => {
    fetch(`${BRIDGE}/api/calculations`, { headers: { "ngrok-skip-browser-warning": "true" },  signal: AbortSignal.timeout(3000) })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setMt5Connected(false); return; }
        setMt5Connected(true);
        if (data.account_balance > 0) {
          setAccountBalance(data.account_balance);
          setInput((prev) => ({ ...prev, balance: Math.round(data.account_balance) }));
        }
      }).catch(() => setMt5Connected(false));
  }, []);

  const fetchLivePrice = useCallback(async () => {
    if (mt5Connected === false) return;
    setFetchingPrice(true);
    try {
      const res = await fetch(`${BRIDGE}/api/symbol-price?symbol=${symbol}`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const data = await res.json();
      if (data.success) setLivePrice(data);
    } catch { } finally { setFetchingPrice(false); }
  }, [symbol, mt5Connected]);

  useEffect(() => { fetchLivePrice(); }, [fetchLivePrice, symbol]);

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
      const res = await fetch(`${BRIDGE}/api/execute-trade`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, direction, lot_size: parseFloat(lotSize.toFixed(4)), sl, tp,
          comment: `TradeDesk ${riskPercent}% Risk | 1:${rewardRatio} RR` }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`✅ Trade executed! Ticket #${data.ticket} | ${direction} ${data.lot_size} ${symbol} @ ${data.price}`, { duration: 8000 });
      } else { toast.error(`❌ ${data.error}`, { duration: 7000 }); }
    } catch { toast.error("Network error — is the MT5 bridge running?"); } finally { setExecuting(false); }
  };

  // Risk table data: 5 risk levels × 3 RR ratios
  const riskTableRows = [0.5, 1, 1.5, 2, 3].map((pct) => {
    const risk = (pct / 100) * balance;
    return { pct, risk, r1: risk * 1, r2: risk * 2, r3: risk * 3, lots: stopLossPips * pipValue === 0 ? 0 : risk / (stopLossPips * pipValue) };
  });

  return (
    <div className="space-y-6 max-w-4xl pb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-bold" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
            Risk Management
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Calculate optimal lot size, simulate risk profiles, and execute directly to MT5.
          </p>
        </div>
        <button
          onClick={fetchLivePrice}
          disabled={fetchingPrice || !mt5Connected}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold transition-all disabled:opacity-40"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <Activity className={`w-3.5 h-3.5 ${fetchingPrice ? "animate-pulse" : ""}`} style={{ color: "var(--accent)" }} />
          Refresh Price
        </button>
      </div>

      {/* MT5 Status */}
      {mt5Connected === false && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-[12px]"
          style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.3)", color: "var(--warning)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          MT5 bridge not connected — trade execution disabled. Run <code className="font-mono">python mt5_bridge.py</code>.
        </div>
      )}
      {mt5Connected === true && accountBalance !== null && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-[12px]"
          style={{ background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.3)", color: "var(--bull)" }}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          MT5 connected — live balance <strong className="font-mono font-bold">${accountBalance.toLocaleString()}</strong> auto-loaded
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--bg-elevated)" }}>
        {([["calculate", "Calculate Risk"], ["table", "Risk Table"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="px-4 py-2 rounded-lg text-[12px] font-bold transition-all"
            style={{
              background: activeTab === id ? "var(--accent)" : "transparent",
              color: activeTab === id ? "#000" : "var(--text-secondary)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "calculate" ? (
        <>
          {/* Main 2-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Inputs: 3 cols */}
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-xl border p-5 space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Risk Parameters</span>
                  <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                    <input type="checkbox" checked={autoRrEnabled} onChange={(e) => setAutoRrEnabled(e.target.checked)}
                      className="rounded" style={{ accentColor: "var(--accent)" }} />
                    <span style={{ color: "var(--text-secondary)" }}>Auto-Calculate SL/TP</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldInput label="Account Balance" value={balance} onChange={(v) => handleChange("balance", v)} suffix="$" />
                  <FieldInput label="Risk %" value={riskPercent} onChange={(v) => handleChange("riskPercent", v)} suffix="%" />
                  <FieldInput label="SL Range (Pips)" value={stopLossPips} onChange={(v) => handleChange("stopLossPips", v)} suffix="pips" />
                  <FieldInput label="Reward Ratio 1:X" value={rewardRatio} onChange={(v) => handleChange("rewardRatio", v)} suffix="R" />
                  <FieldInput label="Pip Value (1 lot)" value={pipValue} onChange={(v) => handleChange("pipValue", v)} suffix="$" />
                  <FieldInput label="Leverage" value={leverage} onChange={(v) => handleChange("leverage", v)} suffix="x" />
                </div>
              </div>

              {/* Execution panel */}
              <div className="rounded-xl border p-5 space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>Execution Setup</span>
                  {livePrice && (
                    <span className="text-[11px] font-mono" style={{ color: "var(--accent)" }}>
                      {direction === "BUY" ? "ASK" : "BID"} {direction === "BUY" ? livePrice.ask : livePrice.bid}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Symbol */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-tertiary)" }}>Symbol</label>
                    <div className="relative">
                      <select value={symbol} onChange={(e) => setSymbol(e.target.value)}
                        className="w-full appearance-none rounded-lg px-3 py-2.5 pr-8 text-[13px] font-bold outline-none"
                        style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                        {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
                    </div>
                  </div>

                  {/* Direction */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-tertiary)" }}>Direction</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setDirection("BUY")}
                        className="py-2.5 rounded-lg text-[12px] font-bold transition-all"
                        style={{ background: direction === "BUY" ? "var(--bull)" : "var(--bg-elevated)", color: direction === "BUY" ? "#000" : "var(--text-secondary)", border: `1px solid ${direction === "BUY" ? "var(--bull)" : "var(--border)"}` }}>
                        <TrendingUp className="inline w-3.5 h-3.5 mr-1 -mt-0.5" /> BUY
                      </button>
                      <button onClick={() => setDirection("SELL")}
                        className="py-2.5 rounded-lg text-[12px] font-bold transition-all"
                        style={{ background: direction === "SELL" ? "var(--bear)" : "var(--bg-elevated)", color: direction === "SELL" ? "#fff" : "var(--text-secondary)", border: `1px solid ${direction === "SELL" ? "var(--bear)" : "var(--border)"}` }}>
                        <TrendingDown className="inline w-3.5 h-3.5 mr-1 -mt-0.5" /> SELL
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldInput label="Stop Loss Price" value={sl} onChange={(v) => { if (autoRrEnabled) setAutoRrEnabled(false); handleChange("sl", v); }} highlighted="bear" />
                  <FieldInput label="Take Profit Price" value={tp} onChange={(v) => { if (autoRrEnabled) setAutoRrEnabled(false); handleChange("tp", v); }} highlighted="bull" />
                </div>

                {/* Execute */}
                <button onClick={executeTrade} disabled={executing || mt5Connected === false || lotSize <= 0}
                  className="w-full py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: direction === "BUY" ? "var(--bull)" : "var(--bear)", color: "#000", boxShadow: `0 0 20px ${direction === "BUY" ? "rgba(0,200,150,0.25)" : "rgba(255,77,106,0.25)"}` }}>
                  {executing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Transmitting to MT5…</>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      EXECUTE {direction} {symbol} ({lotSize.toFixed(2)} LOTS)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results: 2 cols */}
            <div className="lg:col-span-2 space-y-3">
              {/* Result cards */}
              {[
                { label: "Risk Amount", value: `$${riskAmount.toFixed(2)}`, color: "var(--bear)", sub: `${riskPercent}% of $${balance.toLocaleString()}` },
                { label: "Target Profit", value: `$${targetProfit.toFixed(2)}`, color: "var(--bull)", sub: `1:${rewardRatio} reward ratio` },
                { label: "Lot Size", value: `${lotSize.toFixed(4)} lots`, color: "var(--accent)", sub: `${lotSize.toFixed(2)} standard lots` },
              ].map((r) => (
                <div key={r.label} className="rounded-xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-tertiary)" }}>{r.label}</div>
                  <div className="text-[26px] font-bold font-mono" style={{ color: r.color, fontFamily: "var(--font-display, Syne, sans-serif)" }}>{r.value}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{r.sub}</div>
                </div>
              ))}

              {/* Visual RR bar */}
              <div className="rounded-xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-tertiary)" }}>Risk : Reward</div>
                <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
                  <div className="h-full rounded-l-full" style={{ background: "var(--bear)", width: `${100 / (1 + rewardRatio)}%` }} />
                  <div className="h-full rounded-r-full" style={{ background: "var(--bull)", width: `${100 * rewardRatio / (1 + rewardRatio)}%` }} />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] font-bold font-mono">
                  <span style={{ color: "var(--bear)" }}>−${riskAmount.toFixed(0)}</span>
                  <span style={{ color: "var(--bull)" }}>+${targetProfit.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Risk Table Tab */
        <div className="rounded-xl border overflow-x-auto scrollbar-none" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <table className="w-full text-[12px] min-w-[500px]">
            <thead>
              <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
                {["Risk %", "Risk $", "Lots", "1:1 Target", "1:2 Target", "1:3 Target"].map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {riskTableRows.map((row, i) => (
                <tr key={i} className="transition-colors hover:bg-[--bg-elevated]" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3 font-bold font-mono" style={{ color: "var(--text-primary)" }}>{row.pct}%</td>
                  <td className="px-4 py-3 font-mono" style={{ color: "var(--bear)" }}>−${row.risk.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono font-bold" style={{ color: "var(--accent)" }}>{row.lots.toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: "var(--bull)" }}>+${row.r1.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: "var(--bull)" }}>+${row.r2.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: "var(--bull)" }}>+${row.r3.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
