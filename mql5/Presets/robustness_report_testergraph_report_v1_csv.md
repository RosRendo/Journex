# Robustness & Stress Test Report: testergraph.report.v1.csv
    
## Executive Summary
* **Preset File:** `testergraph.report.v1.csv`
* **System Quality Number (SQN):** `-3.21`
* **System Quality Rating:** `Poor (Un-tradable / Overfitted)`
* **Compound Multiplier Expectancy:** `-0.012R per trade`

---

## Performance Matrix

| Metric | Raw Backtest | Monte Carlo Median | Stressed Conditions |
| :--- | :--- | :--- | :--- |
| **Ending Balance** | $2,657.46 | $2,625.59 | $4.23 |
| **Max Drawdown** | N/A | 76.33% | 99.96% |
| **Risk of Ruin** | N/A | 100.00% | 100.00% |
| **SQN Index** | -3.21 | -3.21 | -19.17 |

---

## Stress Test Settings
* **Slippage Penalty:** `- 0.2R`
* **Percent Affected:** `30.0%`
* **Ruin Drawdown Cap:** `30.0%`

---

## Recommendations & Verdict

> [!WARNING]
> **HIGH RISK OF RUIN DETECTED (100.0%)**
> Shuffled sequences show a high probability of hitting your 30.0% drawdown threshold. This preset is fragile. Reduce your `InpRiskPercent` below 1.0%.
