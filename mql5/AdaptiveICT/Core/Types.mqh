//+------------------------------------------------------------------+
//|                                                        Types.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

//+------------------------------------------------------------------+
//| Custom Structures for Scanner Core                               |
//+------------------------------------------------------------------+
struct MqlSwing
  {
   int               index;
   double            price;
   datetime          time;
   bool              is_high;
  };

struct MqlFVG
  {
   bool              is_bullish;
   int               index;
   double            top;
   double            bottom;
   datetime          time;
  };

struct MqlOB
  {
   bool              is_bullish;
   double            price_high;
   double            price_low;
   datetime          time;
  };

struct MqlSweep
  {
   string            type; // "SSL" or "BSL"
   double            level;
  };

struct MqlPositionState
  {
   ulong             ticket;
   bool              tp1_hit;
   bool              tp2_hit;
   double            original_sl;
   double            tp1;
   double            tp2;
   double            tp3;
   datetime          last_health_bar;
  };

//+------------------------------------------------------------------+
//| Decoupled Data Transfer Objects (DTOs)                           |
//+------------------------------------------------------------------+
// TradeSignal is the core DTO produced by the Strategy layer.
// It carries all information needed by Risk, Execution, and Analytics layers.
// Strategies generate this. They do NOT call Buy() or Sell() directly.
struct TradeSignal
  {
   string            symbol;
   string            type;                  // "BUY", "SELL", "NO_TRADE"
   string            strategy_id;           // e.g. "ICT_SNIPER", "ICT_SCALPER"
   ENUM_TIMEFRAMES   signal_tf;             // Timeframe the signal was detected on
   ENUM_TIMEFRAMES   confirmation_tf;       // Higher TF used for confirmation bias
   ENUM_TIMEFRAMES   context_tf;            // Highest TF for directional context
   string            tf_str;               // Human-readable signal timeframe label
   double            entry_price;
   double            invalidation_price;    // Raw swing boundary (pre-risk sizing)
   string            reason;               // Human-readable signal reason
   string            signal_id;            // Unique signal de-duplication key
   string            regime;               // T017: Market regime at scan time (populated by EAController)
  };

// Kept as alias for backward compatibility during migration
#define SignalCandidate TradeSignal

struct ConfluenceResult
  {
   int               score;      // 0 to 100
   string            grade;      // "A+", "A", "B", "C", "Reject"
   bool              is_valid;
  };

//+------------------------------------------------------------------+
//| T006: Entry Quality Score — per-component breakdown              |
//| Every evaluated setup must carry this for logging and audit.     |
//| Weights are configurable via InpScoreWeight* inputs.             |
//| Maps to: FR-010, FR-011, FR-012                                  |
//+------------------------------------------------------------------+
struct EntryScoreBreakdown
  {
   int               regime_pts;          // Market Regime component (max InpScoreWeightRegime)
   int               htf_structure_pts;   // HTF Structure component (max InpScoreWeightHTFStructure)
   int               liquidity_pts;       // Liquidity component (max InpScoreWeightLiquidity)
   int               entry_location_pts;  // Entry Location (max InpScoreWeightEntryLocation)
   int               mss_pts;             // MSS/BOS component (max InpScoreWeightMSS)
   int               fvg_ob_pts;          // FVG/OB component (max InpScoreWeightFVGOB)
   int               smt_pts;             // SMT component (max InpScoreWeightSMT)
   int               volatility_pts;      // Volatility component (max InpScoreWeightVolatility)
   int               session_pts;         // Session component (max InpScoreWeightSession)
   int               exec_quality_pts;    // Execution Quality (max InpScoreWeightExecQuality)
   int               total;               // Sum of all components (0-100)
   string            tier;                // "NO_TRADE" / "LOW" / "NORMAL" / "HIGH_QUALITY" / "MAXIMUM"
  };

struct DecisionResult
  {
   int               score;
   string            grade;
   string            regime;
   int               regime_confidence;
   string            volatility;
   double            vol_multiplier;
   int               execution_score;
   int               spread_points;
   bool              session_pass;
   bool              risk_pass;
   bool              is_approved;
   string            reasons[10];
   string            warnings[5];
   int               reason_count;
   int               warning_count;
   EntryScoreBreakdown breakdown;  // T023: per-component score breakdown (populated by EntryQualityEngine)
  };

struct TradePlan
  {
   string            symbol;
   string            type;       // "BUY", "SELL"
   double            entry_price;
   double            sl;
   double            tp1;
   double            tp2;
   double            tp3;
   double            risk_reward;
   string            reasoning;
   string            signal_id;
   int               confidence;
   double            lots;       // Calculated lot size based on risk parameters
  };

