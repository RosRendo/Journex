# Frontend Navigation & Ecosystem Architecture

## Problem Diagnosis
The frontend accumulated over 30 distinct Next.js pages, but previous refactoring attempts forced ~25 pages into `HIDDEN_PAGES` and locked the sidebar to only 8 static routes.
As a result:
1. Users had to rely on `Ctrl+K` (Command Palette) every time they needed to access any secondary page.
2. The user experience suffered from cognitive overload: unused pages caused clutter when searching, while wanted pages remained invisible.
3. No visual hierarchy existed to distinguish daily trading execution from deep analytics, market intel, and system configuration.

## 5-Pillar Trader Hierarchy
All pages are grouped into 5 intuitive operational pillars:

1. **⚡ Live Trading & Execution**
   - `/dashboard` — Master Overview & Live PnL
   - `/terminal` — MT5 Execution Terminal
   - `/positions` — Live Open Positions & Exposure
   - `/signals` — Market Scanner & Trade Signals
   - `/bot` — Trading Bot EA Configurations
   - `/script` — MT5 Execution Scripts

2. **📈 Quant & Analytics**
   - `/analytics` — Advanced Trade Analytics & Edge Ratios
   - `/performance` — Account Performance & Drawdown Charts
   - `/tradingstyle` — Trader Archetype & Behavioral Metrics
   - `/backtesting` — Strategy Backtesting Engine

3. **🌐 Market Intel & Macro**
   - `/calendar` — Economic & PnL Calendar
   - `/news` — Live Market News & High-Impact Alerts
   - `/sentiment` — Retail Bias & Sentiment Gauges
   - `/macro/XAUUSD` — Macro Correlation & Fundamentals
   - `/notificationandmonitor` — Real-Time Market Monitor
   - `/indicator` — Custom Indicator Hub
   - `/alerts` — Price & Risk Alerts Manager

4. **📓 Journal & Performance Growth**
   - `/journal` — Trade Journaling & Screenshot Logging
   - `/journals` — Journal Archive
   - `/review` — Trade Review & Grade Audit Desk
   - `/review/daily` — End-Of-Day Debrief
   - `/playbook` — Trading Plan Forge & AI Coach
   - `/progress` — Challenge & Skill Progression

5. **🛡️ Risk Desk, Lab & System**
   - `/risk` — Risk Desk & Prop Rules Guard
   - `/calculators` — Lot Size, Pip Reference, Risk Tables
   - `/practice` — Gold & Flexibility Simulator
   - `/accounts` — MT5 Accounts Manager
   - `/settings` — Preferences, Bridges & Themes
   - *(Auxiliary: `/profile`, `/community`, `/subscription`, `/pricing`)*

## Solutions
1. **Interactive Ecosystem Map Modal (`EcosystemMapModal.tsx`)**:
   - Visual bird's-eye blueprint of all 5 pillars with 1-line tooltips explaining what each page does.
   - ⭐ Favorite / Pin toggle on every card to instantly curate the user's sidebar.
   - 1-click navigation without typing or memorizing routes.
2. **Dual-Mode Sidebar ("My Desk" vs "All Pages")**:
   - `My Desk`: Focused, uncluttered view showing only user-pinned items.
   - `All Pages`: Categorized accordion view showing the complete 5 pillars directly in the sidebar.
