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

#include "../PositionManagement/BasePositionManager.mqh"
#include "../PositionManagement/Single/SinglePositionManager.mqh"
#include "../PositionManagement/PartialExit/PartialExitManager.mqh"
#include "../PositionManagement/Grid/GridPositionManager.mqh"

#include "../Risk/RiskManager.mqh"
#include "../Execution/OrderManager.mqh"
#include "../Analytics/TradeJournal.mqh"
#include "../Analytics/PerformanceAnalyzer.mqh"
#include "../Analytics/Statistics.mqh"

#include "../Communication/SettingsClient.mqh"
#include "../Communication/Heartbeat.mqh"
#include "../Communication/TradeReporter.mqh"
#include "../Scanner/ScannerEngine.mqh"
#include "../Dashboard/MainPanel.mqh"

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

      string tf_upper = signal_timeframe;
      StringToUpper(tf_upper);
      
      if(tf_upper == "M5" || tf_upper == "ALL")   ProcessPipelineForTimeframe(PERIOD_M5, "M5");
      if(tf_upper == "M15" || tf_upper == "ALL")  ProcessPipelineForTimeframe(PERIOD_M15, "M15");
      if(tf_upper == "H1" || tf_upper == "ALL")   ProcessPipelineForTimeframe(PERIOD_H1, "H1");
      if(tf_upper == "H4" || tf_upper == "ALL")   ProcessPipelineForTimeframe(PERIOD_H4, "H4");
     }

   void ProcessPipelineForTimeframe(ENUM_TIMEFRAMES tf, string tf_str)
     {
      TradeSignal signal;
      ConfluenceResult confluence;
      
      // Print once per new bar in Strategy Tester to confirm the scanner is actively running
      static datetime last_bar_time = 0;
      datetime current_bar_time = 0;
      MqlRates r[];
      int copied_rates = CopyRates(_Symbol, tf, 0, 1, r);
      
      if(copied_rates > 0)
        {
         current_bar_time = r[0].time;
        }
      else
        {
         static datetime last_err_time = 0;
         if(TimeCurrent() - last_err_time >= 3600 && (MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)))
           {
            Print("[debug] CopyRates failed for ", tf_str, " | Error Code: ", GetLastError());
            last_err_time = TimeCurrent();
           }
        }
      
      if(current_bar_time != last_bar_time && (MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)))
        {
         Print("[debug] Active Scan - Symbol: ", _Symbol, " | Timeframe: ", tf_str, " | New Bar Time: ", TimeToString(current_bar_time));
         last_bar_time = current_bar_time;
        }
      
      // 1. Strategy Layer: Scan & Confluence check
      if(active_strategy != NULL && active_strategy.Scan(tf, tf_str, signal))
        {
         Print("[debug] Scan found candidate: ", signal.type, " (Reason: ", signal.reason, ")");
         confluence = active_strategy.CalculateConfluence(signal);
         Print("[debug] Confluence Score: ", confluence.score, " | Grade: ", confluence.grade, " | IsValid: ", confluence.is_valid, " (Required: ", min_score, ")");
         if(!confluence.is_valid) return;
         
         // Update display variables
         last_sig_type   = signal.type;
         last_sig_score  = confluence.score;
         last_sig_entry  = signal.entry_price;
         last_sig_sl     = signal.invalidation_price;
         last_sig_time   = TimeCurrent();
         last_sig_grade  = confluence.grade;

         // Check Day/Time & calendar news constraints
         if(!ValidateSignal(tf)) 
           { 
            Print("[debug] Signal validation failed (Spread, Day/Time, or News block)."); 
            return; 
           }

         // 2. Risk Manager: Validate trade permission & calculate sizing
         if(IsTradeAllowed(signal))
           {
            double lots = GetPositionSize(signal);
            Print("[debug] Risk Manager allowed. Sized lot size: ", lots);
            if(lots <= 0) 
              { 
               Print("[debug] Sizing failed (lots <= 0). Invalid SL/TP distance or tiny balance."); 
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
            
            datetime bar_time = 0;
            MqlRates r[];
            if(CopyRates(_Symbol, tf, 0, 1, r) > 0) bar_time = r[0].time;
            string sig_id = _Symbol + "-" + tf_str + "-" + IntegerToString((int)bar_time) + "-" + StringSubstr(plan.type, 0, 1);
            plan.signal_id = sig_id;
            
            if(!IsSignalExecuted(sig_id))
              {
               Print("Pipeline executing signal: ", sig_id, " | Lots: ", lots);
               
               // Send telemetry
               ReportSignalDetected(sig_id, plan.type, plan.entry_price, plan.sl, plan.tp1, confluence.score, confluence.grade, tf_str);
               
               // 3. Execution Engine: Execute the plan
               ulong ticket = OrderManager::ExecuteTradePlan(plan);
               if(ticket > 0)
                 {
                  Print("[debug] Trade executed successfully, ticket: ", ticket);
                  AddExecutedSignal(sig_id);
                  
                  // 4. Register target states with Position Manager
                  if(active_position_manager != NULL)
                    {
                     active_position_manager.RegisterPosition(ticket, plan.sl, plan.tp1, plan.tp2, plan.tp3);
                    }
                    
                  // 5. Analytics Layer: Log trade event to journal
                  TradeJournal::LogEvent("open", ticket, _Symbol, plan.type, lots, plan.entry_price, plan.sl, plan.tp1, signal.reason);
                 }
               else
                 {
                  Print("[debug] Order execution failed. Check terminal trade settings (Allow Automated Trading, etc.).");
                 }
              }
            else
              {
               Print("[debug] Signal already executed today: ", sig_id);
              }
           }
         else
           {
            Print("[debug] Trade rejected by Risk Manager checks.");
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
      
      // Initialize dynamic configuration state
      InitState();
      
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
       static bool first_tick = true;
       if(first_tick && (MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)))
         {
          Print("[debug] OnTick handler executing! First tick time: ", TimeToString(TimeCurrent()));
          first_tick = false;
         }

       if(active_position_manager != NULL)
         {
          active_position_manager.ManagePositions();
         }
         
       // Run timeframe scanning pipeline (crucial for Strategy Tester where OnTimer does not fire)
       datetime now = TimeCurrent();
       if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION))
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
         
      // Run timeframe scanning pipeline
      if(now - last_signal_poll >= signal_interval)
        {
         RunScannerPipeline();
         last_signal_poll = now;
        }
     }
      
   //+------------------------------------------------------------------+
   //| Handle EA Shutdown and cleanup                                   |
   //+------------------------------------------------------------------+
   void Shutdown(const int reason)
     {
      EventKillTimer();
      ObjectsDeleteAll(0, "ea_panel_");
      
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
