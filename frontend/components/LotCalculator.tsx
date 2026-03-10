// components/LotCalculator.tsx
"use client";

import { useState } from "react";

type InputKeys =
  | "balance"
  | "leverage"
  | "riskPercent"
  | "stopLossPips"
  | "pipValue";

type Inputs = Record<InputKeys, number>;

const defaultInput: Inputs = {
  balance: 6000,
  leverage: 30,
  riskPercent: 5,
  stopLossPips: 50,
  pipValue: 10,
};

export default function LotCalculator() {
  const [input, setInput] = useState<Inputs>(defaultInput);

  const { balance, leverage, riskPercent, stopLossPips, pipValue } = input;

  const riskAmount = (riskPercent / 100) * balance;
  const lotSize =
    stopLossPips * pipValue === 0 ? 0 : riskAmount / (stopLossPips * pipValue);
  const marginRequired = leverage === 0 ? 0 : 100000 / leverage;

  const handleChange = (key: InputKeys, value: string) => {
    const number = parseFloat(value);
    setInput((prev) => ({
      ...prev,
      [key]: isNaN(number) ? 0 : number,
    }));
  };

  const fields: { label: string; key: InputKeys }[] = [
    { label: "Account Balance ($)", key: "balance" },
    { label: "Leverage (e.g., 30)", key: "leverage" },
    { label: "Risk %", key: "riskPercent" },
    { label: "Stop Loss (pips)", key: "stopLossPips" },
    { label: "Pip Value (1 lot)", key: "pipValue" },
  ];

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded-xl ">
      <h2 className="text-xl font-semibold mb-6 text-black">🧮 Lot Size Calculator</h2>

      {fields.map(({ label, key }) => (
        <div key={key} className="mb-4">
          <label className="block mb-1 font-medium text-black">{label}</label>
          <input
            type="number"
            inputMode="decimal"
            value={input[key].toString()}
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full text-black p-2 border border-black rounded"
          />
        </div>
      ))}

      <hr className="my-6" />

      <div className="text-sm space-y-2 text-black">
        <p>
          🔻 <strong>Risk Amount:</strong> ${riskAmount.toFixed(2)}
        </p>
        <p>
          📊 <strong>Recommended Lot Size:</strong> {lotSize.toFixed(4)} lots
        </p>
        <p>
          💸 <strong>Margin for 1 Lot:</strong> ${marginRequired.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
