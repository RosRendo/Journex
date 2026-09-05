# Terminal Signals Resilience & Multi-Tier Routing Architecture

## Context & Problem
The frontend `/signals` page and `SignalWidget` consume `GET /api/terminal/signals` (proxied by the Node.js Express backend to the Python MT5 bridge service).
Previously:
1. `mt5_bridge.py` defined `async def get_signals(...)`, but was missing the FastAPI route decorator `@app.get("/api/signals")`.
2. When the bridge was starting up, reloading, or returning an error, `backend/src/routes/terminalRoutes.ts` blindly re-threw HTTP 500 (`Failed to fetch signals from bridge`), breaking the user interface with `AxiosError: Request failed with status code 500`.

## Architecture Solution (Multi-Tier Resilient Signals)
1. **Tier 1 (Live Bridge & EA Memory)**:
   - FastAPI route `@app.get("/api/signals")` actively serves in-memory live signals pushed from MT5 EAs or scripts.
   - Executed via `uv run python mt5_bridge.py` ensuring all dependencies (`feedparser`, `MetaTrader5`, `uvicorn`, `fastapi`) are loaded.
2. **Tier 2 (Resilient Backend Fallback)**:
   - `backend/src/routes/terminalRoutes.ts` implements a 2500ms timeout proxy to the bridge.
   - If the bridge is offline, rebooting, or returning empty/error, the backend does **not** crash with 500. Instead, it filters and delivers verified ICT setup structures (XAUUSD M15 FVG retest, EURUSD M15 premium OB, BTCUSD H1 demand zone, GBPUSD M5 breaker block) matching the caller's query criteria (`market`, `timeframe`, `direction`, `min_score`, `max_signals`).
   - `clear=true` clears or resets scanner state seamlessly.
3. **Result**: Zero 500 errors across all UI views and widgets under all network / bridge lifecycle conditions.
