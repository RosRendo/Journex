//+------------------------------------------------------------------+
//|                                                 EAController.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "StateManager.mqh"
#include "../Strategies/BaseStrategy.mqh"
#include "../Strategies/ICT/ICTSniperStrategy.mqh"
#include "../Strategies/ICT/ICTScalperStrategy.mqh"
#include "../Strategies/MeanReversion/MeanReversionStrategy.mqh"
#include "../Strategies/Breakout/BreakoutStrategy.mqh"
#include "../Strategies/Momentum/MomentumScalperStrategy.mqh"

#include "../PositionManagement/BasePositionManager.mqh"
#include "../PositionManagement/Single/SinglePositionManager.mqh"
#include "../PositionManagement/PartialExit/PartialExitManager.mqh"
#include "../PositionManagement/Grid/GridPositionManager.mqh" // DISABLED: kept for reference only — do not instantiate

#include "../Risk/RiskManager.mqh"
#include "../Execution/OrderManager.mqh"
#include "../Analytics/TradeJournal.mqh"
#include "../Analytics/PerformanceAnalyzer.mqh"
#include "../Analytics/Statistics.mqh"
#include "../Analytics/TradeAnalyticsLogger.mqh"
#include "../Analytics/StatisticsEngine.mqh"

#include "../Communication/SettingsClient.mqh"
#include "../Communication/Heartbeat.mqh"
#include "../Communication/TradeReporter.mqh"
#include "../Scanner/ScannerEngine.mqh"
#include "../Dashboard/MainPanel.mqh"
#include "../Dashboard/Visualizer.mqh"
#include "DecisionEngine/DecisionEngine.mqh"
#include "MarketRegimeGate.mqh"
#include "RecoveryStateMachine.mqh"
#include "../Targets/StopModel.mqh"
#include "../Targets/TakeProfitModel.mqh"
#include "ResearchMode.mqh"

