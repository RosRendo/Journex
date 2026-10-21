/**
 * News Intelligence Service
 * 
 * Provides deep macro analysis, USD impact assessments, cross-asset reactions,
 * actionable trading playbooks, and direct verification links (ForexFactory, live source)
 * for economic and breaking market news headlines.
 */

export interface CurrencyReaction {
  symbol: string;
  bias: "bullish" | "bearish" | "neutral";
  formatted: string;
  note: string;
}

export interface NewsMacroIntelligence {
  headline: string;
  tag: string;
  impact: "high" | "med" | "low";
  explanation: string;
  usd_direction: "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE";
  usd_direction_formatted: string;
  usd_reason: string;
  regime: string;
  regime_formatted: string;
  trade_action: string;
  currencies: CurrencyReaction[];
  url: string;
  forexfactory_news_url: string;
  forexfactory_calendar_url: string;
}

export function analyzeNewsMacroImpact(
  headline: string,
  tag = "NEWS",
  impact: "high" | "med" | "low" = "med",
  providedUrl?: string,
  summary?: string
): NewsMacroIntelligence {
  const hLower = headline.toLowerCase();
  const summaryLower = (summary || "").toLowerCase();
  const text = `${hLower} ${summaryLower}`;

  // Default links
  const defaultArticleUrl = providedUrl || `https://www.google.com/search?q=${encodeURIComponent(headline + " market news")}`;
  const ffNewsUrl = "https://www.forexfactory.com/news";
  const ffCalUrl = "https://www.forexfactory.com/calendar";

  // Rule-based Macro Analysis Engine
  let explanation = "";
  let usd_direction: "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE" = "NEUTRAL";
  let usd_direction_formatted = "⚪ NEUTRAL / BALANCED";
  let usd_reason = "";
  let regime = "BALANCED";
  let regime_formatted = "⚖️ BALANCED RANGE";
  let trade_action = "";
  const currencies: CurrencyReaction[] = [];

  // 1. WAR / GEOPOLITICAL CONFLICT / MILITARY CRISIS (TOP PRIORITY)
  if (
    text.includes("war") ||
    text.includes("missile") ||
    text.includes("strike") ||
    text.includes("attack") ||
    text.includes("military") ||
    text.includes("conflict") ||
    text.includes("escalat") ||
    text.includes("invasion") ||
    text.includes("tensions") ||
    text.includes("geopolitic") ||
    text.includes("middle east")
  ) {
    explanation = "Geopolitical escalation and armed conflict trigger immediate, massive safe-haven inflows into physical gold and crude oil while crushing risk assets.";
    usd_direction = "BULLISH";
    usd_direction_formatted = "🔺 STRONG BULLISH (Defensive USD Reserve)";
    usd_reason = "Global panic triggers immediate repatriation into primary safe-haven assets (Gold and USD cash liquidity).";
    regime = "RISK_OFF";
    regime_formatted = "🚨 WAR / GEOPOLITICAL PANIC (Safe-Haven Flight)";
    trade_action = "Strongly buy Gold (XAU/USD) and Crude Oil pullbacks. Sell equities (NAS100) and risk currencies (EUR/USD, AUD/USD).";
    currencies.push(
      { symbol: "XAU/USD (Gold)", bias: "bullish", formatted: "📈 STRONG BUY / BULLISH (Safe-Haven Surge)", note: "Gold is the world's #1 hedge against war and military crisis" },
      { symbol: "WTI Crude Oil", bias: "bullish", formatted: "📈 STRONG BUY / BULLISH (Supply Fear)", note: "Threat to shipping channels and energy infrastructure" },
      { symbol: "EUR/USD", bias: "bearish", formatted: "📉 SELL / BEARISH (USD Flight)", note: "European proximity risk drives capital into defensive USD" },
      { symbol: "NAS100 / US500", bias: "bearish", formatted: "📉 SELL / BEARISH (Equities Dump)", note: "Institutions dump high-beta equities for cash safety" }
    );
  }
  // 2. TARIFFS / TRADE WAR / SANCTIONS
  else if (text.includes("tariff") || text.includes("trade war") || text.includes("sanction") || text.includes("trade tension")) {
    explanation = "Trade tariffs and protectionist policies threaten global commerce, fueling inflation and boosting defensive US Dollar & Gold demand.";
    usd_direction = "BULLISH";
    usd_direction_formatted = "🔺 BULLISH (Tariff USD Dominance)";
    usd_reason = "Tariffs are inflationary for the US and export-destructive for foreign trade partners.";
    regime = "TRADE_WAR";
    regime_formatted = "⚔️ TRADE WAR / PROTECTIONISM";
    trade_action = "Favor Gold (XAU/USD) and USD longs. Short export-sensitive currencies like AUD/USD and EUR/USD.";
    currencies.push(
      { symbol: "XAU/USD (Gold)", bias: "bullish", formatted: "📈 BUY / BULLISH (Uncertainty Hedge)", note: "Trade disruptions weaken fiat stability" },
      { symbol: "AUD/USD", bias: "bearish", formatted: "📉 SELL / BEARISH (Trade Drag)", note: "Aussie is heavily exposed to global trade and commodities" },
      { symbol: "EUR/USD", bias: "bearish", formatted: "📉 SELL / BEARISH (Export Hit)", note: "US tariffs hurt European industrial exports" },
      { symbol: "DXY (US Dollar)", bias: "bullish", formatted: "📈 BUY / BULLISH", note: "Tariffs keep domestic US interest rates firmer" }
    );
  }
  // 3. GERMAN / EUROPEAN ECONOMIC WEAKNESS (DAX, Factory Orders, German PMIs)
  else if (text.includes("german") || text.includes("dax") || (text.includes("factory orders") && text.includes("disappoint"))) {
    explanation = "German factory orders and industrial metrics contracted, signaling economic slowdown across Europe's core industrial hub and dragging down European equity benchmarks.";
    usd_direction = "BULLISH";
    usd_direction_formatted = "🔺 BULLISH / STRONG (Safe-haven & DXY boost)";
    usd_reason = "Euro weakness mechanically lifts the US Dollar Index (DXY, ~57.6% weighted to EUR). Global investors reallocate capital out of European assets into defensive US Dollar liquidity.";
    regime = "RISK_OFF";
    regime_formatted = "⚠️ RISK-OFF (European Slowdown / Industrial Drag)";
    trade_action = "Look for short EUR/USD continuation on intraday pullbacks into 15m/1h supply resistance. Avoid long DAX/European equities until stabilization base forms.";
    currencies.push(
      { symbol: "EUR/USD", bias: "bearish", formatted: "📉 SELL / BEARISH (Down)", note: "German manufacturing slump lowers Eurozone growth and ECB terminal rate expectations" },
      { symbol: "DXY", bias: "bullish", formatted: "📈 BUY / BULLISH (Up)", note: "EUR weighting in Dollar Index drives automatic inverse rise" },
      { symbol: "XAU/USD (Gold)", bias: "bullish", formatted: "📈 MILD BUY / BULLISH", note: "Supported by defensive hedging and risk-off sentiment" },
      { symbol: "DAX 40", bias: "bearish", formatted: "📉 SELL / BEARISH", note: "Contracting factory order backlogs pressure corporate earnings" }
    );
  }
  // 4. FED HAWKISH / RATE HIKES / STICKY INFLATION / HOT CPI
  else if (text.includes("fed") && (text.includes("hike") || text.includes("sticky") || text.includes("hawkish") || text.includes("higher for longer") || text.includes("delay cut") || text.includes("inflation"))) {
    explanation = "Federal Reserve officials emphasize persistent inflation risks, signaling that benchmark interest rates must remain elevated or rise further to cool domestic price pressures.";
    usd_direction = "BULLISH";
    usd_direction_formatted = "🔺 STRONG BULLISH (Yield Advantage)";
    usd_reason = "Higher Fed rates widen interest rate differentials in favor of the US Dollar, driving massive global yield flows into US Treasuries and USD cash instruments.";
    regime = "HAWKISH_TIGHTENING";
    regime_formatted = "🦅 HAWKISH (Rates Higher For Longer)";
    trade_action = "Favor USD longs against low-yielding counterparts (EUR/USD sell, USD/JPY buy on pullbacks). Beware holding long Gold or equities into strong US Treasury yield spikes.";
    currencies.push(
      { symbol: "DXY (US Dollar)", bias: "bullish", formatted: "📈 STRONG BUY / BULLISH", note: "Benchmark Treasury yields climb, driving cross-border USD demand" },
      { symbol: "EUR/USD", bias: "bearish", formatted: "📉 SELL / BEARISH (Down)", note: "Widening policy spread favors USD over EUR" },
      { symbol: "GBP/USD", bias: "bearish", formatted: "📉 SELL / BEARISH (Down)", note: "Dollar strength forces Sterling lower" },
      { symbol: "USD/JPY", bias: "bullish", formatted: "📈 BUY / BULLISH (Up)", note: "Yield divergence between US Treasuries and BOJ JGBs fuels carry trade" },
      { symbol: "XAU/USD (Gold)", bias: "bearish", formatted: "📉 SELL / BEARISH (Yield Drag)", note: "Higher non-yielding opportunity cost and Dollar strength press gold down" }
    );
  }
  // 5. FED DOVISH / RATE CUT / COOLING INFLATION / JOBS SLOWDOWN
  else if ((text.includes("fed") || text.includes("powell")) && (text.includes("cut") || text.includes("dovish") || text.includes("easing") || text.includes("pause"))) {
    explanation = "Federal Reserve signals policy easing or growing confidence that inflation is returning toward the 2% target, opening the door for rate reductions.";
    usd_direction = "BEARISH";
    usd_direction_formatted = "🔻 BEARISH / WEAK (Yield Compression)";
    usd_reason = "Anticipated rate cuts reduce US Treasury yield yields relative to foreign assets, causing capital to rotate out of cash USD into risk assets and foreign currencies.";
    regime = "RISK_ON";
    regime_formatted = "🚀 RISK-ON (Liquidity Easing)";
    trade_action = "Look for buy setups on EUR/USD, GBP/USD, and Gold (XAU/USD). Equity index dips (NAS100, US30) offer favorable risk/reward buy entries.";
    currencies.push(
      { symbol: "XAU/USD (Gold)", bias: "bullish", formatted: "📈 STRONG BUY / BULLISH (Gold Rallies)", note: "Lower interest rates and Dollar depreciation give massive tailwinds to Gold" },
      { symbol: "EUR/USD", bias: "bullish", formatted: "📈 BUY / BULLISH (Up)", note: "Relief rally as Dollar tailwind subsides" },
      { symbol: "GBP/USD", bias: "bullish", formatted: "📈 BUY / BULLISH (Up)", note: "Sterling surges against softening Dollar" },
      { symbol: "DXY (US Dollar)", bias: "bearish", formatted: "📉 SELL / BEARISH (Down)", note: "Declining yields weaken US Dollar yield advantage" },
      { symbol: "NAS100", bias: "bullish", formatted: "📈 BUY / BULLISH (Up)", note: "Cheaper borrowing and lower discount rate benefit equities" }
    );
  }
  // 6. ECB RATE CUT / LAGARDE DOVISH / PAUSE
  else if (text.includes("ecb") || text.includes("lagarde") || (text.includes("pause") && text.includes("cut"))) {
    explanation = "The European Central Bank signals monetary loosening or post-cut pause due to sluggish Eurozone growth, reducing carry appeal for the single currency.";
    usd_direction = "BULLISH";
    usd_direction_formatted = "🔺 BULLISH (Relative Policy Divergence)";
    usd_reason = "ECB rate cuts diminish Euro yield returns compared to US Treasuries. Because EUR comprises ~57% of DXY, EUR decline directly boosts USD valuation.";
    regime = "POLICY_DIVERGENCE";
    regime_formatted = "🌐 CENTRAL BANK DIVERGENCE (ECB Easing vs Fed)";
    trade_action = "Sell rallies on EUR/USD into daily resistance zones. Consider cross plays like EUR/AUD or EUR/NZD shorts if commodity currencies are holding firm.";
    currencies.push(
      { symbol: "EUR/USD", bias: "bearish", formatted: "🔻 BEARISH (Down)", note: "ECB interest rate cuts lower return on Euro holdings" },
      { symbol: "DXY", bias: "bullish", formatted: "🔺 BULLISH (Up)", note: "Inverse benefit from Euro currency basket weakness" },
      { symbol: "EUR/GBP", bias: "bearish", formatted: "🔻 BEARISH", note: "Euro underperforms Sterling as BOE maintains firmer posture" }
    );
  }
  // 5. OPEC+ / OIL / ENERGY SHOCK
  else if (text.includes("oil") || text.includes("opec") || text.includes("crude") || text.includes("brent") || text.includes("energy")) {
    explanation = "OPEC+ supply curbs or geopolitical disruption restrict global crude output, triggering a sudden rally in energy benchmarks and renewed headline inflation fears.";
    usd_direction = "BULLISH";
    usd_direction_formatted = "🔺 MILD BULLISH (Inflation Expectations & Terms of Trade)";
    usd_reason = "The US is a net energy exporter while European and Asian economies are heavy net importers. Higher oil prices fuel inflation fears, keeping Fed rates higher for longer.";
    regime = "STAGFLATION_CONCERN";
    regime_formatted = "⚡ ENERGY INFLATION SHOCK";
    trade_action = "Buy USD/CAD dips (petro-currency CAD strength is often offset by strong USD). Favor commodity FX and look for short trades on energy-importing currencies (JPY, EUR).";
    currencies.push(
      { symbol: "USDCAD", bias: "bearish", formatted: "🔻 BEARISH / MIXED", note: "Canadian Dollar receives energy export boost, capping USDCAD gains" },
      { symbol: "EUR/USD", bias: "bearish", formatted: "🔻 BEARISH", note: "Higher European energy import bills weigh heavily on Eurozone trade balance" },
      { symbol: "XAU/USD", bias: "bullish", formatted: "🔺 BULLISH", note: "Gold serves as traditional hedge against energy-driven inflation" },
      { symbol: "WTI Crude", bias: "bullish", formatted: "🔺 STRONG BULLISH", note: "Constrained supply directly drives physical barrels higher" }
    );
  }
  // 6. BANK OF JAPAN / YEN WEAKNESS / BOJ DOVISH
  else if (text.includes("yen") || text.includes("boj") || text.includes("japan") || text.includes("ueda")) {
    const isHawkishJpy = text.includes("hike") || text.includes("intervene") || text.includes("hawkish");
    if (isHawkishJpy) {
      explanation = "Bank of Japan policy tightening signals or Ministry of Finance FX intervention threats provide strong support to the Japanese Yen.";
      usd_direction = "NEUTRAL";
      usd_direction_formatted = "⚪ MIXED / SELECTIVE";
      usd_reason = "Unwinding of Yen carry trades causes violent repatriation into JPY, driving USD/JPY down sharply while other dollar pairs remain stable.";
      regime = "CARRY_UNWIND";
      regime_formatted = "🚨 CARRY TRADE UNWIND";
      trade_action = "Fade USD/JPY rallies; trail protective stops tightly on all Yen crosses (GBPJPY, EURJPY).";
      currencies.push(
        { symbol: "USD/JPY", bias: "bearish", formatted: "🔻 STRONG BEARISH (Down)", note: "Short covering and intervention fears trigger steep drop" },
        { symbol: "EUR/JPY", bias: "bearish", formatted: "🔻 BEARISH", note: "Broad Yen strength pressures cross currency pairs" }
      );
    } else {
      explanation = "Bank of Japan reiterates ultra-accommodative monetary policy stance, cementing negative real yields and encouraging continued carry trade outflows.";
      usd_direction = "BULLISH";
      usd_direction_formatted = "🔺 BULLISH vs JPY";
      usd_reason = "Massive interest rate gap between US Fed funds and Japan short-term rates keeps institutional capital flowing into USD yielding assets.";
      regime = "CARRY_EXPANSION";
      regime_formatted = "📈 CARRY TRADE EXPANSION";
      trade_action = "Ride the USD/JPY uptrend with trend-following pullbacks. Monitor Japanese MOF official statements for intervention warnings above key round figures.";
      currencies.push(
        { symbol: "USD/JPY", bias: "bullish", formatted: "🔺 BULLISH (Up)", note: "Yield differential widens in favor of the US Dollar" },
        { symbol: "AUD/JPY", bias: "bullish", formatted: "🔺 BULLISH", note: "High-beta carry trade pair receives solid institutional bid" }
      );
    }
  }
  // 7. CRYPTO / BITCOIN / ETF INFLOWS
  else if (text.includes("btc") || text.includes("bitcoin") || text.includes("crypto") || text.includes("etf")) {
    explanation = "Institutional spot ETF inflows and risk sentiment continue to support digital asset demand, reflecting sustained alternative capital allocation.";
    usd_direction = "NEUTRAL";
    usd_direction_formatted = "⚪ NEUTRAL / MODERATE";
    usd_reason = "Crypto asset moves represent idiosyncratic digital liquidity and risk appetite, with minimal direct mechanical feedback into foreign exchange cash markets.";
    regime = "RISK_ON";
    regime_formatted = "💎 DIGITAL ASSET MOMENTUM";
    trade_action = "Trade BTC/USD with momentum breakout strategies above key resistance levels. Monitor CME futures basis for institutional sentiment.";
    currencies.push(
      { symbol: "BTC/USD", bias: "bullish", formatted: "🔺 BULLISH (Up)", note: "Institutional ETF absorption reduces liquid exchange supply" },
      { symbol: "ETH/USD", bias: "bullish", formatted: "🔺 BULLISH", note: "Follows Bitcoin beta with delayed expansion" }
    );
  }
  // 8. GENERAL HIGH-IMPACT / MACRO DEFAULT
  else {
    const isNegative = text.includes("drop") || text.includes("fall") || text.includes("plunge") || text.includes("crisis") || text.includes("war") || text.includes("conflict") || text.includes("miss");
    if (isNegative) {
      explanation = `Macro development indicating market uncertainty or economic deceleration: "${headline}".`;
      usd_direction = "BULLISH";
      usd_direction_formatted = "🔺 BULLISH (Safe-Haven Inflows)";
      usd_reason = "Global uncertainty prompts international investors to seek shelter in liquid US Dollar cash equivalents and short-term Treasuries.";
      regime = "RISK_OFF";
      regime_formatted = "⚠️ RISK-OFF (Flight to Safety)";
      trade_action = "Reduce exposure to high-beta risk currencies (AUD, NZD). Seek defensive setups or scale down position sizing during elevated volatility.";
      currencies.push(
        { symbol: "DXY", bias: "bullish", formatted: "🔺 BULLISH", note: "Defensive capital allocation during macro uncertainty" },
        { symbol: "XAU/USD", bias: "bullish", formatted: "🔺 BULLISH", note: "Traditional geopolitical & systemic safe-haven bid" },
        { symbol: "AUD/USD", bias: "bearish", formatted: "🔻 BEARISH", note: "Risk-sensitive commodity currencies face immediate liquidation" }
      );
    } else {
      explanation = `Market headline regarding economic activity and cross-asset rebalancing: "${headline}".`;
      usd_direction = "NEUTRAL";
      usd_direction_formatted = "⚪ BALANCED / WATCH";
      usd_reason = "Awaiting economic confirmation; monitor DXY 100-pip range boundaries for confirmed breakout direction.";
      regime = "RANGE_BOUND";
      regime_formatted = "⚖️ CONSOLIDATION";
      trade_action = "Trade key technical support and resistance levels. Avoid chasing breakouts without volume and macro catalyst confirmation.";
      currencies.push(
        { symbol: "DXY", bias: "neutral", formatted: "⚪ NEUTRAL", note: "Range-bound waiting for central bank or data trigger" },
        { symbol: "EUR/USD", bias: "neutral", formatted: "⚪ NEUTRAL", note: "Technical mean-reversion favored" }
      );
    }
  }

  return {
    headline,
    tag,
    impact,
    explanation,
    usd_direction,
    usd_direction_formatted,
    usd_reason,
    regime,
    regime_formatted,
    trade_action,
    currencies,
    url: defaultArticleUrl,
    forexfactory_news_url: ffNewsUrl,
    forexfactory_calendar_url: ffCalUrl,
  };
}
