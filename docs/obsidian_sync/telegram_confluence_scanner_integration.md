# Telegram Confluence Scanner & Interactive Bot Integration

## Overview
Added real-time confluence verification, factor checklists, and interactive bot commands to Telegram alerts and the automated broadcaster.

## 1. Confluence Verification on Telegram Alerts
When scanner signals are pushed (startup or background), alerts now include:
- **Confluence Score & Grade**: e.g., `84/100 [Grade A+]`
- **Threshold Status**: `✅ PASSED (Threshold >= 70)`
- **Detailed Factor Checklist**:
  - `✅ Liquidity Sweep (+25 pts)`
  - `✅ Market Structure Shift (MSS) Displacement (+25 pts)`
  - `✅ Fair Value Gap (FVG) / Order Block Retest (+20 pts)`
  - `✅ Killzone / Macro Correlation Alignment (+14 pts)`
- **Risk / Reward Ratio**: `1:2.1 RR`

## 2. Interactive Telegram Bot Listener (`telegramBotListenerService.ts`)
The bot (`@dashboardkiller_bot`) actively listens for incoming commands via Telegram Bot API:
- `/confluence` or `/check`: Sends live Confluence Radar for all top pairs (XAUUSD, EURUSD, GBPUSD, BTCUSD, USDJPY) with scores, grades, and pass/fail states.
- `/check <symbol>` (e.g., `/check XAUUSD` or `/check gold`): Sends a dedicated, deep confluence audit for the requested pair (Price, Entry Zone, Invalidation SL, Target TP, Factor breakdown).
- `/signals`: Posts latest active trade signals with parameters.
- `/news`: Posts latest high-impact macro news headlines with pair impact.
- `/score`: Explains score thresholds (70 min, 80+ A+, 90+ A++) and re-alert rules.
- `/help`: Lists available commands.

## 3. On-Demand REST Endpoints
- `POST /api/telegram/check-confluence`: Triggers an on-demand Confluence Radar broadcast to Telegram. If `{ symbol: "XAUUSD" }` is provided, dispatches an individual pair audit.
- `GET /api/telegram/broadcast-status`: Returns deduplication cache status.

## 4. Localized Cambodia Timezone (UTC+7)
All timestamps across Telegram alerts, scanner signals, breaking news, confluence radar, and pair audits are formatted in Cambodia local time:
- Timezone: `UTC+7 (Indochina Time / Asia/Phnom_Penh)`
- Format: `YYYY-MM-DD HH:mm:ss (UTC+7)`