//+------------------------------------------------------------------+
//| T007: Market Regime State — classification with confidence       |
//| Re-evaluated at InpRegimeIntervalBars frequency.                 |
//| Maps to: FR-003, FR-005                                          |
//+------------------------------------------------------------------+
struct MarketRegimeState
  {
   string            regime;          // TRENDING_BULLISH / TRENDING_BEARISH / RANGING /
                                      // HIGH_VOLATILITY / LOW_VOLATILITY / TRANSITION / UNKNOWN
   int               confidence;      // 0-100: how strongly the regime is expressed
   datetime          evaluated_at;    // Timestamp of last evaluation
  };

//+------------------------------------------------------------------+
//| T008: Trade Health State — post-entry thesis monitoring          |
//| Re-evaluated on each new bar while position is open.             |
//| Maps to: FR-025, FR-026, FR-027                                  |
//+------------------------------------------------------------------+
struct TradeHealthState
  {
   int               score;           // 0-100 composite health score
   string            label;           // "HEALTHY" / "WEAKENING" / "DANGER" / "THESIS_INVALIDATED"
   string            factor_notes;    // Comma-separated top contributing factors (for logging)
   datetime          evaluated_at;    // Timestamp of last evaluation
   ulong             ticket;          // Position ticket this state belongs to
  };

//+------------------------------------------------------------------+
//| T009: Recovery State Machine — per-symbol protection states      |
//| Transitions: NORMAL -> WEAKENING -> RISK_PROTECTION ->           |
//|              OBSERVATION -> CONFIRMED / INVALIDATED              |
//| Maps to: FR-029, FR-030, FR-031                                  |
//+------------------------------------------------------------------+
enum RecoveryStateEnum
  {
   RECOVERY_NORMAL,          // No threat — full risk allowed
   RECOVERY_WEAKENING,       // Thesis showing signs of weakness
   RECOVERY_RISK_PROTECTION, // New entries on this pair are blocked
   RECOVERY_OBSERVATION,     // Recovering — watching for revalidation
   RECOVERY_CONFIRMED,       // Revalidated — full risk restored
   RECOVERY_INVALIDATED      // Thesis fully invalidated — position closed
  };

struct RecoveryState
  {
   RecoveryStateEnum state;           // Current machine state
   string            reason;          // Human-readable reason for last transition
   datetime          transitioned_at; // Timestamp of last state change
   int               danger_bar_count; // Bars spent in DANGER (triggers RISK_PROTECTION)
   int               healthy_bar_count; // Bars spent HEALTHY in OBSERVATION (triggers CONFIRMED)
  };

//+------------------------------------------------------------------+
//| T010: Research Setup — non-trading simulation record             |
//| Written by ResearchMode when InpResearchModeOnly = true.         |
//| Maps to: FR-039, FR-040                                          |
//+------------------------------------------------------------------+
struct ResearchSetup
  {
   string            setup_id;        // Unique ID: symbol + "_" + TimeToString(detected_at)
   string            symbol;
   string            direction;       // "BUY" or "SELL"
   string            timeframe;       // Human-readable e.g. "H1"
   datetime          detected_at;
   double            entry;
   double            sl;
   double            tp1;
   double            tp2;
   double            tp3;
   EntryScoreBreakdown score;         // Full score breakdown at detection time
   string            regime;          // Market regime at detection time
   string            session;         // Session at detection time (london/ny/asian)
   string            sim_outcome;     // "TP1_HIT" / "TP2_HIT" / "SL_HIT" / "OPEN" / "EXPIRED"
   bool              outcome_finalized;
  };

//+------------------------------------------------------------------+
//| T011: Risk Tier Enum — score-to-risk-percent mapping             |
//| Used by RiskManager::GetTierRisk(score) in Phase 5.              |
//| Maps to: FR-013, FR-014, FR-015                                  |
//+------------------------------------------------------------------+
enum RiskTierEnum
  {
   TIER_NO_TRADE,     // score < 60: no trade
   TIER_LOW,          // score 60-69: InpRiskTierLow (default 0.25%)
   TIER_NORMAL,       // score 70-79: InpRiskTierNormal (default 0.5%)
   TIER_HIGH_QUALITY, // score 80-89: InpRiskTierHigh (default 0.75%)
   TIER_MAXIMUM       // score 90-100: InpRiskTierMax (default 1.0%)
  };

