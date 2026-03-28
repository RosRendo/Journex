"use client";

import React, { useState } from "react";
import { Coins } from "lucide-react";

interface CurrencyPair {
  name: string;
  pipValue: number;
}

const pairs: Record<number, CurrencyPair> = {
  1: { name: "EUR/USD", pipValue: 1 },
  2: { name: "GBP/USD", pipValue: 1 },
  3: { name: "USD/JPY", pipValue: 0.91 },
  4: { name: "AUD/USD", pipValue: 1 },
  5: { name: "USD/CHF", pipValue: 1.87 },
  6: { name: "NZD/USD", pipValue: 1 },
  7: { name: "XAU/USD (Gold)", pipValue: 10 },
  8: { name: "GBP/JPY", pipValue: 0.91 },
  9: { name: "EUR/JPY", pipValue: 0.91 },
  10: { name: "USD/CAD", pipValue: 1 },
};

const LotSizeCalculator: React.FC = () => {
  const [selectedPair, setSelectedPair] = useState<number | null>(null);
  const [riskAmount, setRiskAmount] = useState<string>("15");
  const [stopLossPips, setStopLossPips] = useState<string>("50");
  const [lotSize, setLotSize] = useState<number | null>(null);
  const [error, setError] = useState<string>("");

  const handleCalculate = () => {
    const risk = parseFloat(riskAmount);
    const sl = parseFloat(stopLossPips);

    if (!selectedPair || !pairs[selectedPair]) {
      setError("Please select a valid currency pair.");
      return;
    }
    if (isNaN(risk) || risk <= 0) {
      setError("Risk amount must be greater than 0.");
      return;
    }
    if (isNaN(sl) || sl <= 0) {
      setError("Stop loss pips must be greater than 0.");
      return;
    }

    const pipValue = pairs[selectedPair].pipValue;
    const calculatedLot = risk / (pipValue * sl);
    setLotSize(Number(calculatedLot.toFixed(3)));
    setError("");
  };

  return (
          <div className="space-y-6 max-w-lg">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Coins className="text-violet-500" size={24} />
            Lot Size — Each Pair
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Calculate your lot size for any currency pair
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {/* Risk Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Risk Amount ($)
            </label>
            <input
              type="number"
              min="0"
              value={riskAmount}
              onChange={(e) => setRiskAmount(e.target.value)}
              placeholder="Enter risk per trade"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>

          {/* Stop Loss */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Stop Loss (pips)
            </label>
            <input
              type="number"
              min="0"
              value={stopLossPips}
              onChange={(e) => setStopLossPips(e.target.value)}
              placeholder="Enter stop loss pips"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>

          {/* Currency Pair */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Currency Pair
            </label>
            <select
              value={selectedPair ?? ""}
              onChange={(e) => {
                setSelectedPair(Number(e.target.value));
                setLotSize(null);
                setError("");
              }}
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="" disabled>
                Select a currency pair...
              </option>
              {Object.entries(pairs).map(([key, pair]) => (
                <option key={key} value={key}>
                  {pair.name} (Pip value: ${pair.pipValue})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCalculate}
            disabled={!riskAmount || !stopLossPips || !selectedPair}
            className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-foreground text-sm font-semibold transition-colors"
          >
            Calculate Lot Size
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Result */}
        {lotSize !== null && selectedPair && !error && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
            <div className="text-sm text-muted-foreground mb-1">
              📊 {pairs[selectedPair].name}
            </div>
            <div className="text-3xl font-bold text-emerald-400 font-mono mb-1">
              {lotSize} lots
            </div>
            <div className="text-xs text-muted-foreground">
              Based on ${riskAmount} risk with {stopLossPips} pip stop loss
            </div>
          </div>
        )}
      </div>
  );
};

export default LotSizeCalculator;
