"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Calculator,
  DollarSign,
  TrendingDown,
  Layers,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Activity,
  Settings2,
  Target,
} from "lucide-react";
import { toast } from "sonner";

const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL ?? "";

type InputKeys =
  | "balance"
  | "leverage"
  | "riskPercent"
  | "stopLossPips"
  | "pipValue"
  | "sl"
  | "tp"
  | "rewardRatio";
type Inputs = Record<InputKeys, number>;

const defaultInput: Inputs = {
  balance: 6000,
  leverage: 30,
  riskPercent: 1,
  stopLossPips: 50,
  pipValue: 10,
  sl: 0,
  tp: 0,
  rewardRatio: 2, // 1:2 R:R
};

const SYMBOLS = [
  "XAUUSD",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "GBPJPY",
  "AUDUSD",
  "USDCAD",
  "USDCHF",
];

export default function RiskPage() {
  const [input, setInput] = useState<Inputs>(defaultInput);
  const [symbol, setSymbol] = useState("XAUUSD");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [executing, setExecuting] = useState(false);
  const [mt5Connected, setMt5Connected] = useState<boolean | null>(null);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);

  // Market Data
  const [livePrice, setLivePrice] = useState<{
    ask: number;
    bid: number;
    pip_size: number;
    digits: number;
  } | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);

  // Strategy toggle
  const [autoRrEnabled, setAutoRrEnabled] = useState(true);

  const {
    balance,
    leverage,
    riskPercent,
    stopLossPips,
    pipValue,
    sl,
    tp,
    rewardRatio,
  } = input;

  const riskAmount = (riskPercent / 100) * balance;
  const lotSize =
    stopLossPips * pipValue === 0 ? 0 : riskAmount / (stopLossPips * pipValue);
  const marginRequired = leverage === 0 ? 0 : 100000 / leverage;

  const handleChange = (key: InputKeys, value: string) => {
    const n = parseFloat(value);
    setInput((prev) => ({ ...prev, [key]: isNaN(n) ? 0 : n }));
  };

  // Check MT5 connection and pull live balance on mount
  useEffect(() => {
    fetch(`${BRIDGE}/api/calculations`, { signal: AbortSignal.timeout(3000) })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setMt5Connected(false);
          return;
        }
        setMt5Connected(true);
        if (data.account_balance > 0) {
          setAccountBalance(data.account_balance);
          setInput((prev) => ({
            ...prev,
            balance: Math.round(data.account_balance),
          }));
        }
      })
      .catch(() => setMt5Connected(false));
  }, []);

  // Fetch live price for auto RR calculation
  const fetchLivePrice = useCallback(async () => {
    if (mt5Connected === false) return;
    setFetchingPrice(true);
    try {
      const res = await fetch(`${BRIDGE}/api/symbol-price?symbol=${symbol}`);
      const data = await res.json();
      if (data.success) {
        setLivePrice(data);
      }
    } catch {
      // ignore
    } finally {
      setFetchingPrice(false);
    }
  }, [symbol, mt5Connected]);

  // When symbol changes, fetch new price
  useEffect(() => {
    fetchLivePrice();
  }, [fetchLivePrice, symbol]);

  // When direction, stopLossPips, rewardRatio, or livePrice changes, auto-calculate SL/TP
  useEffect(() => {
    if (!autoRrEnabled || !livePrice || stopLossPips <= 0) return;

    // Use current market price
    const entryPrice = direction === "BUY" ? livePrice.ask : livePrice.bid;
    const pipMultiplier = livePrice.pip_size;
    const digits = livePrice.digits;

    // Calculate absolute pip distances
    const slDist = stopLossPips * pipMultiplier;
    const tpDist = stopLossPips * rewardRatio * pipMultiplier;

    let newSl = 0;
    let newTp = 0;

    if (direction === "BUY") {
      newSl = entryPrice - slDist;
      newTp = entryPrice + tpDist;
    } else {
      newSl = entryPrice + slDist;
      newTp = entryPrice - tpDist;
    }

    // Round to correct digits
    const factor = Math.pow(10, digits);
    newSl = Math.round(newSl * factor) / factor;
    newTp = Math.round(newTp * factor) / factor;

    setInput((prev) => ({ ...prev, sl: newSl, tp: newTp }));
  }, [autoRrEnabled, livePrice, direction, stopLossPips, rewardRatio]);

  const executeTrade = async () => {
    if (lotSize <= 0) {
      toast.error("Lot size is 0 — check your inputs");
      return;
    }
    if (sl <= 0 || tp <= 0) {
      toast.error("Please enter SL and TP prices before executing");
      return;
    }
    setExecuting(true);
    try {
      const res = await fetch(`${BRIDGE}/api/execute-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          direction,
          lot_size: parseFloat(lotSize.toFixed(4)),
          sl,
          tp,
          comment: `TradeKiller ${riskPercent}% Risk | 1:${rewardRatio} RR`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `✅ Trade executed! Ticket #${data.ticket} | ${direction} ${data.lot_size} ${symbol} @ ${data.price}`,
          { duration: 8000 },
        );
      } else {
        toast.error(`❌ ${data.error}`, { duration: 7000 });
      }
    } catch (err) {
      toast.error("Network error — is the MT5 bridge running?");
    } finally {
      setExecuting(false);
    }
  };

  const results = [
    {
      label: "Risk Amount",
      value: `$${riskAmount.toFixed(2)}`,
      icon: TrendingDown,
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
    },
    {
      label: "Target Profit",
      value: `$${(riskAmount * rewardRatio).toFixed(2)}`,
      icon: Target,
      color: "text-green-400",
      bg: "bg-green-500/10 border-green-500/20",
    },
    {
      label: "Recommended Lot Size",
      value: `${lotSize.toFixed(4)} lots`,
      icon: Layers,
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="text-violet-500" size={24} />
            Advanced Risk Calculator
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Calculate your optimal lot size based on automated Risk:Reward
            target prices.
          </p>
        </div>
        <button
          onClick={fetchLivePrice}
          disabled={fetchingPrice || !mt5Connected}
          className="px-4 py-2 border border-border bg-card rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <Activity
            className={`w-4 h-4 text-violet-500 ${fetchingPrice ? "animate-pulse" : ""}`}
          />
          Refresh Price
        </button>
      </div>

      {/* MT5 Status banner */}
      {mt5Connected === false && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            MT5 bridge not connected — trade execution disabled. Start{" "}
            <code>python mt5_bridge.py</code> and log in to your account.
          </span>
        </div>
      )}
      {mt5Connected === true && accountBalance !== null && (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            MT5 connected — live balance{" "}
            <strong className="font-bold">
              ${accountBalance.toLocaleString()}
            </strong>{" "}
            auto-loaded
          </span>
        </div>
      )}

      {/* Inputs */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Risk Parameters
          </h2>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer group">
            <input
              type="checkbox"
              checked={autoRrEnabled}
              onChange={(e) => setAutoRrEnabled(e.target.checked)}
              className="rounded border-border text-violet-500 focus:ring-violet-500/50"
            />
            <span className="font-medium group-hover:text-violet-400 transition-colors">
              Auto-Calculate TP/SL from RR Profile
            </span>
          </label>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {(
            [
              {
                label: "Account Balance",
                key: "balance" as InputKeys,
                suffix: "$",
              },
              {
                label: "Risk Amount (%)",
                key: "riskPercent" as InputKeys,
                suffix: "%",
              },
              {
                label: "Stop Loss Range",
                key: "stopLossPips" as InputKeys,
                suffix: "pips",
              },
              {
                label: "Reward Ratio (1:X)",
                key: "rewardRatio" as InputKeys,
                suffix: "R",
              },
              {
                label: "Pip Value (1 lot)",
                key: "pipValue" as InputKeys,
                suffix: "$",
              },
              { label: "Leverage", key: "leverage" as InputKeys, suffix: "x" },
            ] as const
          ).map(({ label, key, suffix }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {label}
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={input[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 pr-12"
                />
                {suffix && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    {suffix}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {results.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className={`flex flex-col rounded-xl border p-4 ${bg}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {label}
              </span>
            </div>
            <span className={`text-xl font-bold font-mono ${color}`}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Trade Execution Panel */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-violet-500" />
            Execution Setup
          </h2>
          {livePrice && (
            <span className="text-xs bg-muted border border-border px-2 py-1 rounded">
              Current Market:{" "}
              <span className="font-mono text-violet-400 ml-1">
                {direction === "BUY" ? livePrice.ask : livePrice.bid}
              </span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Traded Symbol
            </label>
            <div className="relative">
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-muted px-3 py-2 text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/50 pr-8"
              >
                {SYMBOLS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Direction */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Trade Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDirection("BUY")}
                className={`py-2 rounded-lg text-sm font-bold transition-all border ${
                  direction === "BUY"
                    ? "bg-green-500 text-white border-green-400 shadow-lg shadow-green-500/25"
                    : "bg-card text-muted-foreground border-border hover:border-green-500/50"
                }`}
              >
                <TrendingUp className="inline w-3.5 h-3.5 mr-1 -mt-0.5" /> BUY
              </button>
              <button
                onClick={() => setDirection("SELL")}
                className={`py-2 rounded-lg text-sm font-bold transition-all border ${
                  direction === "SELL"
                    ? "bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/25"
                    : "bg-card text-muted-foreground border-border hover:border-red-500/50"
                }`}
              >
                <TrendingDown className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />{" "}
                SELL
              </button>
            </div>
          </div>
        </div>

        {/* SL / TP Prices */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Stop Loss Price
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.00001"
              placeholder="e.g. 2870.00"
              value={input.sl || ""}
              onChange={(e) => {
                if (autoRrEnabled) setAutoRrEnabled(false);
                handleChange("sl", e.target.value);
              }}
              className={`w-full rounded-lg border bg-muted px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 ${
                autoRrEnabled
                  ? "border-red-500/50 ring-2 ring-red-500/20 bg-red-500/5 font-mono font-bold"
                  : "border-red-500/20 focus:ring-red-500/40"
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Take Profit Price
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.00001"
              placeholder="e.g. 2960.00"
              value={input.tp || ""}
              onChange={(e) => {
                if (autoRrEnabled) setAutoRrEnabled(false);
                handleChange("tp", e.target.value);
              }}
              className={`w-full rounded-lg border bg-muted px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 ${
                autoRrEnabled
                  ? "border-green-500/50 ring-2 ring-green-500/20 bg-green-500/5 font-mono font-bold"
                  : "border-green-500/20 focus:ring-green-500/40"
              }`}
            />
          </div>
        </div>

        {/* Execute button */}
        <button
          onClick={executeTrade}
          disabled={executing || mt5Connected === false || lotSize <= 0}
          className={`w-full py-4 mt-2 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200
            ${
              direction === "BUY"
                ? "bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/25 disabled:bg-green-900/30 disabled:text-green-900/60"
                : "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/25 disabled:bg-red-900/30 disabled:text-red-900/60"
            } disabled:cursor-not-allowed`}
        >
          {executing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Transmitting to
              Router…
            </>
          ) : (
            <>
              {direction === "BUY" ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              EXECUTE {direction} {symbol} ({lotSize.toFixed(2)} LOTS)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
