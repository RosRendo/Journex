import axios from "axios";
import crypto from "crypto";

const cache: Record<string, { t: number; payload: any }> = {};
const TTL = 30 * 1000; // 30 seconds in ms

function hitCache(key: string): any | null {
  const c = cache[key];
  if (c && (Date.now() - c.t) < TTL) {
    return c.payload;
  }
  return null;
}

function trimCache(targetCache: Record<string, any>, limit = 50) {
  const keys = Object.keys(targetCache);
  if (keys.length > limit) {
    const oldestKey = keys.reduce((oldest, current) => {
      return targetCache[current].t < targetCache[oldest].t ? current : oldest;
    });
    delete targetCache[oldestKey];
  }
}

function setCache(key: string, payload: any) {
  cache[key] = { t: Date.now(), payload };
  trimCache(cache, 50);
}

const COIN_IDS: Record<string, string> = {
  "BTCUSD": "bitcoin", "ETHUSD": "ethereum", "BNBUSD": "binancecoin",
  "SOLUSD": "solana", "XRPUSD": "ripple", "ADAUSD": "cardano",
  "DOGEUSD": "dogecoin", "AVAXUSD": "avalanche-2",
  "MATICUSD": "polygon-ecosystem-token",
};

export async function fetchCoinGecko(symbols?: string[]): Promise<any[]> {
  const syms = symbols && symbols.length ? symbols : Object.keys(COIN_IDS);
  const cacheKey = "cg:" + syms.join(",");
  const hit = hitCache(cacheKey);
  if (hit !== null) return hit;

  const ids = syms.map(s => COIN_IDS[s.toUpperCase()]).filter(Boolean).join(",");
  if (!ids) return [];

  const url = "https://api.coingecko.com/api/v3/simple/price";
  try {
    const res = await axios.get(url, {
      params: { ids, vs_currencies: "usd", include_24hr_change: "true" },
      timeout: 10000
    });
    const data = res.data;
    const out: any[] = [];
    for (const sym of syms) {
      const cg = COIN_IDS[sym.toUpperCase()];
      if (cg && data[cg]) {
        const usd = data[cg].usd;
        if (usd === undefined || usd === null) continue;
        const chg = data[cg].usd_24h_change || 0;
        out.push({
          symbol: sym.toUpperCase(),
          price: parseFloat(usd.toFixed(usd < 100 ? 2 : 0)),
          digits: 2,
          change_pct: parseFloat(chg.toFixed(2)),
          change_pips: 0.0,
          bid: usd,
          ask: usd,
        });
      }
    }
    setCache(cacheKey, out);
    return out;
  } catch (error: any) {
    console.warn("CoinGecko failed:", error.message);
    return [];
  }
}

export async function fetchTECalendar(apiKey?: string, daysAhead = 7): Promise<any[]> {
  const cacheKey = `te:${daysAhead}`;
  const hit = hitCache(cacheKey);
  if (hit !== null) return hit;

  const formatDate = (date: Date) => {
    return date.toISOString().substring(0, 10);
  };
  const start = formatDate(new Date());
  const end = formatDate(new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000));
  const key = apiKey || "guest:guest";
  const url = `https://api.tradingeconomics.com/calendar/country/All/${start}/${end}`;

  try {
    const res = await axios.get(url, {
      params: { c: key, f: "json" },
      timeout: 15000
    });
    const data = res.data;
    const out: any[] = [];
    const events = Array.isArray(data) ? data : [];
    for (const e of events.slice(0, 80)) {
      const imp = e.Importance || 1;
      const impact = imp === 3 ? "high" : imp === 2 ? "med" : "low";
      out.push({
        time_iso: e.Date,
        country: (e.CountryCode || e.Country || "").slice(0, 2).toUpperCase(),
        title: e.Event || "",
        impact,
        forecast: String(e.Forecast || "—"),
        previous: String(e.Previous || "—"),
        expected_move_pips: impact === "high" ? 60 : impact === "med" ? 30 : 15,
        source: "tradingeconomics",
      });
    }
    setCache(cacheKey, out);
    return out;
  } catch (error: any) {
    console.warn("Trading Economics failed:", error.message);
    return [];
  }
}

// ----------------------------------------------------
// MYFXBOOK SCRAPER / OUTLOOK
// ----------------------------------------------------
const sessionCache: Record<string, { session: string | null; t: number }> = {};
const SESSION_TTL = 6 * 3600 * 1000; // 6 hours in ms

