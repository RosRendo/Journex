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
#include "../PositionManagement/Grid/GridPositionManager.mqh"

#include "../Risk/RiskManager.mqh"
#include "../Execution/OrderManager.mqh"
#include "../Analytics/TradeJournal.mqh"
#include "../Analytics/PerformanceAnalyzer.mqh"
#include "../Analytics/Statistics.mqh"
#include "../Analytics/TradeAnalyticsLogger.mqh"

#include "../Communication/SettingsClient.mqh"
#include "../Communication/Heartbeat.mqh"
#include "../Communication/TradeReporter.mqh"
#include "../Scanner/ScannerEngine.mqh"
#include "../Dashboard/MainPanel.mqh"
#include "../Dashboard/Visualizer.mqh"
#include "DecisionEngine/DecisionEngine.mqh"

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
         
         // Calculate strategy-specific custom confluence score
         ConfluenceResult strat_conf = active_strategy.CalculateConfluence(signal);
         
         // Use our Decision Intelligence Engine to evaluate multi-factor confluence score
         DecisionResult dec = DecisionEngine::Evaluate(tf, signal.type, InpStrategyType, min_score, strat_conf.score);
         
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

         // 2. Risk Manager: Validate trade permission & calculate sizing
         bool trade_allowed = (InpStrategyType == STRATEGY_MOMENTUM_SCALPER) ? true : IsTradeAllowed(signal);
         
         // Fix: Do not allow the base strategy to open new positions if a grid basket is currently active.
         if(dyn_position_mode == MODE_GRID)
           {
            int grid_open_count = 0;
            for(int i = PositionsTotal() - 1; i >= 0; i--)
              {
               if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
                  grid_open_count++;
              }
            if(grid_open_count > 0)
              {
               trade_allowed = false;
              }
           }
         
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
            
            // Default target spacing calculated from SL distance
            double invalidation_dist = MathAbs(signal.entry_price - signal.invalidation_price);
            plan.tp1 = (signal.type == "BUY") ? signal.entry_price + invalidation_dist * InpMinRR : signal.entry_price - invalidation_dist * InpMinRR;
            plan.tp2 = 0;
            plan.tp3 = 0;
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
                  double final_risk = risk_percent;
                  if(dec.score >= 85)       final_risk = risk_percent * 1.5;
                  else if(dec.score <= 55)  final_risk = risk_percent * 0.5;
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
      else if(InpPositionMode == MODE_GRID)
        {
         active_position_manager = new GridPositionManager();
        }
      else
        {
         active_position_manager = new SinglePositionManager(); // Fallback
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
         else if(dyn_position_mode == MODE_GRID) active_position_manager = new GridPositionManager();
         else active_position_manager = new SinglePositionManager();
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
      // Disable time-based exit if we are running a Grid, as Grid needs to hold positions for recovery.
      if(InpStrategyType == STRATEGY_MOMENTUM_SCALPER && InpMomMaxHoldingSec > 0 && dyn_position_mode != MODE_GRID)
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
