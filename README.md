# 📈 Journex — Institutional Trading Cockpit & Adaptive ICT Engine

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black.svg?logo=next.js)
![Express](https://img.shields.io/badge/Express-4.19-000000.svg?logo=express)
![Python](https://img.shields.io/badge/Python-3.11_MT5_IPC-3776AB.svg?logo=python)
![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748.svg?logo=prisma)
![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-f69220.svg?logo=pnpm)
![License](https://img.shields.io/badge/License-Proprietary-red.svg)

**High-frequency algorithmic trading intelligence desk, live MetaTrader 5 IPC socket bridge, macro liquidity confluence analytics, and automated ICT execution workspace.**

[System Architecture](#-system-architecture) • [Database ERD](#-database-erd) • [Execution Flow](#-algorithmic-execution--journal-flow) • [Quick Start](#-quick-start)

</div>

---

## ⚡ Overview

**Journex** transforms raw financial market data into high-probability execution setups. It connects a reactive Next.js trading cockpit with a dedicated low-latency Python IPC bridge interfacing directly with **MetaTrader 5 (MT5)**, providing sub-millisecond execution, automated risk parameters, and an institutional trade journal.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Frontend["🖥️ Trading Cockpit (Next.js 16 + React 19)"]
        Chart["Interactive TradingView Canvas & Depth Map"]
        ConfluenceMatrix["ICT Macro Confluence Scoring Engine"]
        OrderDesk["One-Click Execution & Risk Ladder"]
        JournalTable["Analytical Trade Journal & PnL Curve"]
        
        Chart & ConfluenceMatrix & OrderDesk & JournalTable
    end

    subgraph Gateway["⚡ API Gateway & WebSocket Hub (Node.js)"]
        REST["Express.js Trading Gateway"]
        WS["WebSocket Server (Live Ticks & Book Events)"]
        RiskEngine["Client Risk Rules & Max Drawdown Guard"]
        
        Frontend <--> REST
        Frontend <--> WS
        REST --> RiskEngine
    end

    subgraph IPCBridge["🐍 Python 3.11 MT5 Low-Latency IPC Bridge"]
        SocketServer["Fast IPC Named Pipe / Socket"]
        MT5Adapter["MetaTrader5 C-Python Native API Wrapper"]
        EventStreamer["Tick Event Streamer & Fill Listener"]
        
        RiskEngine <--> SocketServer
        SocketServer <--> MT5Adapter
        MT5Adapter --> EventStreamer
        EventStreamer --> WS
    end

    subgraph Broker["🏛️ MetaTrader 5 Terminal"]
        MT5App["MetaTrader 5 Desktop Terminal"]
        BrokerServer["Institutional Liquidity Provider / Broker"]
        
        MT5Adapter <--> MT5App <--> BrokerServer
    end

    subgraph DataStore["💾 Persistence Layer"]
        Postgres[(PostgreSQL Trade Database)]
        PrismaClient["Prisma 6 Client"]
        
        REST <--> PrismaClient <--> Postgres
    end
```

---

## 📊 Database ERD

```mermaid
erDiagram
    ACCOUNTS ||--o{ TRADES : executes
    TRADES ||--o{ CONFLUENCES : scored_by
    ACCOUNTS ||--o{ RISK_RULES : enforces
    ACCOUNTS ||--o{ DAILY_JOURNALS : records

    ACCOUNTS {
        string id PK "UUID"
        string accountNumber UK
        string brokerName
        decimal balance
        decimal equity
        int leverage
        string currency
    }

    TRADES {
        string id PK "UUID"
        string accountId FK
        string ticketNumber UK
        string symbol
        string type "BUY | SELL"
        decimal lotSize
        decimal openPrice
        decimal closePrice
        decimal stopLoss
        decimal takeProfit
        decimal pnl
        datetime openTime
        datetime closeTime
    }

    CONFLUENCES {
        string id PK "UUID"
        string tradeId FK
        string session "ASIA | LONDON | NY"
        boolean fvgMatched
        boolean orderBlockConfirmed
        boolean liquiditySweepDetected
        int score
    }

    RISK_RULES {
        string id PK "UUID"
        string accountId FK
        decimal maxDailyDrawdownPercent
        decimal maxRiskPerTradePercent
        int maxOpenTrades
    }

    DAILY_JOURNALS {
        string id PK "UUID"
        string accountId FK
        date tradingDay
        decimal netPnl
        int winCount
        int lossCount
        text reflections
    }
```

---

## 🔄 Algorithmic Execution & Journal Flow

```mermaid
sequenceDiagram
    autonumber
    actor Trader as 📊 Professional Trader
    participant Cockpit as 🖥️ Next.js Cockpit
    participant NodeAPI as ⚡ Express Gateway
    participant PyIPC as 🐍 Python MT5 Bridge
    participant MT5 as 🏛️ MetaTrader 5
    participant DB as 💾 PostgreSQL

    Trader->>Cockpit: Execute Order (XAUUSD Buy, 1.00 Lot, SL/TP set)
    Cockpit->>NodeAPI: POST /api/orders { symbol: "XAUUSD", volume: 1.0, sl, tp }
    NodeAPI->>NodeAPI: Validate against Risk Rules (Max Drawdown OK)
    
    NodeAPI->>PyIPC: Socket IPC: ORDER_SEND payload
    PyIPC->>MT5: Native mt5.order_send() API call
    MT5-->>PyIPC: Order Filled (Ticket: #9823411, Fill: 2034.50)
    
    PyIPC-->>NodeAPI: IPC Return Fill Confirmation
    NodeAPI->>DB: Insert trades and confluences
    NodeAPI-->>Cockpit: WS Broadcast: Live Position Opened
    Cockpit-->>Trader: 🔔 Sound Alert: Order Filled at 2034.50
```

---

## 🚀 Quick Start

### 1. Start Python MT5 IPC Bridge (Windows)
```bash
cd backend/python
pip install -r requirements.txt
python mt5_bridge.py
```

### 2. Start Gateway & Cockpit
```bash
cd ../..
pnpm install
pnpm run dev
```

Visit `http://localhost:3000` to launch the Journex cockpit.

---

## 📄 License
Proprietary & Confidential — Engineered by **[Ros Rendo](https://github.com/RosRendo)**
