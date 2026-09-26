# Ecosystem Context Launcher & Cockpit Slide-Over Architecture

## Overview
The **Cockpit Intelligence Workspace** on `/dashboard` now bridges 100% of the platform's tools into a single visual execution hub. Instead of navigating away to distinct pages or wading through dense text tables, every tool is accessible via 1-click **Context Peeks** that open interactive slide-over drawers with 80% Visual / 20% Text density.

## Key Components

### 1. Ecosystem Context Strip (`EcosystemContextLauncher.tsx`)
Positioned directly in **Zone 1** beneath the universal radial gauges (`EcosystemPulseBar`), providing a horizontal ribbon of connected tools with status chips and badges:
- **Macro Desk** (`/macro`): D1 flow, DXY correlation, SMT accumulation.
- **Setup Scanner** (`/signals`): Algorithmic ICT setup proximity.
- **Execution Terminal** (`/terminal`): 1-click staging order ticket with MT5 transmission.
- **Positions Manager** (`/positions`): Active exposure & floating PnL.
- **Bot EA Telemetry** (`/bot`): Live automated EA state, active preset (`Baseline ICT Scalper`), and emergency killswitch.
- **Emergency MT5 Scripts** (`/script`): Panic Close All, Move SL to Breakeven (+1 pip), Take 50% Partials, Purge Pending Orders.
- **Risk Guard** (`/risk`): 1% account preservation, daily loss limit lock, cooldown trigger.
- **Lot Size Calculator** (`/calculators`): Dynamic lot calculation slider (equity, risk %, stop loss pips).
- **News & Calendar** (`/calendar`): High-impact event timer (CPI/FOMC) & blackout countdown.
- **Playbook AI** (`/playbook`): Model rules compliance check (Asian sweep, FVG, MSS).
- **Daily Journal** (`/journal`): 1-tap emotional state buttons & discipline audit.
- **Review Hub** (`/review`): Daily debrief questionnaire & challenge milestones.
- **Quant Analytics** (`/analytics`): Edge adherence & win rate payoff curves.
- **Alerts Monitor** (`/alerts`): Technical breach sound & webhook triggers.

### 2. Multi-Mode Slide-Over Drawer (`CockpitPeekDrawer.tsx`)
Progressive disclosure drawer supporting 17 specialized visual layouts with zero empty states, interactive toggle controls, and 1-click execution actions.

## Visual Design Standards
- **80% Visual / 20% Text**: Replaced multi-line text with status chips (`ARMED ✓`, `MUTED`, `PASSED`), radial dials, and progress bars.
- **Color Codes**:
  - `#20e0b2`: Bullish / Win / Verified / Low Risk
  - `#ff5c73`: Bearish / Drawdown / High Risk / Stop Loss
  - `#38bdf8`: Session Overlap / New York / Active Window
  - `#f5c451`: High Volatility / Asian Range / Pending
  - `#8b5cf6`: Automation / Bot EA / Playbook AI
