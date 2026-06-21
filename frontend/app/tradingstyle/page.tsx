"use client";

import { useState } from "react";
import {
  TrendingUp, Clock, Target, AlertTriangle,
  DollarSign, BarChart3, Brain, Shield,
} from "lucide-react";

const tradingStyles = ["Swing", "Day", "Intraday", "Scalping", "Hedging"] as const;
type TradingStyle = (typeof tradingStyles)[number];

const styleColors: Record<TradingStyle, string> = {
  Swing: "text-emerald-400",
  Day: "text-sky-400",
  Intraday: "text-amber-400",
  Scalping: "text-red-400",
  Hedging: "text-violet-400",
};

const styleBg: Record<TradingStyle, string> = {
  Swing: "bg-emerald-500/10 border-emerald-500/30",
  Day: "bg-sky-500/10 border-sky-500/30",
  Intraday: "bg-amber-500/10 border-amber-500/30",
  Scalping: "bg-red-500/10 border-red-500/30",
  Hedging: "bg-violet-500/10 border-violet-500/30",
};

export default function TradingStylesDashboard() {
  const [selectedStyle, setSelectedStyle] = useState<TradingStyle>("Swing");

  const styleData = getStyleData(selectedStyle);

  return (
          <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="text-emerald-500" size={24} />
            Trading Style & Planning
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Master different trading approaches and find your perfect strategy
          </p>
        </div>

        {/* Style Tabs */}
        <div className="flex flex-wrap gap-2">
          {tradingStyles.map((style) => (
            <button
              key={style}
              onClick={() => setSelectedStyle(style)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${selectedStyle === style
                  ? `${styleBg[style]} ${styleColors[style]}`
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
            >
              {style} Trading
            </button>
          ))}
        </div>

        {/* Main Panel */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Overview */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={16} className={styleColors[selectedStyle]} />
              <h3 className="text-sm font-semibold text-foreground">Trading Overview</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{styleData.overview}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-lg border p-3 ${styleBg[selectedStyle]}`}>
                <div className="text-xs text-muted-foreground mb-0.5">Difficulty</div>
                <div className={`text-sm font-bold ${styleColors[selectedStyle]}`}>{styleData.difficulty}</div>
              </div>
              <div className={`rounded-lg border p-3 ${styleBg[selectedStyle]}`}>
                <div className="text-xs text-muted-foreground mb-0.5">Time Commitment</div>
                <div className={`text-sm font-bold ${styleColors[selectedStyle]}`}>{styleData.timeCommitment}</div>
              </div>
            </div>
          </div>

          {/* Key Characteristics */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} className="text-emerald-400" />
              <h3 className="text-sm font-semibold text-foreground">Key Characteristics</h3>
            </div>
            <ul className="space-y-2">
              {styleData.characteristics.map((char, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${styleColors[selectedStyle].replace("text-", "bg-")}`} />
                  {char}
                </li>
              ))}
            </ul>
          </div>

          {/* Risk Management */}
          <div className="rounded-xl border border-border bg-card p-5 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-red-400" />
              <h3 className="text-sm font-semibold text-foreground">Risk Management</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Risk Per Trade", value: styleData.riskPerTrade },
                { label: "Stop Loss", value: styleData.stopLoss },
                { label: "Risk:Reward", value: styleData.riskReward },
                { label: "Max Trades", value: styleData.maxTrades },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  <div className="text-sm font-bold text-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Template */}
          <div className="rounded-xl border border-border bg-card p-5 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={16} className="text-violet-400" />
              <h3 className="text-sm font-semibold text-foreground">Strategy Template</h3>
            </div>
            <pre className="text-xs text-muted-foreground bg-muted/40 rounded-lg border border-border p-4 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
              {styleData.strategy}
            </pre>
          </div>

          {/* Tools */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-sky-400" />
              <h3 className="text-sm font-semibold text-foreground">Required Tools</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {styleData.tools.map((tool, i) => (
                <span key={i} className="px-2 py-1 rounded-full text-xs font-medium bg-muted border border-border text-foreground">
                  {tool}
                </span>
              ))}
            </div>
          </div>

          {/* Market Conditions */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={16} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-foreground">Best Market Conditions</h3>
            </div>
            <ul className="space-y-2">
              {styleData.marketConditions.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Pros */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
              <span>✓</span> Advantages
            </h3>
            <ul className="space-y-2">
              {styleData.pros.map((pro, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  {pro}
                </li>
              ))}
            </ul>
          </div>

          {/* Cons */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
              <span>✗</span> Disadvantages
            </h3>
            <ul className="space-y-2">
              {styleData.cons.map((con, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                  {con}
                </li>
              ))}
            </ul>
          </div>

          {/* Common Mistakes */}
          <div className="rounded-xl border border-border bg-card p-5 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-red-400" />
              <h3 className="text-sm font-semibold text-foreground">Common Mistakes to Avoid</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {styleData.mistakes.map((mistake, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-red-500/15 bg-red-500/5 p-3 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  {mistake}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
}

function getStyleData(style: TradingStyle) {
  const data = {
    Swing: { overview: "Swing trading involves holding positions for several days to weeks, capitalizing on price swings in trending markets. It's ideal for traders who can't monitor the market all day but want to catch significant price movements.", difficulty: "Intermediate", timeCommitment: "2-3 hours/day", characteristics: ["Hold positions for days to weeks", "Fewer trades with higher profit potential", "Less screen time required", "Focuses on major trend reversals"], riskPerTrade: "1-2%", stopLoss: "Below swing lows/above swing highs (50-200 pips)", riskReward: "1:2-3", maxTrades: "2-3/week", strategy: `Timeframe: 4H / Daily (Analysis), 4H (Entry)\nBias: Higher timeframe trend analysis\nEntry: Retest of key levels (EMA 50, support/resistance)\nStop Loss: Below/above swing points (50-200 pips)\nTake Profit: 2-3x risk at key resistance/support\nPosition Size: 1-2% of account per trade\nWin Rate: 40-60% expected\nHold Time: 3-21 days average`, tools: ["RSI", "MACD", "EMA 50/200", "Fibonacci", "Trendlines", "Support/Resistance"], marketConditions: ["Clear trending markets", "After major news events", "During earnings seasons", "Strong economic data releases"], mistakes: ["Closing positions too early due to fear", "Over-leveraging on swing setups", "Ignoring fundamental news catalysts", "Not having patience for setups to develop"], pros: ["Less time commitment", "Higher profit potential per trade", "Less affected by market noise", "Good for busy professionals"], cons: ["Overnight risk exposure", "Requires patience", "Fewer trading opportunities", "Capital tied up longer"] },
    Day: { overview: "Day trading involves opening and closing all positions within the same trading day. It requires active market monitoring and quick decision-making to capitalize on intraday price movements.", difficulty: "Advanced", timeCommitment: "6-8 hours/day", characteristics: ["All positions closed by market close", "High frequency of trades", "Requires constant market monitoring", "No overnight risk"], riskPerTrade: "0.5-1%", stopLoss: "Below session low/above session high (20-50 pips)", riskReward: "1:1.5-2", maxTrades: "3-5/day", strategy: `Timeframe: 15M (Entry) / 1H (Analysis)\nSession: London/NY overlap (8-12 EST)\nEntry: Breakout + retest or order block tap\nStop Loss: Below session low/above session high (20-50 pips)\nTake Profit: 1.5-2x risk or end of session\nPosition Size: 0.5-1% per trade\nWin Rate: 50-70% expected\nHold Time: 2-8 hours maximum`, tools: ["VWAP", "EMA 20/50", "Volume Profile", "Order Blocks", "Fair Value Gaps", "Market Structure"], marketConditions: ["High volatility sessions", "Economic news releases", "Market open first 2 hours", "Clear directional bias"], mistakes: ["Trading during low volume periods", "No pre-session trading plan", "Over-trading during choppy markets", "Revenge trading after losses"], pros: ["No overnight risk", "Daily profit realization", "Multiple opportunities daily", "Quick feedback loop"], cons: ["High time commitment", "Stressful and demanding", "High transaction costs", "Requires significant capital"] },
    Intraday: { overview: "Intraday trading focuses on capturing moves within specific trading sessions, typically holding positions for a few hours. It balances the benefits of day trading with less intensive monitoring requirements.", difficulty: "Intermediate", timeCommitment: "4-6 hours/day", characteristics: ["Positions held for hours within a session", "Session-specific strategies", "Moderate monitoring required", "Focus on session highs/lows"], riskPerTrade: "0.5-1%", stopLoss: "Session support/resistance levels (30-80 pips)", riskReward: "1:1.5-2", maxTrades: "2-4/session", strategy: `Timeframe: 5M (Entry) / 15M-1H (Analysis)\nSetup: Trend following within trading session\nEntry: Pullback to moving average or key level\nStop Loss: Session low/high or structure break (30-80 pips)\nTake Profit: End of session or R:R target\nPosition Size: 0.5-1% per trade\nWin Rate: 55-75% expected\nHold Time: 1-6 hours per session`, tools: ["Session Pivots", "Volume Indicators", "EMA 21", "Bollinger Bands", "ATR", "Market Profile"], marketConditions: ["Clear session trends", "Good volatility within sessions", "Respect for session levels", "Clean market structure"], mistakes: ["Mixing signals from different timeframes", "Rushing into trades without confirmation", "Ignoring session-specific characteristics", "Poor position sizing for session length"], pros: ["Balanced time commitment", "Session-based risk management", "Good learning environment", "Flexible schedule adaptation"], cons: ["Limited to session hours", "May miss overnight moves", "Requires session knowledge", "Moderate profit potential"] },
    Scalping: { overview: "Scalping is the fastest form of trading, involving very short-term positions held for seconds to minutes. It aims to profit from small price movements with high frequency trades and requires intense focus.", difficulty: "Expert", timeCommitment: "8+ hours/day", characteristics: ["Positions held for seconds to minutes", "Very high frequency trading", "Small profit targets", "Requires lightning-fast execution"], riskPerTrade: "0.1-0.25%", stopLoss: "Tight stops at micro-structure (3-10 pips)", riskReward: "1:1-1.5", maxTrades: "20-50/day", strategy: `Timeframe: 1M (Entry) / 3M-5M (Analysis)\nEntry: Micro-structure breaks, order flow imbalance\nStop Loss: 3-5 pips tight stops at micro-levels\nTake Profit: 1:1 or 1:1.5 quick targets (5-15 pips)\nPosition Size: 0.1-0.25% per trade (high frequency)\nWin Rate: 60-80% required for profitability\nHold Time: 30 seconds to 5 minutes maximum\nBest Pairs: EUR/USD, GBP/USD (tightest spreads)`, tools: ["Level II Data", "DOM", "Tick Charts", "Fast Moving Averages", "Volume Delta", "Order Flow"], marketConditions: ["High liquidity periods", "Tight spreads", "Active market hours", "Clear micro-trends"], mistakes: ["Over-trading and emotional burnout", "Ignoring spread costs and slippage", "No clear exit strategy", "Trading during low liquidity"], pros: ["Multiple daily opportunities", "Quick profit realization", "No overnight risk", "Develops fast reflexes"], cons: ["Extremely high stress", "High transaction costs", "Requires significant capital", "Easy to burn out"] },
    Hedging: { overview: "Hedging involves taking offsetting positions to reduce risk exposure rather than seeking profit. It's a risk management technique used to protect existing positions from adverse market movements.", difficulty: "Expert", timeCommitment: "Varies", characteristics: ["Risk reduction focused", "Offsetting positions", "Portfolio protection", "Advanced strategy requiring deep knowledge"], riskPerTrade: "Portfolio-based (2-5%)", stopLoss: "Risk-based on portfolio exposure (varies)", riskReward: "Protection focused, not profit seeking", maxTrades: "As needed for risk management", strategy: `Purpose: Risk reduction, portfolio protection\nTypes: Direct hedge, cross hedge, proxy hedge\nExample: Long EUR/USD + Short GBP/USD (correlation hedge)\nStop Loss: Based on max portfolio loss tolerance (2-5%)\nPosition Size: Calculated on overall exposure, not individual trades\nWin Rate: Not applicable - success measured by risk reduction\nHold Time: Until risk exposure changes or hedge no longer needed`, tools: ["Correlation Analysis", "Portfolio Exposure", "Options", "Futures", "Currency Pairs", "Risk Metrics"], marketConditions: ["High volatility periods", "Uncertain market direction", "Major news events pending", "Portfolio overexposure"], mistakes: ["Using hedges without understanding exposure", "Poor margin management", "Treating hedges as profit strategies", "Over-hedging positions"], pros: ["Reduces portfolio risk", "Protects against adverse moves", "Allows position maintenance", "Professional risk management"], cons: ["Reduces profit potential", "Complex to manage", "Requires advanced knowledge", "Additional transaction costs"] },
  };
  return data[style];
}
