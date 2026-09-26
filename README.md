# ?? Journex — Institutional Trading Cockpit & AdaptiveICT Engine

> High-frequency algorithmic trading intelligence desk, live MetaTrader 5 bridge, and macro liquidity confluence workspace.

---

## ? Overview
**Journex** is a multi-tier quantitative trading ecosystem combining a modern **Next.js 16 cockpit**, an **Express/NestJS analytical backend**, an ultra-low latency **Python MT5 Bridge**, and custom **MQL5 AdaptiveICT algorithms**.

It eliminates trading friction by visualizing real-time order flow imbalances, institutional liquidity pools, Fair Value Gaps (FVG), and session killzones directly on interactive charts.

---

## ??? Architecture Topology

- **Frontend Cockpit**: Next.js 16, React 19, Tailwind CSS, Lightweight Charts, Lucide Icons (Port 3003)
- **Backend Analytics Engine**: Node.js / Express API with PostgreSQL & Prisma (Port 5000)
- **MT5 High-Speed Socket Bridge**: Python 3.11 with MetaTrader5 IPC sockets (Port 5003)
- **Execution Engine**: Custom MQL5 Expert Advisor (AdaptiveICT_EA.mq5) with risk gatekeeper and dynamic lot scaling

---

## ?? Key Modules
1. **Command Center Cockpit**: Real-time ticker radar, win-rate breakdown, and session confluence meters.
2. **Interactive Chart Workspace**: Multi-timeframe liquidity heatmaps, institutional order blocks, and trade annotations.
3. **AdaptiveICT Strategy Suite**: Automated ICT sniper entries, momentum scalpers, and drawdown protection gates.
4. **Automated Trade Journal**: Logs executions, drawdown metrics, risk-to-reward ratios, and screenshot captures.

---

## ??? Quick Start

### 1. MT5 Python Bridge
`ash
python mt5_bridge.py
`

### 2. Frontend Cockpit
`ash
cd frontend
npm install
npm run dev
`

Visit [http://localhost:3003](http://localhost:3003).

---

## ?? License
Private & Proprietary — Ros Rendo