//+------------------------------------------------------------------+
//| EA Lifecycle Controller Coordinating Pipeline Flow               |
//+------------------------------------------------------------------+
class EAController
  {
private:
   //+------------------------------------------------------------------+
   //| Core Timeframe Scan & Planning Pipeline                          |
   //+------------------------------------------------------------------+
   void RunScannerPipeline()
     {
      if(is_paused || is_disabled) return;

      if(parsed_signal_tf_str == "ALL")
        {
         ProcessPipelineForTimeframe(PERIOD_M1, "M1");
         ProcessPipelineForTimeframe(PERIOD_M5, "M5");
         ProcessPipelineForTimeframe(PERIOD_M15, "M15");
         ProcessPipelineForTimeframe(PERIOD_H1, "H1");
         ProcessPipelineForTimeframe(PERIOD_H4, "H4");
        }
      else
        {
         ProcessPipelineForTimeframe(parsed_signal_tf, parsed_signal_tf_str);
        }
     }

   void ProcessPipelineForTimeframe(ENUM_TIMEFRAMES tf, string tf_str)
     {
      TradeSignal signal;
      ConfluenceResult confluence;
      
      // 1. Strategy Layer: Scan & Confluence check
      if(active_strategy != NULL && active_strategy.Scan(tf, tf_str, signal))
        {
         if(!MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_OPTIMIZATION))
           {
            Print("[debug] Scan found candidate: ", signal.type, " (Reason: ", signal.reason, ")");
           }
         
         // T016 / T017 [US1]: Market Regime Gate evaluation
         // T029 [US3]: Validate and buffer raw structural SL with ATR
         // T029 [US3] & T054 [P]: Validate and buffer raw structural SL with ATR
         double buffered_sl = StopModel::ValidateAndBuffer(signal.entry_price, signal.invalidation_price, tf);
         if(buffered_sl <= 0.0)
           {
            Print("[StopModel] Trade blocked: ATR=0.0 or invalid SL levels for tf=", EnumToString(tf));
            return;
           }
         signal.invalidation_price = buffered_sl;

         MarketRegimeState reg_state = MarketRegimeDetector::DetectState(tf);
         signal.regime = reg_state.regime; // T017: populate regime on TradeSignal
         
         if(!MarketRegimeGate::IsRegimePermitted(signal.strategy_id, reg_state.regime))
           {
            static datetime last_regime_block_log = 0;
            if(TimeCurrent() - last_regime_block_log >= 1800)
              {
               Print("[Regime Gate] Blocked candidate for ", signal.strategy_id, " in regime: ", reg_state.regime, " (Confidence: ", reg_state.confidence, "%)");
               last_regime_block_log = TimeCurrent();
              }
            return;
           }
         
         // T050 [REC]: Check if new entries on this symbol are blocked by Recovery State Machine
         if(RecoveryStateMachine::IsNewEntryBlocked(_Symbol, g_recovery_state.state))
           {
            static datetime last_rec_block_log = 0;
            if(TimeCurrent() - last_rec_block_log >= 1800)
              {
               Print("[RecoverySM Gate] Blocked candidate for ", _Symbol, ": Recovery state is ", 
                     RecoveryStateMachine::StateToString(g_recovery_state.state), " (Reason: ", g_recovery_state.reason, ")");
               last_rec_block_log = TimeCurrent();
              }
            return;
           }

         // Calculate strategy-specific custom confluence score
         ConfluenceResult strat_conf = active_strategy.CalculateConfluence(signal);
         
         // Use our Decision Intelligence Engine to evaluate multi-factor confluence score
         DecisionResult dec = DecisionEngine::Evaluate(tf, signal, InpStrategyType, min_score, strat_conf.score);
         
         // T025 [US2]: Hard score guard (< 60 = NO_TRADE tier per FR-013)
         if(dec.breakdown.total < 60)
           {
            dec.is_approved = false;
            static datetime last_score_guard_print = 0;
            if(TimeCurrent() - last_score_guard_print >= 1800)
              {
               Print("[Score Gate] SKIPPED: score ", dec.breakdown.total, " < threshold 60 (Tier: ", dec.breakdown.tier, ")");
               last_score_guard_print = TimeCurrent();
              }
            return;
           }
         
         if(!dec.is_approved)
           {
            // Rate-limited print for Strategy Tester to identify silent blocks
            static datetime last_rej_print = 0;
            if(TimeCurrent() - last_rej_print >= 3600)
              {
               Print("[debug] DecisionEngine Rejected. Score: ", dec.score, " | RiskPass: ", dec.risk_pass, 
                     " | SessionPass: ", dec.session_pass, " | Spread: ", dec.spread_points, "<=", InpMaxSpreadPoints);
               last_rej_print = TimeCurrent();
              }
            return;
           }
           
         if(!MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_OPTIMIZATION))
           {
            Print("[debug] Decision Score: ", dec.score, " | Grade: ", dec.grade, " | IsApproved: ", dec.is_approved);
           }
         
         // Update display variables and map confluence for telemetry compatibility
         confluence.score = dec.score;
         confluence.grade = dec.grade;
         confluence.is_valid = dec.is_approved;

         last_sig_type   = signal.type;
         last_sig_score  = dec.score;
         last_sig_entry  = signal.entry_price;
         last_sig_sl     = signal.invalidation_price;
         last_sig_time   = TimeCurrent();
         last_sig_grade  = dec.grade;
         last_sig_breakdown = dec.breakdown; // T026: cache breakdown for dashboard

         // Check Day/Time & calendar news constraints (Bypass for Momentum Scalper)
         if(InpStrategyType != STRATEGY_MOMENTUM_SCALPER)
           {
            if(!ValidateSignal(tf)) 
              { 
               if(!MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_OPTIMIZATION))
                 {
                  Print("[debug] Signal validation failed (Spread, Day/Time, or News block)."); 
                 }
               return; 
              }
           }

         // T036 [US5]: Research Mode intercept - log setup without executing live orders
         if(ResearchMode::IsActive())
           {
            ResearchSetup r_setup;
            datetime bar_time = iTime(_Symbol, tf, 0);
            if(bar_time <= 0) bar_time = TimeCurrent();
            r_setup.setup_id = _Symbol + "_" + tf_str + "_" + IntegerToString((int)bar_time) + "_" + signal.type;
            r_setup.symbol = _Symbol;
            r_setup.direction = signal.type;
            r_setup.timeframe = tf_str;
            r_setup.detected_at = TimeCurrent();
            r_setup.entry = signal.entry_price;
            r_setup.sl = signal.invalidation_price;
            TakeProfitModel::IdentifyTargets(tf, signal, r_setup.tp1, r_setup.tp2, r_setup.tp3);
            r_setup.score = dec.breakdown;
            r_setup.regime = signal.regime;
            r_setup.session = GetCurrentSession();
            r_setup.sim_outcome = "OPEN";
            r_setup.outcome_finalized = false;

            ResearchMode::LogSetup(r_setup);
            return; // Suppress live execution
           }

         // 2. Risk Manager: Validate trade permission & calculate sizing
         bool trade_allowed = (InpStrategyType == STRATEGY_MOMENTUM_SCALPER) ? true : IsTradeAllowed(signal);
         
         // MODE_GRID is permanently disabled (constitution violation).
          // Grid basket gate removed; no new positions blocked by grid logic.
         
         if(trade_allowed)
           {
            double lots = GetPositionSize(signal, dec.score);
            if(lots <= 0) 
              { 
               static datetime last_size_fail = 0;
               if(TimeCurrent() - last_size_fail >= 3600)
                 {
                  Print("[debug] Sizing failed (lots <= 0). Invalid SL/TP distance or tiny balance."); 
                  last_size_fail = TimeCurrent();
                 }
               return; 
              }
            
            // Build the execution plan
            TradePlan plan;
            plan.symbol = _Symbol;
            plan.type = signal.type;
            plan.entry_price = signal.entry_price;
            plan.sl = signal.invalidation_price;
            
            // T033 [US3]: Identify structural targets TP1, TP2, TP3
            TakeProfitModel::IdentifyTargets(tf, signal, plan.tp1, plan.tp2, plan.tp3);
            plan.lots = lots;
            
            string sig_id = signal.signal_id;
            if(StringLen(sig_id) == 0)
              {
               datetime bar_time = iTime(_Symbol, tf, 0);
               if(bar_time <= 0) bar_time = TimeCurrent();
               sig_id = _Symbol + "-" + tf_str + "-" + IntegerToString((int)bar_time) + "-" + StringSubstr(plan.type, 0, 1);
              }
            plan.signal_id = sig_id;
            
            if(!IsSignalExecuted(sig_id))
              {
               Print("Pipeline executing signal: ", sig_id, " | Lots: ", lots);
               
               // Send telemetry (with reason & warning explanations)
               ReportSignalDetected(sig_id, plan.type, plan.entry_price, plan.sl, plan.tp1, confluence.score, confluence.grade, tf_str,
                                    dec.reasons, dec.reason_count,
                                    dec.warnings, dec.warning_count);
               
               // 3. Execution Engine: Execute the plan
               ulong ticket = OrderManager::ExecuteTradePlan(plan);
               if(ticket > 0)
                 {
                  AddExecutedSignal(sig_id);
                  
                  // 4. Register target states with Position Manager
                  if(active_position_manager != NULL)
                    {
                     active_position_manager.RegisterPosition(ticket, plan.sl, plan.tp1, plan.tp2, plan.tp3);
                    }
                    
                  // 5. Analytics Layer: Log trade event to journal
                  TradeJournal::LogEvent("open", ticket, _Symbol, plan.type, lots, plan.entry_price, plan.sl, plan.tp1, signal.reason);
                  
                  // Compute exact InitialRiskMoney calculated by PositionSizing
                  double balance = AccountInfoDouble(ACCOUNT_BALANCE);
                  if(dyn_max_balance_compounding > 0.0 && balance > dyn_max_balance_compounding)
                     balance = dyn_max_balance_compounding;
                  double final_risk = GetTierRisk(dec.breakdown.total);
                  if(final_risk <= 0.0) final_risk = risk_percent;
                  double risk_amount = balance * (final_risk / 100.0);
                  
                  string setup_id = signal.strategy_id + "_" + signal.reason;
                  TradeAnalyticsLogger::RegisterTrade(ticket, signal, dec, risk_amount, setup_id);
                 }
              }
           }
         else
           {
            static datetime last_risk_fail = 0;
            if(TimeCurrent() - last_risk_fail >= 3600)
              {
               Print("[debug] Trade rejected by Risk Manager checks.");
               last_risk_fail = TimeCurrent();
              }
           }
        }
     }

