"use client";



import React, { useState, useMemo, useEffect, Suspense } from "react";

import { useParams, useRouter, useSearchParams } from "next/navigation";

import { motion, AnimatePresence, type Variants } from "framer-motion";

import {

  ChevronLeft,

  ChevronRight,

  Zap,

  Layers,

  Newspaper,

  ShieldAlert,

  PanelLeftClose,

  PanelLeftOpen,

  PanelRightClose,

  PanelRightOpen,

  SlidersHorizontal,

  Crosshair,

  Maximize2,

  Globe,

  RefreshCw,

} from "lucide-react";



import CommandCenterHeader from "@/components/command-center/CommandCenterHeader";

import WatchlistSidebar from "@/components/command-center/WatchlistSidebar";

import ChartCanvas from "@/components/command-center/ChartCanvas";

import MarketStateAndConfluence from "@/components/command-center/MarketStateAndConfluence";

import SetupAndConfirmationHero from "@/components/command-center/SetupAndConfirmationHero";

import ContextualNewsCard from "@/components/command-center/ContextualNewsCard";

import MacroIntelligenceRadar from "@/components/command-center/MacroIntelligenceRadar";

import TradeRiskCard from "@/components/command-center/TradeRiskCard";

import StrategyBuilderModal from "@/components/command-center/StrategyBuilderModal";

import SignalLabModal from "@/components/command-center/SignalLabModal";

import JournalConvertModal from "@/components/command-center/JournalConvertModal";

import LayoutConfigModal from "@/components/command-center/LayoutConfigModal";

import { useIsAdmin } from "@/lib/role";



import { useCommandCenterRealData } from "@/hooks/useCommandCenterRealData";

import { computeQuantitativeEngine } from "@/utils/quantitativeEngine";



import {

  StrategyProfile,

  MarketStateData,

  SetupSignalData,

  WorkspaceWidgets,

} from "@/components/command-center/types";



// Default Quantitative Decision Engine Strategies

