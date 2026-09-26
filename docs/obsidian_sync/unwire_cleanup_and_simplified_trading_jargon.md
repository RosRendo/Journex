# Dead Route Purge, Mock Deletion & Strategy Jargon Simplification

## Summary of Changes
Cleaned up dead/unwired frontend routes, purged static mock components (`DashboardIntelligenceCarousel` and `ContextDeck`), and replaced confusing academic/theoretical ICT and SMC jargon with clean, intuitive, visual trading concepts.

## 1. Dead, Mock & Unwired Files Deleted
- `DashboardIntelligenceCarousel.tsx` (*"Market Intelligence Pulse"*): Deleted static mock headlines and confusing theoretical slides.
- `ContextDeck.tsx` (*"Context Deck"*): Deleted collapsible drawer containing hardcoded static numbers and theoretical ICT text.
- `frontend/app/journals/` (and `[id]/page.tsx`): Duplicate dead route from legacy implementation. Canonical journal is `/journal`.
- `frontend/app/layout/`: Legacy image layout gallery unreferenced by navigation or router.
- `frontend/components/ui/TradeJournalCard.tsx`: Unused orphaned component.
- `CockpitPeekDrawer.tsx`: Purged the text-heavy `playbook_coach` block and removed its launcher chip to eliminate theoretical text clutter.

## 2. Replaced Confusing ICT/SMC Jargon with Clean Visual Concepts
- **Setup Classification**:
  - Replaced *"Discount FVG + Asian Low Sweep"* with **"Key Support Level Pullback & Reversal"**.
  - Replaced *"Judas Swing Reversal + Premium OB"* with **"Resistance Level Rejection"**.
  - Replaced *"H1 Breaker Block Retest"* with **"Breakout & Key Level Retest"**.
  - Replaced *"H4 Demand Zone + CVD Absorption"* with **"Demand Zone Buyer Absorption"**.
- **Confluence Factors**:
  - Replaced *"Asian Low Liquidity Raid: Swept"* with **"Key Price Level: Tested & Held ✓"**.
  - Replaced *"M5 Market Structure Shift (MSS)"* with **"Trend Alignment: Higher High Confirmed ✓"**.
  - Replaced *"Discount Fair Value Gap (FVG)"* with **"Risk-to-Reward: 1:2.1 Target Verified ✓"**.
- **Cockpit Chart**:
  - Replaced *"AdaptiveICT Pro Chart"* with **"Live Chart Workspace"**.
  - Replaced *"ICT Overlays (FVG, OB, Liquidity)"* with **"Visual Overlays (Imbalance, Demand Zones, Key Targets, Midpoint 50%)"**.
- **Bot EA**:
  - Replaced *"Baseline ICT Scalper"* with **"Adaptive Momentum Scalper"**.