function getCacheKey(email: string, password: string): string {
  return crypto.createHash("sha256").update(`${email}:${password}`).digest("hex");
}

async function loginMyFXBook(email: string, password: string): Promise<string | null> {
  try {
    const res = await axios.get("https://www.myfxbook.com/api/login.json", {
      params: { email, password },
      timeout: 10000
    });
    const data = res.data;
    if (data.error) {
      console.warn("MyFXBook login error:", data.message);
      return null;
    }
    return data.session || null;
  } catch (error: any) {
    console.warn("MyFXBook login failed:", error.message);
    return null;
  }
}

async function ensureMyFXBookSession(email: string, password: string): Promise<string | null> {
  const now = Date.now();
  const ck = getCacheKey(email, password);
  const entry = sessionCache[ck];
  if (entry && entry.session && (now - entry.t) < SESSION_TTL) {
    return entry.session;
  }
  const session = await loginMyFXBook(email, password);
  sessionCache[ck] = { session, t: now };

  // Trim cache
  const keys = Object.keys(sessionCache);
  if (keys.length > 8) {
    const oldestKey = keys.reduce((oldest, current) => {
      return sessionCache[current].t < sessionCache[oldest].t ? current : oldest;
    });
    delete sessionCache[oldestKey];
  }
  return session;
}

export async function fetchCommunityOutlook(email: string, password: string): Promise<any[]> {
  if (!email || !password) return [];
  let session = await ensureMyFXBookSession(email, password);
  if (!session) return [];

  try {
    const url = "https://www.myfxbook.com/api/get-community-outlook.json";
    const res = await axios.get(url, {
      params: { session },
      timeout: 10000
    });
    let data = res.data;
    if (data.error) {
      // Session may have expired — clear cache and retry once
      const ck = getCacheKey(email, password);
      delete sessionCache[ck];
      session = await ensureMyFXBookSession(email, password);
      if (!session) return [];
      const res2 = await axios.get(url, {
        params: { session },
        timeout: 10000
      });
      data = res2.data;
      if (data.error) return [];
    }

    const out: any[] = [];
    const symbols = Array.isArray(data.symbols) ? data.symbols : [];
    for (const s of symbols) {
      out.push({
        symbol: s.name,
        long_pct: parseInt(s.longPercentage || 0),
        short_pct: parseInt(s.shortPercentage || 0),
        long_volume: parseFloat(s.longVolume || 0),
        short_volume: parseFloat(s.shortVolume || 0),
        long_positions: parseInt(s.longPositions || 0),
        short_positions: parseInt(s.shortPositions || 0),
      });
    }
    return out;
  } catch (error: any) {
    console.warn("MyFXBook outlook failed:", error.message);
    return [];
  }
}

// ----------------------------------------------------
// NEWS HEADLINES CACHING & FETCHERS
// ----------------------------------------------------
const newsCache: Record<string, { t: number; payload: any }> = {};
const NEWS_CACHE_TTL = 60 * 1000; // 60 seconds

export async function fetchMarketaux(token: string, symbol?: string, limit = 12): Promise<any[]> {
  const params: Record<string, any> = {
    api_token: token,
    language: "en",
    limit,
    filter_entities: "true",
  };
  if (symbol) {
    params.symbols = symbol;
  }
  const res = await axios.get("https://api.marketaux.com/v3/news/all", {
    params,
    timeout: 10000
  });
  const data = res.data;
  const articles = Array.isArray(data.data) ? data.data : [];
  const out: any[] = [];
  for (const a of articles) {
    const entities = Array.isArray(a.entities) ? a.entities : [];
    const sentiment_raw = entities.length ? (entities[0].sentiment_score || 0) : 0;
    out.push({
      time_iso: a.published_at,
      tag: String(a.source || "NEWS").toUpperCase().slice(0, 12),
      headline: a.title || "",
      url: a.url,
      impact: Math.abs(sentiment_raw) > 0.5 ? "high" : "med",
      affects: entities.map((e: any) => e.symbol).slice(0, 3),
      sentiment: sentiment_raw > 0.1 ? "bullish" : sentiment_raw < -0.1 ? "bearish" : "neutral",
      source: "marketaux",
    });
  }
  return out;
}

