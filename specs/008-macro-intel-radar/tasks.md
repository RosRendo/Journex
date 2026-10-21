# Tasks: Macro Intelligence & Data Sentiment Radar

**Spec**: [spec.md](./spec.md)  
**Status**: Completed  
**Branch**: `008-macro-intel-radar`

## Tasks

- [x] **Task 1**: Create `MacroIntelligenceRadar.tsx` component with:
  - [x] AI Macro Direction & Confidence badge (`BULLISH EXPANSION · 88%`)
  - [x] Executive macro thesis narrative & structural invalidation price level
  - [x] Intermarket Pressure Barometer with 3 live dials (`DXY`, `US10Y Yield`, `VIX`)
  - [x] Retail vs. Smart Money Sentiment & Contrarian Squeeze indicator
  - [x] High-Impact Economic Release Volatility Embargo countdown banner
  - [x] Real breaking wire catalysts list
- [x] **Task 2**: Integrate into [`frontend/app/macro/[pair]/page.tsx`](../../frontend/app/macro/[pair]/page.tsx):
  - [x] Replace static news card with `MacroIntelligenceRadar` in Right Rail tab (`Macro & AI`)
  - [x] Replace news card in Research Mode
  - [x] Add Dashboard return breadcrumb in `CommandCenterHeader.tsx`
- [x] **Task 3**: Verify compilation and cross-pair support (`XAUUSD`, `EURUSD`, `USDJPY` all returning HTTP 200 OK).
