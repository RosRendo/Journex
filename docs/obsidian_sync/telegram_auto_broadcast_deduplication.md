# Telegram Auto-Broadcast & Restart Deduplication System

## Overview
When the server starts (via `npm run dev` or `RUN_ALL.bat`), the user may open and close their laptop 2-3 times a day. To avoid spamming Telegram with duplicate news headlines and duplicate confluence signals while ensuring instant delivery of active signals and breaking news on launch, an automated broadcaster with persistent disk-backed deduplication was implemented.

## Key Architecture Decisions

1. **Persistent State Storage**:
   - `backend/data/posted_news.json`: Tracks MD5 headline hashes, publication tags, impact levels, and ISO timestamps.
   - `backend/data/posted_signals.json`: Tracks active pair states (`symbol`, `type`, `entry_price`, `timeframe`, `grade`, `confidence`, `signal_id`, `postedAt`).

2. **Instant Startup Check**:
   - On server launch (`app.listen` in `backend/src/server.ts`), `startAutoBroadcaster()` triggers an immediate scan after a 2.5-second warmup.
   - **News**: Dispatches top unposted breaking/high-impact news items immediately.
   - **Signals**: Dispatches current active ICT confluence signals across all monitored pairs (`XAUUSD`, `EURUSD`, `GBPUSD`, `BTCUSD`, `USDJPY`) immediately.

3. **Restart Deduplication (No Duplicates on 2nd/3rd Launch)**:
   - When the user starts `npm run dev` later that day:
     - News headlines already present in `posted_news.json` are skipped.
     - Signals for pairs that share the same direction (`BUY`/`SELL`), price range (within tolerance threshold), and have been posted within the last 12 hours are skipped.
   - Only when a **new** setup hits (direction flips, price level breaks to new zone, or new setup emitted by the scanner/bridge) will a new signal alert be dispatched.

4. **Background Continuous Polling**:
   - Every 60 seconds while the server runs, checks for newly arrived breaking news or signal updates in the background.

5. **Thread Isolation**:
   - Signals are routed to the designated Telegram Topic/Thread (`telegram_thread_signals: "9"`).
   - News is routed to general/news chat without inheriting signals thread ID.

6. **Source Attribution & Clickable Article Links**:
   - Integrated live financial RSS feeds (CNBC Finance, MarketWatch) into `externalFeedsService.ts`.
   - Every Telegram news alert includes verified source attribution (`📌 Source: CNBC` / `MarketWatch` / `Bloomberg` / `Reuters`).
   - Every alert includes a direct, one-click clickable article URL (`🔗 Read Story: https://...`) or web search verification link.
   - Enriched macro context: Market Sentiment, Impacted Assets, Trading Impact explanation, and Action Plan.