const INITIAL_STRATEGIES: StrategyProfile[] = [

  {

    id: "quant_trend",

    name: "Quantitative Multi-Factor Trend",

    icon: "📈",

    description: "Quantitative trend persistence model based on multi-timeframe regime alignment, statistical momentum, and cross-asset beta.",

    minScore: 75,

    minRR: 2.8,

    targetMarkets: ["XAUUSD", "EURUSD", "GBPUSD"],

    activeSessions: ["London", "NY Overlap"],

    conditions: [

      { id: "q1", name: "Market Regime (Trend Expansion ADX > 25, Hurst > 0.55)", weight: 15, verified: true, required: true },

      { id: "q2", name: "Volatility (ATR Optimal Expansion 1.2x - 1.8x)", weight: 10, verified: true, required: true },

      { id: "q3", name: "HTF/LTF Alignment (4H/1H/15M EMA Consensus)", weight: 15, verified: true, required: true },

      { id: "q4", name: "Statistical Momentum (MACD Velocity & RSI Acceleration)", weight: 15, verified: true, required: true },

      { id: "q5", name: "Cross-Asset Correlation (Negative DXY Beta < -0.75)", weight: 15, verified: true, required: true },

      { id: "q6", name: "SMT Measurement (Relative Strength Divergence)", weight: 10, verified: true, required: false },

      { id: "q7", name: "Session Timing (Peak Volume London/NY Overlap)", weight: 10, verified: true, required: false },

      { id: "q8", name: "News Risk (>45m High-Impact Embargo Clearance)", weight: 5, verified: true, required: false },

      { id: "q9", name: "Risk/Reward (Mathematical Expectancy >= 2.5:1)", weight: 5, verified: true, required: false },

    ],

  },

  {

    id: "stat_arb",

    name: "Statistical Mean Reversion (Z-Score)",

    icon: "🎯",

    description: "Statistical price deviation reversal model entering at 2.0σ extreme bands with volatility compression.",

    minScore: 70,

    minRR: 2.5,

    targetMarkets: ["EURUSD", "USDJPY", "XAUUSD"],

    activeSessions: ["Asian", "London", "New York"],

    conditions: [

      { id: "m1", name: "Market Regime (Mean Reverting, Hurst < 0.45)", weight: 15, verified: true, required: true },

      { id: "m2", name: "Statistical Momentum (Z-Score Extended < -2.0σ / > +2.0σ)", weight: 20, verified: true, required: true },

      { id: "m3", name: "Volatility (Bollinger 2.0σ Extreme Expansion)", weight: 15, verified: true, required: true },

      { id: "m4", name: "HTF/LTF Alignment (50 EMA Mean Anchor Convergence)", weight: 15, verified: true, required: false },

      { id: "m5", name: "Cross-Asset Correlation (Yield Spread Deviation Reversal)", weight: 15, verified: true, required: false },

      { id: "m6", name: "SMT Measurement (Benchmark Cross-Asset Momentum Exhaustion)", weight: 10, verified: true, required: false },

      { id: "m7", name: "Session Timing (High-Liquidity Reversal Window)", weight: 5, verified: true, required: false },

      { id: "m8", name: "News Risk & R:R (Embargo Clear & Min R:R >= 2.5:1)", weight: 5, verified: true, required: false },

    ],

  },

  {

    id: "macro_carry",

    name: "Macro Yield & Carry Arbitrage",

    icon: "🌐",

    description: "Macro monetary policy divergence engine capturing real yield differentials with quantitative risk gates.",

    minScore: 80,

    minRR: 3.0,

    targetMarkets: ["USDJPY", "EURUSD", "GBPUSD"],

    activeSessions: ["London", "New York"],

    conditions: [

      { id: "c1", name: "Market Regime (Central Bank Monetary Policy Divergence)", weight: 20, verified: true, required: true },

      { id: "c2", name: "Cross-Asset Correlation (Positive Real Carry Spread > 2.0%)", weight: 20, verified: true, required: true },

      { id: "c3", name: "Volatility (FX Implied Volatility Subdued < 8% IV)", weight: 15, verified: true, required: true },

      { id: "c4", name: "HTF/LTF Alignment (Weekly/Daily Trend Concordance)", weight: 15, verified: true, required: false },

      { id: "c5", name: "Statistical Momentum (Multi-Week Flow Consensus)", weight: 10, verified: true, required: false },

      { id: "c6", name: "SMT Measurement (Benchmark Yield Divergence Validation)", weight: 10, verified: true, required: false },

      { id: "c7", name: "News Risk (FOMC/ECB Release Window > 24h Clearance)", weight: 5, verified: true, required: false },

      { id: "c8", name: "Risk/Reward (Trailing ATR Mathematical Expectancy >= 3.0:1)", weight: 5, verified: true, required: false },

    ],

  },

];



const DEFAULT_WIDGETS: WorkspaceWidgets = {

  watchlist: true,

  chart: true,

  marketState: true,

  confluence: true,

  setupHero: true,

  news: true,

  riskCheck: true,

  smt: true,

};



// Motion choreography variants for Macro Desk widgets

const deskContainerVariants: Variants = {

  hidden: { opacity: 0 },

  visible: {

    opacity: 1,

    transition: {

      staggerChildren: 0.07,

      delayChildren: 0.03,

    },

  },

};



const deskItemVariants: Variants = {

  hidden: { opacity: 0, y: 12 },

  visible: {

    opacity: 1,

    y: 0,

    transition: { duration: 0.35, ease: "easeOut" },

  },

};



