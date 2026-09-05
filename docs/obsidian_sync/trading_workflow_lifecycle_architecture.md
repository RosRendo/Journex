# Trading Workflow & Lifecycle Architecture: AdaptiveICT

## Philosophy: The 3 Layers of the Trading Station
1. **NAVIGATION (5 Pillars)**: Answers *"Where is the feature?"* (My Desk vs All Pages).
2. **WORKFLOW (Visual Entry Pipeline)**: Answers *"What do I do right now?"* (Live Radar Dashboard).
3. **TOOLS (Specialist Screens)**: Deep dives when research or deep auditing is required.

## The Continuous Trade Lifecycle Pipeline
Trading is not 30 disconnected pages; it is one continuous execution loop:

```
┌─────────────────┐
│  1. ENVIRONMENT │  Macro Desk (/macro/XAUUSD), News (/news), Calendar (/calendar)
└────────┬────────┘
         ↓
┌─────────────────┐
│  2. OPPORTUNITY │  Setup Scanner (/signals) - ICT confluences, FVG, liquidity sweeps
└────────┬────────┘
         ↓
┌─────────────────┐
│  3. DECIDE      │  Live Radar (/dashboard) - "What now?", best setup, wait vs trigger
└────────┬────────┘
         ↓
┌─────────────────┐
│  4. SIZE & RISK │  Risk Desk (/risk), Risk Calculator (/calculators) - 1% max risk
└────────┬────────┘
         ↓
┌─────────────────┐
│  5. EXECUTE     │  Execution Terminal (/terminal) - MT5 market/limit orders
└────────┬────────┘
         ↓
┌─────────────────┐
│  6. MANAGE      │  Positions (/positions) - Trailing stops, partials, floating PnL
└────────┬────────┘
         ↓
┌─────────────────┐
│  7. LEARN       │  Daily Journal (/journal), Trade Review (/review) - Audit & grade
└─────────────────┘
```

## My Desk: Two-Tier Structural Design
- **PRIMARY WORKFLOW (Permanent Core - Always Visible)**:
  - ⚡ **Live Radar** (`/dashboard`) — Role: *Decide*
  - 📡 **Setup Scanner** (`/signals`) — Role: *Find opportunities*
  - 🎯 **Execution** (`/terminal`) — Role: *Execute*
  - 📍 **Positions** (`/positions`) — Role: *Manage*
- **QUICK ACCESS (User Curated Pinned Tools)**:
  - 🌐 **Macro Desk** (`/macro/XAUUSD`) — Role: *Understand environment*
  - 📅 **Economic Calendar** (`/calendar`) — Role: *Timing & News*
  - 🛡️ **Risk Desk** (`/risk`) — Role: *Protect capital*
  - 📓 **Daily Journal** (`/journal`) — Role: *Learn & Review*
  - 📈 **Analytics** (`/analytics`) — Role: *Verify statistical edge*

## UI Naming: Human Concepts over Developer Concepts
- `/dashboard` → **Live Radar**
- `/signals` → **Setup Scanner**
- `/terminal` → **Execution**
- `/positions` → **Positions**
- `/macro/XAUUSD` → **Macro Desk**
- `/tradingstyle` → **Trading Profile**
- `/backtesting` → **Backtest Lab**
- `/notificationandmonitor` → **Market Monitor**
- `/calculators` → **Risk Calculator**
- `/practice` → **Practice Lab**
- `/review` → **Trade Review**

## UI Role Division
- **Sidebar**: *WHERE* (Navigation & quick jump)
- **Dashboard**: *WHAT NOW?* (Market tradeable? Best setup? Wait for retest?)
- **Command Palette**: *DO / ACTION* (Quick trade actions, calculations, scans)
- **Ecosystem Map**: *WHY & ROLE* (Bird's-eye lifecycle blueprint of all 30 tools)
