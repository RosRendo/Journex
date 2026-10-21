# TradingView Decision Engine: 3-Tier Take Profit (TP1, TP2, TP3) Architecture

## 1. Context & Problem Statement
In previous versions of `AdaptiveICT_DecisionEngine.pine`:
- The Compact HUD table (default view, 8 rows) lacked rows for TP1, TP2, TP3, and Stop Loss.
- The Full HUD table only listed static ratio strings (e.g. `1.0 / 2.0 / 3.0 R`) rather than calculated price levels.
- Horizontal chart lines (`ln_tp1`, `ln_tp2`, `ln_tp3`) were drawn only upon active trade confirmation and immediately purged upon position exit, leaving charts blank during scanning/standby modes.

## 2. Architectural Design & Standardized Multi-Tier Targets
Standardized R:R configuration aligned with the multi-engine edge:
- **TP1 (1:1.2R)**: Safety scalp & Break-Even trigger (bank 40%, shift SL to entry).
- **TP2 (1:2.5R)**: Core structural target (bank 40% at key liquidity/order block).
- **TP3 (1:4.0R)**: Macro expansion runner (hold remaining 20% for trend continuation).

## 3. Implementation Details
1. **Global Target Calculations**:
   - `disp_entry`: Active entry price or live bar `close`.
   - `disp_sl`: Active stop loss or dynamic ATR/structure stop.
   - `disp_tp1`, `disp_tp2`, `disp_tp3`: Calculated dynamically based on trend bias (`disp_dir`) and standardized R:R multiples.
2. **Compact HUD (11 Rows)**:
   - Row 8: `🎯 EXECUTION TARGETS (TP / SL)` header.
   - Row 9: `TP1 (1.2R)` [Price] | `TP2 (2.5R)` [Price].
   - Row 10: `TP3 (4.0R)` [Price] | `Stop Loss` [Price].
3. **Full HUD (34 Rows)**:
   - Rows 21–23: Exact price levels for TP1, TP2, and TP3 with live hit checks (`✓`).
4. **Persistent On-Chart Forward Projection**:
   - Projected forward 16 bars on `barstate.islast`.
   - Distinct visual styles:
     - Entry: Solid blue line (`#3b82f6`).
     - Stop Loss: Dashed red line (`#ef4444`).
     - TP1: Dotted green line (`#22c55e`).
     - TP2: Dashed green line (`#22c55e`, width 2).
     - TP3: Solid emerald line (`#10b981`, width 2).
   - Right-axis labels for instant visual recognition.