export async function fetchNewsAPI(apiKey: string, query = "forex OR currency OR stocks OR fed", limit = 12): Promise<any[]> {
  const params = {
    q: query,
    language: "en",
    sortBy: "publishedAt",
    pageSize: limit,
    apiKey,
  };
  const res = await axios.get("https://newsapi.org/v2/everything", {
    params,
    timeout: 10000
  });
  const data = res.data;
  const articles = Array.isArray(data.articles) ? data.articles : [];
  const out: any[] = [];
  for (const a of articles) {
    out.push({
      time_iso: a.publishedAt,
      tag: String(a.source?.name || "NEWS").toUpperCase().slice(0, 12),
      headline: a.title || "",
      url: a.url,
      impact: "med",
      affects: [],
      sentiment: "neutral",
      source: "newsapi",
    });
  }
  return out;
}

export async function fetchLiveFinancialRSS(limit = 12): Promise<any[]> {
  const feeds = [
    { url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", source: "CNBC" },
    { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", source: "MarketWatch" }
  ];

  const results: any[] = [];
  for (const f of feeds) {
    try {
      const res = await axios.get(f.url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        timeout: 6000
      });
      const body = res.data;
      if (typeof body === "string") {
        const itemMatches = body.match(/<item>([\s\S]*?)<\/item>/g) || [];
        for (const chunk of itemMatches.slice(0, 6)) {
          const title = (chunk.match(/<title>([\s\S]*?)<\/title>/) || [])[1]
            ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&#39;/g, "'")
            .replace(/&#x2019;/g, "'")
            .replace(/&#x2018;/g, "'")
            .replace(/&#x2014;/g, "—")
            .replace(/&#x2013;/g, "–")
            .trim();
          const link = (chunk.match(/<link>([\s\S]*?)<\/link>/) || [])[1]
            ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
            .trim();
          const pubDate = (chunk.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]?.trim();
          if (title && link) {
            const tLower = title.toLowerCase();
            const isHigh = tLower.includes("fed") || tLower.includes("inflation") || tLower.includes("rate") || tLower.includes("jobs") || tLower.includes("cpi") || tLower.includes("tariff") || tLower.includes("war");
            results.push({
              time_iso: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
              tag: isHigh ? "BREAKING" : f.source.toUpperCase(),
              headline: title,
              url: link,
              impact: isHigh ? "high" : "med",
              affects: ["USD", "DXY", "EQUITIES"],
              sentiment: "neutral",
              source: f.source
            });
          }
        }
      }
    } catch (e: any) {
      console.warn(`[RSS] Failed fetching from ${f.source}:`, e.message);
    }
  }

  return results.slice(0, limit);
}

export async function getRealNews(apiKeys: Record<string, string>, symbol?: string, limit = 12): Promise<{ provider: string; items: any[]; cached?: boolean; errors?: string[] }> {
  const cacheKey = `news:${symbol || "all"}`;
  const now = Date.now();
  const cached = newsCache[cacheKey];
  if (cached && (now - cached.t) < NEWS_CACHE_TTL) {
    return { ...cached.payload, cached: true };
  }

  const mtx = apiKeys?.marketaux;
  const napi = apiKeys?.newsapi;
  const errors: string[] = [];

  if (mtx) {
    try {
      const items = await fetchMarketaux(mtx, symbol, limit);
      if (items && items.length) {
        const payload = { provider: "marketaux", items };
        newsCache[cacheKey] = { t: now, payload };
        trimCache(newsCache, 50);
        return { ...payload, cached: false };
      }
    } catch (e: any) {
      errors.push(`marketaux: ${e.message}`);
      console.warn("Marketaux failed:", e.message);
    }
  }

  if (napi) {
    try {
      const items = await fetchNewsAPI(napi, "forex OR currency OR stocks OR fed", limit);
      if (items && items.length) {
        const payload = { provider: "newsapi", items };
        newsCache[cacheKey] = { t: now, payload };
        trimCache(newsCache, 50);
        return { ...payload, cached: false };
      }
    } catch (e: any) {
      errors.push(`newsapi: ${e.message}`);
      console.warn("NewsAPI failed:", e.message);
    }
  }

  // Live Financial RSS fallback (CNBC & MarketWatch)
  try {
    const rssItems = await fetchLiveFinancialRSS(limit);
    if (rssItems && rssItems.length) {
      const payload = { provider: "rss", items: rssItems };
      newsCache[cacheKey] = { t: now, payload };
      trimCache(newsCache, 50);
      return { ...payload, cached: false };
    }
  } catch (rssErr: any) {
    errors.push(`rss: ${rssErr.message}`);
  }

  return { provider: "none", items: [], errors, cached: false };
}