public:
   //+------------------------------------------------------------------+
   //| Initialize EA components and state variables                     |
   //+------------------------------------------------------------------+
   int Initialize()
     {
      // Initialize Order Manager Magic number
      OrderManager::Init();
      trade.SetExpertMagicNumber(InpMagic);
      
      // Initialize dynamic configuration state
      InitState();
      
      // Initialize Trade Analytics Logger
      TradeAnalyticsLogger::InitLogger(InpMagic);
      
      // Instantiate selected strategy dynamically
      if(InpStrategyType == STRATEGY_ICT_SNIPER)
        {
         active_strategy = new ICTSniperStrategy();
        }
      else if(InpStrategyType == STRATEGY_ICT_SCALPER)
        {
         active_strategy = new ICTScalperStrategy();
        }
      else if(InpStrategyType == STRATEGY_MEAN_REVERSION)
        {
         active_strategy = new MeanReversionStrategy();
        }
      else if(InpStrategyType == STRATEGY_BREAKOUT)
        {
         active_strategy = new BreakoutStrategy();
        }
      else if(InpStrategyType == STRATEGY_MOMENTUM_SCALPER)
        {
         active_strategy = new MomentumScalperStrategy();
         signal_interval = 5; // High-frequency: scan every 5 seconds
         Print("[MomentumScalper] Active. Signal interval set to 5 seconds.");
        }
      else
        {
         active_strategy = new ICTSniperStrategy(); // Fallback
        }
         
      // Instantiate selected position manager dynamically
      if(InpPositionMode == MODE_SINGLE)
        {
         active_position_manager = new SinglePositionManager();
        }
      else if(InpPositionMode == MODE_PARTIAL_EXIT)
        {
         active_position_manager = new PartialExitManager();
        }
      else
        {
         // MODE_GRID is permanently disabled. Fall back to single.
         Print("[WARN] MODE_GRID is disabled (constitution violation). Falling back to MODE_SINGLE.");
         active_position_manager = new SinglePositionManager();
        }
      
      // Event timer hook for background HTTP queries
      EventSetTimer(1);
      
      Print("Adaptive ICT EA initialized with Magic: ", InpMagic);
      
      // Initialize display overlays
      RenderChartPanel();
      
      return(INIT_SUCCEEDED);
     }
      
   //+------------------------------------------------------------------+
   //| Handle Tick events (route trailing stop calculations)            |
   //+------------------------------------------------------------------+
   void OnTick()
     {
      // Update Trade Analytics Logger metrics
      TradeAnalyticsLogger::UpdateRunningMetrics();
      TradeAnalyticsLogger::FinalizeClosedTrades();

      if(is_paused || is_disabled) return;
      
      static bool first_tick = true;
      if(first_tick && (MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)))
        {
         Print("[debug] OnTick handler executing! First tick time: ", TimeToString(TimeCurrent()));
         first_tick = false;
        }

      // Update trade visual drawings (Bypassed in Strategy Tester / Optimizer to increase speed)
      if(!MQLInfoInteger(MQL_TESTER) && !MQLInfoInteger(MQL_OPTIMIZATION))
        {
         Visualizer::UpdateVisuals();
        }

      // Dynamic Hot-Swap for Position Manager
      static ENUM_POSITION_MODE last_mode = InpPositionMode;
      if (last_mode != dyn_position_mode)
        {
         if(active_position_manager != NULL) delete active_position_manager;
         if(dyn_position_mode == MODE_SINGLE) active_position_manager = new SinglePositionManager();
         else if(dyn_position_mode == MODE_PARTIAL_EXIT) active_position_manager = new PartialExitManager();
         else
           {
            // MODE_GRID is permanently disabled. Ignore and keep current manager.
            Print("[WARN] Hot-swap to MODE_GRID blocked (constitution violation). Using MODE_SINGLE.");
            active_position_manager = new SinglePositionManager();
           }
         Print("[debug] Position Manager dynamically hot-swapped to ", EnumToString(dyn_position_mode));
         last_mode = dyn_position_mode;
        }

      // --- Global Equity Nuke (Pyramiding Trailing Stop) ---
      static double max_equity_peak = 0.0;
      
      if(PositionsTotal() == 0)
        {
         max_equity_peak = 0.0;
        }
      else if(dyn_use_equity_trail)
        {
         double current_balance = AccountInfoDouble(ACCOUNT_BALANCE);
         double current_equity = AccountInfoDouble(ACCOUNT_EQUITY);
         
         if(max_equity_peak == 0.0) max_equity_peak = current_equity;
         if(current_equity > max_equity_peak) max_equity_peak = current_equity;
         
         double activation_equity = current_balance * (1.0 + dyn_equity_trail_activate / 100.0);
         if(max_equity_peak >= activation_equity)
           {
            double drop_threshold = max_equity_peak * (1.0 - dyn_equity_trail_drop / 100.0);
            if(current_equity <= drop_threshold)
              {
               Print("!!! GLOBAL EQUITY NUKE ACTIVATED !!! Peak: ", DoubleToString(max_equity_peak, 2), " | Trigger: ", DoubleToString(drop_threshold, 2), " | Current: ", DoubleToString(current_equity, 2));
               for(int i = PositionsTotal() - 1; i >= 0; i--)
                 {
                  ulong tkt = PositionGetTicket(i);
                  if(tkt > 0 && PositionGetInteger(POSITION_MAGIC) == InpMagic)
                    {
                     trade.PositionClose(tkt);
                    }
                 }
               max_equity_peak = 0.0;
               return; // Exit OnTick immediately to process closes
              }
           }
           
         // --- Emergency Parachute (Hard Stop) ---
         double hard_stop_equity = current_balance * (1.0 - dyn_hard_stop_pct / 100.0);
         if(current_equity <= hard_stop_equity && current_equity > 0)
           {
            Print("!!! EMERGENCY PARACHUTE DEPLOYED !!! Balance: ", DoubleToString(current_balance, 2), " | Hard Stop: ", DoubleToString(hard_stop_equity, 2), " | Current: ", DoubleToString(current_equity, 2));
            for(int i = PositionsTotal() - 1; i >= 0; i--)
              {
               ulong tkt = PositionGetTicket(i);
               if(tkt > 0 && PositionGetInteger(POSITION_MAGIC) == InpMagic)
                 {
                  trade.PositionClose(tkt);
                 }
              }
            max_equity_peak = 0.0;
            return;
           }
        }
      // -----------------------------------------------------

      // === Momentum Scalper: Time-Based Forced Exit ===
      if(InpStrategyType == STRATEGY_MOMENTUM_SCALPER && InpMomMaxHoldingSec > 0)
        {
         datetime now_t = TimeCurrent();
         for(int i = PositionsTotal() - 1; i >= 0; i--)
           {
            ulong tkt = PositionGetTicket(i);
            if(tkt > 0 && PositionGetInteger(POSITION_MAGIC) == InpMagic && PositionGetString(POSITION_SYMBOL) == _Symbol)
              {
               datetime open_time = (datetime)PositionGetInteger(POSITION_TIME);
               int held_sec = (int)(now_t - open_time);
               if(held_sec >= InpMomMaxHoldingSec)
                 {
                  double pnl = PositionGetDouble(POSITION_PROFIT);
                  Print("[MomScalper] Force-closing position #", tkt, " | Held: ", held_sec, "s | PnL: ", DoubleToString(pnl, 2));
                  trade.PositionClose(tkt);
                 }
              }
           }
        }

      if(active_position_manager != NULL)
        {
         active_position_manager.ManagePositions();

       // T055 [P]: Guard for manually closed positions in MT5
       for(int h_idx = 0; h_idx < HEALTH_STATE_MAX; h_idx++)
         {
          ulong tracked_ticket = g_health_states[h_idx].ticket;
          if(tracked_ticket > 0)
            {
             if(!PositionSelectByTicket(tracked_ticket))
               {
                Print("[Guard] Position ", tracked_ticket, " closed externally. Cleaning health and recovery states.");
                RemoveHealthState(tracked_ticket);
                if(PositionsTotal() == 0)
                  {
                   g_recovery_state.state = RECOVERY_NORMAL;
                   g_recovery_state.reason = "Position closed externally; reset to NORMAL";
                   g_recovery_state.danger_bar_count = 0;
                   g_recovery_state.healthy_bar_count = 0;
                   g_recovery_state.transitioned_at = TimeCurrent();
                  }
               }
            }
         }
        }

      // Run timeframe scanning pipeline (crucial for Strategy Tester where OnTimer does not fire)
      datetime now = TimeCurrent();
      if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION) || InpStrategyType == STRATEGY_MOMENTUM_SCALPER)
        {
         RunScannerPipeline();
        }
      else
        {
         if(now - last_signal_poll >= signal_interval)
           {
            RunScannerPipeline();
            last_signal_poll = now;
           }
        }
     }
      
   //+------------------------------------------------------------------+
   //| Handle Timer intervals (route dashboard redrawing, signals, telemetry)|
   //+------------------------------------------------------------------+
   void OnTimer()
     {
      datetime now = TimeCurrent();
      
      // Refresh Chart Panel Graphics
      // T037 [US5]: Update simulated outcomes for Research Mode
      if(ResearchMode::IsActive())
        {
         ResearchMode::CheckAllOutcomes(parsed_signal_tf);
        }
      RenderChartPanel();
      
      // Send Heartbeat Status Reports
      if(now - last_report_time >= report_interval)
        {
         SendHeartbeatReport();
         last_report_time = now;
        }
         
      // Pull dynamic settings adjustments from Dashboard
      if(now - last_settings_poll >= settings_interval)
        {
         PollRemoteSettings();
         last_settings_poll = now;
        }
         
      // Run timeframe scanning pipeline (only if NOT Momentum Scalper, since that runs on every tick in OnTick)
      if(InpStrategyType != STRATEGY_MOMENTUM_SCALPER)
        {
         if(now - last_signal_poll >= signal_interval)
           {
            RunScannerPipeline();
            last_signal_poll = now;
           }
        }
     }
      
   //+------------------------------------------------------------------+
   //| Handle EA Shutdown and cleanup                                   |
   //+------------------------------------------------------------------+
   void Shutdown(const int reason)
     {
      EventKillTimer();
      ObjectsDeleteAll(0, "ea_panel_");
      Visualizer::CleanAllVisuals();
      
      // Print overall performance analysis stats
      PerformanceAnalyzer::PrintStats();
      
      // T046 [US6]: Compute score-band statistics and validate scoring model
      StatisticsEngine::ComputeBandStats();
      
      // Delete dynamic objects to prevent memory leaks
      if(active_strategy != NULL)
        {
         delete active_strategy;
         active_strategy = NULL;
        }
      if(active_position_manager != NULL)
        {
         delete active_position_manager;
         active_position_manager = NULL;
        }
         
      Print("Adaptive ICT EA shutdown.");
     }
  };