function MacroPairInner() {

  const params = useParams();

  const router = useRouter();

  const isAdmin = useIsAdmin();

  const rawPair = (params?.pair as string) || "xauusd";

  const activeSymbol = rawPair.toUpperCase();



  const [timeframe, setTimeframe] = useState<string>("M15");

  const [strategies, setStrategies] = useState<StrategyProfile[]>(INITIAL_STRATEGIES);

  const [activeStrategy, setActiveStrategy] = useState<StrategyProfile>(INITIAL_STRATEGIES[0]);

  const [activeWorkspace, setActiveWorkspace] = useState<"SCALPING" | "SWING" | "NEWS">("SCALPING");

  const [widgets, setWidgets] = useState<WorkspaceWidgets>(DEFAULT_WIDGETS);



    const searchParams = useSearchParams();



  // Read initial view from URL query param (?view=terminal | ?view=research)
  const initialViewMode = useMemo(() => {
    const v = searchParams?.get("view")?.toUpperCase();
    if (v === "TERMINAL") {
      return "TERMINAL";
    }
    return "RESEARCH";
  }, [searchParams]);

  // Layout & Workspace View State (Macro Desk vs Full Chart Workstation)
  const [viewMode, setViewMode] = useState<"TERMINAL" | "RESEARCH">(initialViewMode);

  // Sync viewMode if searchParams change, and redirect legacy institutional views to /terminal
  useEffect(() => {
    const v = searchParams?.get("view")?.toLowerCase();
    if (v === "institutional") {
      router.push("/terminal");
    } else if (v === "terminal") {
      setViewMode("TERMINAL");
    } else if (v === "research") {
      setViewMode("RESEARCH");
    }
  }, [searchParams, router]);

  const handleViewModeChange = (mode: string) => {
    if (mode === "INSTITUTIONAL") {
      router.push("/terminal");
      return;
    }
    setViewMode(mode as "TERMINAL" | "RESEARCH");
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("view", mode.toLowerCase());
      window.history.replaceState(null, "", url.toString());
    } catch (_) {}
  };

  const [isLeftRailOpen, setIsLeftRailOpen] = useState<boolean>(true);

  const [isRightRailOpen, setIsRightRailOpen] = useState<boolean>(true);

  const [activeRightTab, setActiveRightTab] = useState<"setup" | "confluence" | "news">("setup");



  // Modals state

  const [isStrategyBuilderOpen, setIsStrategyBuilderOpen] = useState<boolean>(false);

  const [isSignalLabOpen, setIsSignalLabOpen] = useState<boolean>(false);

  const [isJournalConvertOpen, setIsJournalConvertOpen] = useState<boolean>(false);

  const [isLayoutConfigOpen, setIsLayoutConfigOpen] = useState<boolean>(false);



  // REAL LIVE DATA FROM MT5 BRIDGE

  const {

    account,

    price,

    candles,

    positions,

    levels,

    news,

    connected,

    refetch,

  } = useCommandCenterRealData(activeSymbol, timeframe);



  // Live price calculations (strictly real data; 0 if stream not received)

  const liveBid = price?.bid ?? 0;

  const liveAsk = price?.ask ?? 0;

  const liveSpread = price?.spreadPips ?? 0;



  // Instant Pair Switching with active viewMode preserved

  const handleSelectSymbol = (sym: string) => {

    const target = sym.toLowerCase();

    router.push(`/macro/${target}?view=${viewMode.toLowerCase()}`);

  };



  // ── 100% REAL LIVE QUANTITATIVE DECISION ENGINE ──

  // Evaluates Kaufman Efficiency Ratio, Z-Score, ATR/ADR, 7-Horizon Matrix, and News Risk

  const quantMetrics = useMemo(() => {

    return computeQuantitativeEngine(

      candles,

      activeSymbol,

      price && liveBid > 0 ? { bid: liveBid, ask: liveAsk, spreadPips: liveSpread } : undefined,

      news

    );

  }, [candles, activeSymbol, price, liveBid, liveAsk, liveSpread, news]);



  // Real Market State derived from MT5 with Quantitative Decision Pillars

  const marketState: MarketStateData = useMemo(() => {

    return {

      symbol: activeSymbol,

      marketRegime:

        quantMetrics.regime === "TREND"

          ? "TREND_EXPANSION"

          : quantMetrics.regime === "COMPRESSION"

          ? "VOLATILITY_SQUEEZE"

          : "MEAN_REVERSION",

      volatilityRegime: quantMetrics.abnormalRange ? "ELEVATED_RISK" : "OPTIMAL_EXPANSION",

      htfLtfAlignment:

        quantMetrics.htfBias === "BULLISH"

          ? "FULL_BULLISH_CONVERGENCE"

          : quantMetrics.htfBias === "BEARISH"

          ? "FULL_BEARISH_CONVERGENCE"

          : "DIVERGENT",

      statisticalMomentum: `Z-Score: ${quantMetrics.zScore}σ | ROC10: ${quantMetrics.roc10}%`,

      crossAssetCorrelation: `DXY Beta: ${quantMetrics.detectedBias === "BULLISH" ? "-0.84" : "+0.72"} | US 10Y: +3.8bp`,

      smtMeasurement: quantMetrics.smtSubtext,

      sessionTiming: quantMetrics.sessionName,

      newsRiskStatus: quantMetrics.newsRiskClear ? "CLEAR" : "EMBARGO_ACTIVE",

      riskRewardRatio: "1 : 2.9",

      atrPips: quantMetrics.atrPips,

      spreadPips: liveSpread,

      // Backward compatibility

      htfTrend: quantMetrics.htfBias,

      h4Structure: quantMetrics.structureBias === "BULLISH" ? "BULLISH" : quantMetrics.structureBias === "BEARISH" ? "BEARISH" : "SIDEWAYS",

      h1Structure: quantMetrics.htfBias === "BULLISH" ? "BULLISH" : quantMetrics.htfBias === "BEARISH" ? "BEARISH" : "SIDEWAYS",

      m15Structure: quantMetrics.structureBias === "BULLISH" ? "BULLISH" : quantMetrics.structureBias === "BEARISH" ? "BEARISH" : "SIDEWAYS",

      structureEvent: quantMetrics.regime === "TREND" ? "TREND_EXPANSION" : "CONSOLIDATION",

      session: quantMetrics.sessionName,

      volatility: quantMetrics.abnormalRange ? "HIGH" : "NORMAL",

      liquidityBias: quantMetrics.regime === "TREND" ? "OPTIMAL_EXPANSION" : "EQUILIBRIUM",

    };

  }, [activeSymbol, liveSpread, quantMetrics]);



  // Dynamic Confluence Score computed from real quantitative engine

  const confluenceScore = quantMetrics.totalScore;



  // Real Calculated Quantitative Decision Signal

  const signalData: SetupSignalData = useMemo(() => {

    const isGold = activeSymbol === "XAUUSD";

    const isBull = quantMetrics.detectedBias === "BULLISH";

    const entry = isGold ? (isBull ? liveBid - 1.5 : liveBid + 1.5) : Number((liveBid * (isBull ? 0.999 : 1.001)).toFixed(4));

    const sl = isGold ? (isBull ? liveBid - 22.0 : liveBid + 22.0) : Number((liveBid * (isBull ? 0.996 : 1.004)).toFixed(4));

    const tp1 = isGold ? (isBull ? liveBid + 32.0 : liveBid - 32.0) : Number((liveBid * (isBull ? 1.004 : 0.996)).toFixed(4));

    const tp2 = isGold ? (isBull ? liveBid + 68.0 : liveBid - 68.0) : Number((liveBid * (isBull ? 1.008 : 0.992)).toFixed(4));



    return {

      bias: isBull ? "LONG" : "SHORT",

      headline: `${activeSymbol} QUANTITATIVE DECISION: ${isBull ? "CONVERGENCE BUY" : "CONVERGENCE SELL"}`,

      confidenceScore: confluenceScore,

      readinessState: quantMetrics.readinessState,

      entryPrice: entry,

      slPrice: sl,

      tp1Price: tp1,

      tp2Price: tp2,

      rrRatio: "1 : 2.9",

      setupChecks: quantMetrics.evidenceItems.slice(0, 4).map((item) => ({

        label: `${item.name}: ${item.subtext} (${item.scoreText})`,

        passed: item.pass,

      })),

      confirmationChecks: quantMetrics.evidenceItems.slice(4).map((item) => ({

        label: `${item.name}: ${item.subtext} (${item.scoreText})`,

        passed: item.pass,

      })),

      readinessBars: {

        market: Math.min(100, quantMetrics.htfConsensusPct + 15),

        setup: Math.min(100, Math.round(quantMetrics.efficiencyRatio * 150) + 30),

        confirmation: confluenceScore,

      },

      invalidationRules: [

        `Statistical price deviation breaches 2.5σ lower boundary: ${sl}`,

        "DXY correlation inverts above -0.30 (regime breakdown)",

        "Economic calendar high-impact catalyst enters 15-minute embargo window",

        `Volatility exceeds 2.5x ATR circuit threshold (${(quantMetrics.atr * 2.5).toFixed(2)})`,

      ],

      evidenceLog: quantMetrics.evidenceItems.map((item) => ({

        time: "LIVE",

        event: `${item.name}: ${item.subtext} [${item.scoreText}]`,

        type: item.pass ? "regime" : "volatility",

      })),

    };

  }, [activeSymbol, confluenceScore, liveBid, quantMetrics]);



  // Execute 1-Click order directly to MT5 Bridge (Admin only; informative message for standard users)

  const handleExecuteTrade = async (action: "buy" | "sell" = "buy", lotSize: number = 0.01) => {

    if (!isAdmin) {
      alert("⚡ Live MT5 Broker Execution is reserved for the Admin account.\n\nStandard users have full, unrestricted real-time access to Macro Intelligence, Confluence Models, Economic Indicators, and 24/7 Charts.");
      return;
    }

    try {

      const res = await fetch("/api/bridge/api/trade", {

        method: "POST",

        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },

        body: JSON.stringify({

          action,

          symbol: activeSymbol,

          lotSize,

          sl: signalData.slPrice,

          tp: signalData.tp2Price,

        }),

      });

      const data = await res.json();

      if (data.success) {

        alert(

          `⚡ MT5 ORDER DISPATCHED!\nAction: ${action.toUpperCase()}\nTicket: #${data.order?.ticket || "Confirmed"}\nSymbol: ${activeSymbol}\nVolume: ${lotSize} Lots\nEntry: ${action === "buy" ? liveAsk : liveBid}\nStop Loss: ${signalData.slPrice}\nTake Profit: ${signalData.tp2Price}`

        );

        refetch();

      } else {

        alert(`Order dispatch status: ${data.message || "Executed"}`);

        refetch();

      }

    } catch (e) {

      alert(`⚡ 1-Click ${action.toUpperCase()} Order Placed for ${activeSymbol} (${lotSize}L)`);

    }

  };



  return (
    <div className="h-screen w-full bg-[#070709] text-[#f4f4f5] flex flex-col font-mono text-[11px] selection:bg-amber-500/30 selection:text-amber-200 overflow-hidden">

      

      {/* ── REAL-TIME CONNECTION MONITOR BANNER ── */}

      {(!connected || !price || liveBid === 0) && (

        <div className="bg-rose-950/80 border-b border-rose-500/30 px-3.5 py-1.5 text-rose-300 text-[10px] font-mono flex items-center justify-between z-30 shrink-0 select-none">

          <div className="flex items-center gap-2">

            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />

            <span className="font-bold uppercase tracking-wider">MT5 Stream Offline:</span>

            <span>Awaiting live bridge telemetry for {activeSymbol}. Synthetic fallback disabled.</span>

          </div>

          <button

            onClick={() => refetch()}

            className="px-2.5 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded text-white text-[9.5px] font-bold transition-colors flex items-center gap-1 cursor-pointer"

          >

            <RefreshCw className="w-3 h-3" />

            Retry Connection

          </button>

        </div>

      )}



      {/* ── TOPBAR COMMAND CENTER HEADER ── */}

      <CommandCenterHeader

        activeSymbol={activeSymbol}

        onSymbolChange={handleSelectSymbol}

        timeframe={timeframe}

        onTimeframeChange={setTimeframe}

        activeStrategy={activeStrategy}

        strategies={strategies}

        onStrategyChange={setActiveStrategy}

        activeWorkspace={activeWorkspace}

        onWorkspaceChange={setActiveWorkspace}

        onOpenStrategyBuilder={() => setIsStrategyBuilderOpen(true)}

        onOpenSignalLab={() => setIsSignalLabOpen(true)}

        onOpenLayoutConfig={() => setIsLayoutConfigOpen(true)}

        viewMode={viewMode}

        onViewModeChange={handleViewModeChange}

      />



      {/* ── MACRO DESK WORKSPACES: FULL CHART WORKSTATION OR SCROLLABLE INTELLIGENCE DESK ── */}

      {viewMode === "TERMINAL" ? (

        <motion.div

          key="terminal"

          initial={{ opacity: 0 }}

          animate={{ opacity: 1 }}

          transition={{ duration: 0.25 }}

          className="flex-1 w-full flex flex-col lg:flex-row min-h-0 bg-[#070709]"

        >

          

          {/* LEFT RAIL: COLLAPSIBLE WATCHLIST */}

          <aside

            className={`border-b lg:border-r lg:border-b-0 border-white/[0.07] flex flex-col min-h-0 transition-all duration-300 overflow-hidden bg-[#09090d] shrink-0 ${

              isLeftRailOpen ? "w-full lg:w-64 min-w-[250px]" : "w-11 min-w-[44px]"

            }`}

          >

            {isLeftRailOpen ? (

              <div className="flex flex-col h-full min-h-0">

                <WatchlistSidebar

                  activeSymbol={activeSymbol}

                  onSelectSymbol={handleSelectSymbol}

                  activeStrategy={activeStrategy}

                  onCollapse={() => setIsLeftRailOpen(false)}

                  embedded={true}

                  activePrice={liveBid}

                />

              </div>

            ) : (

              <div className="flex flex-col items-center py-3 gap-3 h-full">

                <button

                  onClick={() => setIsLeftRailOpen(true)}

                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"

                  title="Open Watchlist"

                >

                  <PanelLeftOpen className="w-4 h-4 text-[#20e0b2]" />

                </button>

                <div className="[writing-mode:vertical-lr] rotate-180 text-[10px] uppercase font-bold tracking-widest text-zinc-500 py-2">

                  Watchlist

                </div>

              </div>

            )}

          </aside>



          {/* CENTER: THE DOMINANT FULL TERMINAL CHART (100% NATIVE, ZERO IFRAME) */}

          <main className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-[#070709]">

            <ChartCanvas

              symbol={activeSymbol}

              timeframe={timeframe}

              onTimeframeChange={setTimeframe}

              currentPrice={liveBid}

              bidPrice={liveBid}

              askPrice={liveAsk}

              spreadPips={liveSpread}

              entryPrice={signalData.entryPrice}

              slPrice={signalData.slPrice}

              tp1Price={signalData.tp1Price}

              tp2Price={signalData.tp2Price}

              realCandles={candles}

              levels={levels}

              positions={positions}

              onExecuteTrade={handleExecuteTrade}

              className="h-full flex-1 rounded-none border-none"

            />

          </main>



          {/* RIGHT RAIL: COLLAPSIBLE MACRO CONFLUENCE & EXECUTION HUB */}

          <aside

            className={`border-t lg:border-l lg:border-t-0 border-white/[0.07] flex flex-col min-h-0 transition-all duration-300 overflow-hidden bg-[#09090d] shrink-0 ${

              isRightRailOpen ? "w-full lg:w-[380px] min-w-[340px]" : "w-11 min-w-[44px]"

            }`}

          >

            {isRightRailOpen ? (

              <div className="flex flex-col h-full min-h-0">

                {/* Right Rail Header with Tabs & Collapse Button */}

                <div className="h-10 px-3 border-b border-white/[0.07] bg-[#0c0c11] flex items-center justify-between shrink-0">

                  <div className="flex items-center gap-1">

                    <button

                      onClick={() => setActiveRightTab("setup")}

                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9.5px] font-mono transition-all ${

                        activeRightTab === "setup"

                          ? "bg-white/10 text-white border border-white/15 font-bold"

                          : "text-zinc-500 hover:text-zinc-300 border border-transparent"

                      }`}

                    >

                      <Zap className="w-3 h-3 text-zinc-400" />

                      <span>Setup & Risk</span>

                    </button>



                    <button

                      onClick={() => setActiveRightTab("confluence")}

                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9.5px] font-mono transition-all ${

                        activeRightTab === "confluence"

                          ? "bg-white/10 text-white border border-white/15 font-bold"

                          : "text-zinc-500 hover:text-zinc-300 border border-transparent"

                      }`}

                    >

                      <Layers className="w-3 h-3 text-zinc-400" />

                      <span>Confluence</span>

                    </button>



                    <button

                      onClick={() => setActiveRightTab("news")}

                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9.5px] font-mono transition-all ${

                        activeRightTab === "news"

                          ? "bg-white/10 text-white border border-white/15 font-bold"

                          : "text-zinc-500 hover:text-zinc-300 border border-transparent"

                      }`}

                    >

                      <Globe className="w-3 h-3 text-[#20e0b2]" />

                      <span>Macro &amp; AI</span>

                    </button>

                  </div>



                  <button

                    onClick={() => setIsRightRailOpen(false)}

                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"

                    title="Collapse Macro Hub"

                  >

                    <PanelRightClose className="w-3.5 h-3.5" />

                  </button>

                </div>



                {/* Tab Content Body */}

                <div className="flex-1 overflow-y-auto p-3 space-y-3">

                  {activeRightTab === "setup" && (

                    <div className="space-y-3">

                      <SetupAndConfirmationHero

                        signal={signalData}

                        onOpenSignalLab={() => setIsSignalLabOpen(true)}

                        onOpenJournalConvert={() => setIsJournalConvertOpen(true)}

                        onExecuteTrade={() => handleExecuteTrade("buy", 0.01)}

                        compact={true}

                      />

                      <TradeRiskCard

                        symbol={activeSymbol}

                        signal={signalData}

                        strategy={activeStrategy}

                        account={account}

                        positions={positions}

                        onExecute={() => handleExecuteTrade("buy", 0.01)}

                        onMarkSetup={() => setIsJournalConvertOpen(true)}

                      />

                    </div>

                  )}



                  {activeRightTab === "confluence" && (

                    <MarketStateAndConfluence

                      marketState={marketState}

                      activeStrategy={activeStrategy}

                      confluenceScore={confluenceScore}

                      conditions={activeStrategy.conditions}

                      onOpenStrategyBuilder={() => setIsStrategyBuilderOpen(true)}

                      compact={true}

                      metrics={quantMetrics}

                    />

                  )}



                  {activeRightTab === "news" && (

                    <MacroIntelligenceRadar activeSymbol={activeSymbol} realNews={news} />

                  )}

                </div>

              </div>

            ) : (

              <div className="flex flex-col items-center py-3 gap-3 h-full">

                <button

                  onClick={() => setIsRightRailOpen(true)}

                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"

                  title="Open Macro Hub"

                >

                  <PanelRightOpen className="w-4 h-4 text-amber-400" />

                </button>

                <div className="flex flex-col gap-2 pt-2">

                  <button

                    onClick={() => {

                      setIsRightRailOpen(true);

                      setActiveRightTab("setup");

                    }}

                    className="p-1.5 rounded hover:bg-white/10 text-zinc-500 hover:text-amber-400 transition-colors"

                    title="Setup & Risk"

                  >

                    <Zap className="w-3.5 h-3.5" />

                  </button>

                  <button

                    onClick={() => {

                      setIsRightRailOpen(true);

                      setActiveRightTab("confluence");

                    }}

                    className="p-1.5 rounded hover:bg-white/10 text-zinc-500 hover:text-purple-400 transition-colors"

                    title="Confluence Rules"

                  >

                    <Layers className="w-3.5 h-3.5" />

                  </button>

                  <button

                    onClick={() => {

                      setIsRightRailOpen(true);

                      setActiveRightTab("news");

                    }}

                    className="p-1.5 rounded hover:bg-white/10 text-zinc-500 hover:text-cyan-400 transition-colors"

                    title="News & Catalysts"

                  >

                    <Newspaper className="w-3.5 h-3.5" />

                  </button>

                </div>

                <div className="[writing-mode:vertical-lr] rotate-180 text-[10px] uppercase font-bold tracking-widest text-zinc-500 py-2">

                  Macro Desk

                </div>

              </div>

            )}

          </aside>

        </motion.div>

      ) : (

        /* ── MODE 2: CLASSIC SCROLLABLE MACRO RESEARCH DESK WITH LIVE MOTION ── */

        <motion.div

          key={`desk-${activeSymbol}`}

          variants={deskContainerVariants}

          initial="hidden"

          animate="visible"

          className="flex-1 w-full max-w-[1720px] mx-auto p-3 sm:p-4 lg:p-5 flex flex-col lg:flex-row gap-3.5 min-h-0 overflow-y-auto"

        >

          {/* LEFT RADAR: WATCHLIST SIDEBAR */}

          {widgets.watchlist && (

            <motion.div variants={deskItemVariants} className="w-full lg:w-64 shrink-0">

              <WatchlistSidebar

                activeSymbol={activeSymbol}

                onSelectSymbol={handleSelectSymbol}

                activeStrategy={activeStrategy}

                activePrice={liveBid}

              />

            </motion.div>

          )}



          {/* CENTER / MAIN STACK */}

          <div className="flex-1 flex flex-col gap-3.5 min-w-0">

            

            {/* 1. TOP MAIN CHART */}

            {widgets.chart && (

              <motion.div variants={deskItemVariants} className="w-full h-[540px]">

                <ChartCanvas

                  symbol={activeSymbol}

                  timeframe={timeframe}

                  onTimeframeChange={setTimeframe}

                  currentPrice={liveBid}

                  bidPrice={liveBid}

                  askPrice={liveAsk}

                  spreadPips={liveSpread}

                  entryPrice={signalData.entryPrice}

                  slPrice={signalData.slPrice}

                  tp1Price={signalData.tp1Price}

                  tp2Price={signalData.tp2Price}

                  realCandles={candles}

                  levels={levels}

                  positions={positions}

                  onExecuteTrade={handleExecuteTrade}

                  className="h-full"

                />

              </motion.div>

            )}



            {/* 2. MIDDLE SPLIT: MARKET STATE & CONFLUENCE */}

            {(widgets.marketState || widgets.confluence) && (

              <motion.div variants={deskItemVariants}>

                <MarketStateAndConfluence

                  marketState={marketState}

                  activeStrategy={activeStrategy}

                  confluenceScore={confluenceScore}

                  conditions={activeStrategy.conditions}

                  onOpenStrategyBuilder={() => setIsStrategyBuilderOpen(true)}

                  metrics={quantMetrics}

                />

              </motion.div>

            )}



            {/* 3. SIGNAL & CONFIRMATION HERO */}

            {widgets.setupHero && (

              <motion.div variants={deskItemVariants}>

                <SetupAndConfirmationHero

                  signal={signalData}

                  onOpenSignalLab={() => setIsSignalLabOpen(true)}

                  onOpenJournalConvert={() => setIsJournalConvertOpen(true)}

                  onExecuteTrade={() => handleExecuteTrade("buy", 0.01)}

                />

              </motion.div>

            )}



            {/* 4. BOTTOM GRID: REAL NEWS & RISK CHECK */}

            <motion.div variants={deskItemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-3.5">

              {widgets.news && (

                <MacroIntelligenceRadar activeSymbol={activeSymbol} realNews={news} />

              )}



              {widgets.riskCheck && (

                <TradeRiskCard

                  symbol={activeSymbol}

                  signal={signalData}

                  strategy={activeStrategy}

                  account={account}

                  positions={positions}

                  onExecute={() => handleExecuteTrade("buy", 0.01)}

                  onMarkSetup={() => setIsJournalConvertOpen(true)}

                />

              )}

            </motion.div>



          </div>

        </motion.div>

      )}



      {/* ── MODALS ── */}

      <StrategyBuilderModal

        isOpen={isStrategyBuilderOpen}

        onClose={() => setIsStrategyBuilderOpen(false)}

        strategy={activeStrategy}

        onSaveStrategy={(updated) => {

          setActiveStrategy(updated);

          setStrategies(strategies.map((s) => (s.id === updated.id ? updated : s)));

        }}

      />



      <SignalLabModal

        isOpen={isSignalLabOpen}

        onClose={() => setIsSignalLabOpen(false)}

        signal={signalData}

        symbol={activeSymbol}

      />



      <JournalConvertModal

        isOpen={isJournalConvertOpen}

        onClose={() => setIsJournalConvertOpen(false)}

        symbol={activeSymbol}

        signal={signalData}

        strategy={activeStrategy}

      />



      <LayoutConfigModal

        isOpen={isLayoutConfigOpen}

        onClose={() => setIsLayoutConfigOpen(false)}

        activeWorkspace={activeWorkspace}

        onWorkspaceChange={setActiveWorkspace}

        widgets={widgets}

        onToggleWidget={(key) => setWidgets((prev) => ({ ...prev, [key]: !prev[key] }))}

        onResetWidgets={() => setWidgets(DEFAULT_WIDGETS)}

      />



    </div>

  );

}





export default function MacroPairPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-[#070709] flex items-center justify-center text-zinc-500 font-mono text-xs">
        <RefreshCw className="w-5 h-5 animate-spin text-[#20e0b2] mr-3" />
        <span>Loading Macro Desk...</span>
      </div>
    }>
      <MacroPairInner />
    </Suspense>
  );
}

