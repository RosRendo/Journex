import fs from 'fs';

const path = "d:\\Forex\\journex\\backend\\src\\routes\\terminalRoutes.ts";
let content = fs.readFileSync(path, 'utf8');

// The block starts around line 620 and ends around 750
// We will replace it using a script to ensure accuracy.

const startMarker = `    // Fetch candles via adapter, fallback if error`;
const endMarker = `    res.json({`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find markers");
    process.exit(1);
}

const replacement = `
    // Execute all independent asynchronous tasks concurrently to massively speed up load times (especially over proxies)
    const [
      candlesRes,
      watchlistRes,
      positionsRes,
      accountRes,
      orderBookRes,
      pingRes,
      journalRes,
      eventsRes,
      newsRes,
      outlookRes
    ] = await Promise.allSettled([
      adapter.getCandles(symbol, timeframe, 200),
      getWatchlist(adapter),
      adapter.getPositions(),
      adapter.getAccount(),
      getOrderBook(symbol),
      adapter.ping(),
      getJournalList(),
      (async () => {
        const keys = getSettings().api_keys || {};
        if (keys.tradingeconomics) return await fetchTECalendar(keys.tradingeconomics, 3);
        return null;
      })(),
      (async () => {
        const keys = getSettings().api_keys || {};
        return await getRealNews(keys, symbol, 6);
      })(),
      (async () => {
        const keys = getSettings().api_keys || {};
        if (keys.myfxbook_email && keys.myfxbook_password) {
           return await fetchCommunityOutlook(keys.myfxbook_email, keys.myfxbook_password);
        }
        return null;
      })()
    ]);

    // Handle results and fallbacks
    let candles = candlesRes.status === "fulfilled" && candlesRes.value ? candlesRes.value : generateCandles(symbol, timeframe, 200);
    if (candlesRes.status === "rejected") console.warn("Failed to fetch candles via adapter, using mock fallback:", candlesRes.reason);

    const watchlist = watchlistRes.status === "fulfilled" && watchlistRes.value ? watchlistRes.value : [];
    
    let positions = positionsRes.status === "fulfilled" && positionsRes.value ? positionsRes.value : undefined;
    if (positionsRes.status === "rejected") {
      console.warn("Failed to fetch positions via adapter, using mock fallback:", positionsRes.reason);
    }
    if (!positions) {
      try { positions = await getPositionsList(); } catch(e) { positions = []; }
    }

    let account = accountRes.status === "fulfilled" && accountRes.value ? accountRes.value : undefined;
    if (accountRes.status === "rejected") {
      console.warn("Failed to fetch account via adapter, using mock fallback:", accountRes.reason);
    }
    if (!account) {
      try { account = await getAccountData(); } catch(e) { account = null; }
    }

    const order_book = orderBookRes.status === "fulfilled" && orderBookRes.value ? orderBookRes.value : undefined;
    const journal = journalRes.status === "fulfilled" && journalRes.value ? journalRes.value : [];

    let events = eventsRes.status === "fulfilled" && eventsRes.value && eventsRes.value.length ? eventsRes.value : getEvents(3);
    
    let news = newsRes.status === "fulfilled" && newsRes.value && newsRes.value.items && newsRes.value.items.length ? newsRes.value.items : getNews();

    let positioning;
    if (outlookRes.status === "fulfilled" && outlookRes.value && Array.isArray(outlookRes.value)) {
      const normSym = symbol.toUpperCase().replace("/", "");
      const match = outlookRes.value.find((item: any) => item.symbol.toUpperCase().replace("/", "") === normSym);
      if (match) {
        const extreme = Math.abs(match.long_pct - 50) >= 20;
        positioning = {
          retail: { long_pct: match.long_pct, short_pct: match.short_pct, trend: match.long_pct > 50 ? "up" : "down" },
          institutional: { long_pct: match.short_pct, short_pct: match.long_pct, trend: match.short_pct > 50 ? "up" : "down" },
          extreme, risk: extreme ? "high" : "low", provider: "myfxbook",
          note: \`MyFXBook: Retail is crowded \${match.long_pct > 50 ? "long" : "short"} (\${match.long_pct}%) while institutions are opposite (\${match.short_pct}%)\`
        };
      }
    }
    if (!positioning) positioning = getPositioning();

    const checklist = getSetupChecklist();
    const confluence = getConfluence();
    const central_banks = getCentralBanks();
    const correlations = getCorrelations();
    const volatility = getVolatility();
    const signals = getTechnicalSignals();
    const alerts = getAlertsList();

    const currentSettings = getSettings();
    const brokerProvider = currentSettings.broker?.provider || "mock";

    let connected = true;
    let pingMsg = "Connected";
    if (pingRes.status === "fulfilled") {
       connected = pingRes.value.ok;
       pingMsg = pingRes.value.message;
    } else {
       connected = false;
       pingMsg = pingRes.reason?.message || "Failed to ping broker";
    }

`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(path, newContent);
console.log("Replaced snapshot parallel execution successfully");
