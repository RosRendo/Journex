# RendoOS / Trading Ecosystem Constitution

RendoOS is an institutional trading intelligence cockpit, automated execution ecosystem, and portfolio management platform.

## Core Principles

### I. Quantitative Rigor Over Guesswork (The Anti-Loop Rule)
- Never propose ad-hoc parameter tweaks or curve-fit to isolated market noise.
- Every strategy modification must be backed by multi-year out-of-sample statistical validation (2025–2026+).
- The 9-stage validation pipeline is the non-negotiable benchmark for execution safety.

### II. Capital Protection & Hard Risk Limits
- Every executed order must have a hard stop-loss calculated from volatility (ATR) upon entry.
- Martingale, unbounded cost-averaging, and hidden stops are strictly prohibited.
- Risk per trade is capped at 1.0% (0.75% for prop accounts). Daily drawdown circuit breakers (3.0%) and master drawdown kill-switches (15.0%) are mandatory.
- Compounding must be capped (`InpMaxBalanceCompounding`) to prevent broker liquidity degradation and excessive dollar exposure.

### III. System Architecture & Stack Boundaries
- **Trading Engine**: MQL5 Quantitative EA (`AdaptiveICT`) running on MetaTrader 5.
- **Bridge Layer**: Python real-time telemetry service (`mt5_bridge.py`).
- **Dashboard Backend**: Node.js / Express / TypeScript API server.
- **Frontend Cockpit**: Next.js (App Router), React, TypeScript, and Vanilla CSS with institutional dark-mode aesthetics.
- **Data Layer**: PostgreSQL / TimescaleDB with strict database migrations.

### IV. Non-Destructive Evolution & High Aesthetic Standards
- Preserve all existing working chart overlays, journal replays, and macro desk analytics unless a feature spec explicitly requires modifications.
- High visual aesthetics: institutional cockpit layout, micro-animations, glassmorphism, responsive data grids, and zero low-effort placeholders.
- Follow existing codebase conventions before introducing new patterns or libraries.
