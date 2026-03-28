"use client";

import React, { useState } from "react";

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

const LotEachpair: React.FC = () => {
  const [selectedPair, setSelectedPair] = useState<number | null>(null);
  const [lotSize, setLotSize] = useState<number | null>(null);

  const riskAmount = 15;
  const stopLossPips = 50;

  const handleCalculate = () => {
    if (selectedPair && pairs[selectedPair]) {
      const pipValue = pairs[selectedPair].pipValue;
      const calculatedLot = riskAmount / (pipValue * stopLossPips);
      setLotSize(Number(calculatedLot.toFixed(3)));
    }
  };

  return (
    <div className="p-4 max-w-xl">
      <h2 className="text-xl font-bold mb-4">🎯 Lot Size Calculator</h2>

      <select
        value={selectedPair ?? ""}
        onChange={(e) => {
          setSelectedPair(Number(e.target.value));
          setLotSize(null);
        }}
        className="w-full border rounded px-3 py-2 mb-4"
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

      <button
        onClick={handleCalculate}
        disabled={!selectedPair}
        className="bg-blue-600 text-foreground px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Calculate Lot Size
      </button>

      {lotSize !== null && selectedPair && (
        <div className="mt-4 bg-gray-100 p-3 rounded border">
          <p className="text-lg font-medium">
            📊 {pairs[selectedPair].name}
          </p>
          <p className="text-green-600 text-xl font-bold">
            Lot Size: {lotSize} lots
          </p>
          <p className="text-sm text-gray-600">
            (Based on ${riskAmount} risk and {stopLossPips} pip stop loss)
          </p>
        </div>
      )}
    </div>
  );
};

export default LotEachpair;
