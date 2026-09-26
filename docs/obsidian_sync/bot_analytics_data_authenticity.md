# Bot Analytics Win Rate Data Authenticity Audit

**Date**: 2026-09-05  
**Topic**: Bot Dashboard (`/bot`) Win Rate Breakdown Authenticity

---

## 1. Executive Summary
- **Question**: Are the "Win Rate by Signal Grade", "Win Rate by Setup Concept", and "Win Rate by Market Regime" metrics real broker data?
- **Answer**: **NO.** These metrics are **100% synthetic/seeded sample data**.

---

## 2. Technical Evidence & Code Trace
- **File**: `mt5_bridge.py`
- **Lines**: 4620–4715 (`seed_db()`) and 5172–5365 (`/api/ea/analytics`)
- **Database**: `ea_analytics.db` (local SQLite database)

### Exact Implementation in `mt5_bridge.py`:
```python
def seed_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM trades")
    if c.fetchone()[0] > 0:
        conn.close()
        return

    setups = ["Liquidity Sweep", "FVG", "Order Block", "SMT", "Supply/Demand", "Support/Resistance"]
    symbols = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY"]
    sessions = ["LONDON", "NEW YORK", "ASIA"]
    regimes = ["TRENDING", "RANGING", "BREAKOUT", "REVERSAL"]
    types = ["BUY", "SELL"]
    
    # Generates exactly 150 mock closed trades
    for i in range(150):
        ticket = str(1000000 + i)
        ...
        win_rate = 0.5
        if score >= 90: win_rate = 0.8
        elif score >= 80: win_rate = 0.7
        ...
        is_win = random.random() < win_rate
```

### Breakdown Proof:
1. **Total Trades by Grade**: $30 + 43 + 36 + 41 = 150$ trades.
2. **Total Trades by Setup**: $24 + 27 + 22 + 26 + 28 + 23 = 150$ trades.
3. **Total Trades by Regime**: $44 + 44 + 30 + 32 = 150$ trades.

---

## 3. Real vs Mock Status on the Bot Page
| Component | Source | Authenticity |
| :--- | :--- | :--- |
| **Account Balance / Equity ($35.18)** | MT5 Python API (`/api/account`) | **REAL** |
| **Scanner Signals (XAUUSD, EURUSD)** | Real-time scanner (`/api/terminal/signals`) | **REAL** |
| **Technical Matrix (M1-MN Indicators)** | Live market feed (`/api/scanner/market-state`) | **REAL** |
| **Signal Grade / Setup / Regime Win Rates** | SQLite `ea_analytics.db` (`seed_db()`) | **SYNTHETIC / MOCK** |
| **Monthly Return Grid (Dashboard)** | MT5 History (`/api/history` 3,630 trades) | **REAL** |

---

## 4. Next Steps
- When the MQL5 EA executes live orders and calls `POST /api/ea/trade-event`, real trades will be appended to `ea_analytics.db`.
- Seeded data can either be wiped (so it shows clean "0 trades / waiting for live EA") or replaced with real history analytics.
