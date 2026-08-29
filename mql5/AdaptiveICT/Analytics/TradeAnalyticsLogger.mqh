//+------------------------------------------------------------------+
//|                                         TradeAnalyticsLogger.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Types.mqh"
#include "../Indicators/ATR.mqh"
#include "../Indicators/ADX.mqh"

//+------------------------------------------------------------------+
//| Enum defining programmatic exit reasons                          |
//+------------------------------------------------------------------+
enum ENUM_REQUESTED_EXIT_REASON
  {
   REQ_EXIT_TP,
   REQ_EXIT_SL,
   REQ_EXIT_MANUAL,
   REQ_EXIT_SIGNAL_REVERSAL,
   REQ_EXIT_MOMENTUM_DECAY,
   REQ_EXIT_STRUCTURE_BREAK,
   REQ_EXIT_TRAILING_STOP,
   REQ_EXIT_PARTIAL,
   REQ_EXIT_TIME_EXPIRY,
   REQ_EXIT_EMERGENCY,
   REQ_EXIT_UNKNOWN
  };

//+------------------------------------------------------------------+
//| Struct to track running metrics of an active position            |
//+------------------------------------------------------------------+
struct ActiveTradeTracking
  {
   string            analytics_trade_id;
   ulong             position_ticket;
   ulong             order_ticket;
   ulong             deal_ticket;
   ulong             magic_number;
   string            symbol;
   string            strategy;
   string            setup_id;
   string            timeframe;
   datetime          entry_time;
   string            direction;
   double            entry_price;
   double            initial_sl;
   double            initial_tp;
   double            risk_points;
   double            initial_risk_money;
   
   // Excursion limits and running metrics
   double            mae_points;
   double            mae_r;
   double            mfe_points;
   double            peak_profit_r;
   double            peak_price;      // BUY: Highest Bid; SELL: Lowest Ask
   double            valley_price;    // BUY: Lowest Bid; SELL: Highest Ask
   
   // Checkpoint states
   bool              reached_0_5R;
   bool              reached_1R;
   bool              reached_1_5R;
   bool              reached_2R;
   bool              reached_3R;
   bool              reached_4R;
   bool              reached_5R;
   
   // Checkpoint timings (seconds since entry_time)
   int               time_to_0_5R;
   int               time_to_1R;
   int               time_to_1_5R;
   int               time_to_2R;
   int               time_to_3R;
   int               time_to_4R;
   int               time_to_5R;
   int               time_to_peak_mfe;
   datetime          peak_mfe_time;
   
   // Entry Snapshot
   double            spread_at_entry;
   int               entry_score;
   string            htf_trend;
   double            momentum;
   double            atr;
   double            adx;
   bool              liquidity_sweep;
   bool              mss;
   bool              fvg;
   bool              order_block;
   string            session;
   string            market_regime;
   string            volatility;
   
   // Recovery tracking
   bool              recovered_after_restart;
   string            data_quality;
  };

//+------------------------------------------------------------------+
//| Static logger class writing entries to v4 CSV file               |
//+------------------------------------------------------------------+
class TradeAnalyticsLogger
  {
private:
   static ActiveTradeTracking active_tracks[100];
   static int                 active_tracks_count;
   static string              filename;

   // Helper to check if a ticket is already registered in active tracking
   static bool IsTicketRegistered(ulong ticket)
     {
      for(int i = 0; i < active_tracks_count; i++)
        {
         if(active_tracks[i].position_ticket == ticket) return true;
        }
      return false;
     }

public:
   //+------------------------------------------------------------------+
   //| Initialize file paths and recover positions after restart        |
   //+------------------------------------------------------------------+
   static void InitLogger(ulong magic)
     {
      filename = "AdaptiveICT_TradeAnalytics_v4.csv";
      active_tracks_count = 0;
      ZeroMemory(active_tracks);
      
      // Recovery phase: scan open positions matching this magic number
      for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
         if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == magic)
           {
            ulong ticket = PositionGetInteger(POSITION_TICKET);
            if(!IsTicketRegistered(ticket))
              {
               RecoverTrade(ticket, magic);
              }
           }
        }
     }

   //+------------------------------------------------------------------+
   //| Recover open trade attributes on restart                         |
   //+------------------------------------------------------------------+
   static void RecoverTrade(ulong ticket, ulong magic)
     {
      if(active_tracks_count >= 100) return;
      
      if(PositionSelectByTicket(ticket))
        {
         ActiveTradeTracking t;
         ZeroMemory(t);
         
         t.position_ticket = ticket;
         t.magic_number = magic;
         t.symbol = PositionGetString(POSITION_SYMBOL);
         t.entry_time = (datetime)PositionGetInteger(POSITION_TIME);
         t.direction = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "BUY" : "SELL";
         t.entry_price = PositionGetDouble(POSITION_PRICE_OPEN);
         t.initial_sl = PositionGetDouble(POSITION_SL);
         t.initial_tp = PositionGetDouble(POSITION_TP);
         t.timeframe = IntegerToString(Period());
         
         // Recover deals associated with this position ID to get tickets
         HistorySelect(t.entry_time - 10, TimeCurrent() + 5);
         for(int i = 0; i < HistoryDealsTotal(); i++)
           {
            ulong deal = HistoryDealGetTicket(i);
            if(HistoryDealGetInteger(deal, DEAL_POSITION_ID) == ticket)
              {
               long entry_type = HistoryDealGetInteger(deal, DEAL_ENTRY);
               if(entry_type == DEAL_ENTRY_IN)
                 {
                  t.deal_ticket = deal;
                  t.order_ticket = HistoryDealGetInteger(deal, DEAL_ORDER);
                  break;
                 }
              }
           }
         
         t.risk_points = MathAbs(t.entry_price - t.initial_sl);
         
         // Estimate monetary risk based on symbol ticks
         double volume = PositionGetDouble(POSITION_VOLUME);
         double tick_val = SymbolInfoDouble(t.symbol, SYMBOL_TRADE_TICK_VALUE);
         double tick_sz = SymbolInfoDouble(t.symbol, SYMBOL_TRADE_TICK_SIZE);
         if(tick_sz > 0)
           {
            t.initial_risk_money = (t.risk_points / tick_sz) * tick_val * volume;
           }
         
         // Resume MFE/MAE tracking from the current recovery point Bid/Ask
         double bid = SymbolInfoDouble(t.symbol, SYMBOL_BID);
         double ask = SymbolInfoDouble(t.symbol, SYMBOL_ASK);
         t.peak_price = (t.direction == "BUY") ? bid : ask;
         t.valley_price = (t.direction == "BUY") ? bid : ask;
         
         // Snapshot metadata tags
         t.analytics_trade_id = t.symbol + "_" + IntegerToString(t.position_ticket) + "_" + TimeToString(t.entry_time, TIME_DATE|TIME_MINUTES|TIME_SECONDS);
         t.recovered_after_restart = true;
         t.data_quality = "RECOVERED";
         t.strategy = "RECOVERED";
         t.setup_id = "RECOVERED_RESTART";
         t.peak_mfe_time = TimeCurrent();
         
         active_tracks[active_tracks_count] = t;
         active_tracks_count++;
         
         Print("[Logger] Recovered position ticket: ", ticket, " | Setup: ", t.setup_id);
        }
     }

   //+------------------------------------------------------------------+
   //| Register a newly executed trade signal                           |
   //+------------------------------------------------------------------+
   static void RegisterTrade(ulong ticket, const TradeSignal &sig, const DecisionResult &dec, double risk_money, string setup_id)
     {
      if(active_tracks_count >= 100)
        {
         Print("[Logger] Active tracking array overflow. Cannot log ticket: ", ticket);
         return;
        }
        
      ActiveTradeTracking t;
      ZeroMemory(t);
      
      t.position_ticket = ticket;
      t.magic_number = PositionGetInteger(POSITION_MAGIC);
      t.symbol = sig.symbol;
      t.strategy = sig.strategy_id;
      t.setup_id = setup_id;
      t.timeframe = sig.tf_str;
      t.entry_time = TimeCurrent();
      t.direction = sig.type;
      t.entry_price = sig.entry_price;
      t.initial_sl = sig.invalidation_price;
      t.initial_tp = 0.0; // TP is dynamically evaluated or set later
      
      // Select position to get true TP if broker accepted it
      if(PositionSelectByTicket(ticket))
        {
         t.initial_tp = PositionGetDouble(POSITION_TP);
         t.deal_ticket = ticket; // Default fallback
         
         // Select history to find exact entry order and deal tickets
         HistorySelect(TimeCurrent() - 5, TimeCurrent() + 5);
         for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
           {
            ulong deal = HistoryDealGetTicket(i);
            if(HistoryDealGetInteger(deal, DEAL_POSITION_ID) == ticket)
              {
               t.deal_ticket = deal;
               t.order_ticket = HistoryDealGetInteger(deal, DEAL_ORDER);
               break;
              }
           }
        }
        
      t.risk_points = MathAbs(t.entry_price - t.initial_sl);
      t.initial_risk_money = risk_money;
      
      double bid = SymbolInfoDouble(t.symbol, SYMBOL_BID);
      double ask = SymbolInfoDouble(t.symbol, SYMBOL_ASK);
      t.peak_price = (t.direction == "BUY") ? bid : ask;
      t.valley_price = (t.direction == "BUY") ? bid : ask;
      
      // Indicators snapshot
      t.spread_at_entry = SymbolInfoInteger(t.symbol, SYMBOL_SPREAD);
      t.entry_score = dec.score;
      t.volatility = dec.volatility;
      t.market_regime = dec.regime;
      
      double plus_di = 0.0, minus_di = 0.0;
      t.adx = GetADX(sig.signal_tf, 14, plus_di, minus_di);
      t.atr = GetATR(sig.signal_tf, 14);
      t.momentum = plus_di - minus_di; // Directional momentum bias
      
      t.htf_trend = (dec.reason_count > 0) ? dec.reasons[0] : "UNKNOWN";
      t.liquidity_sweep = (StringFind(sig.reason, "sweep") >= 0 || StringFind(sig.reason, "Sweep") >= 0);
      t.mss = (StringFind(sig.reason, "MSS") >= 0 || StringFind(sig.reason, "mss") >= 0);
      t.fvg = (StringFind(sig.reason, "FVG") >= 0 || StringFind(sig.reason, "fvg") >= 0);
      t.order_block = (StringFind(sig.reason, "OB") >= 0 || StringFind(sig.reason, "ob") >= 0);
      
      // Setup session code
      datetime current_time = TimeCurrent();
      MqlDateTime dt;
      TimeToStruct(current_time, dt);
      int hour = dt.hour;
      t.session = (hour >= 1 && hour < 8) ? "Asian" : (hour >= 8 && hour < 14) ? "London" : "NewYork";
      
      t.recovered_after_restart = false;
      t.data_quality = "COMPLETE";
      
      t.analytics_trade_id = t.symbol + "_" + IntegerToString(t.position_ticket) + "_" + TimeToString(t.entry_time, TIME_DATE|TIME_MINUTES|TIME_SECONDS);
      t.peak_mfe_time = t.entry_time;
      
      active_tracks[active_tracks_count] = t;
      active_tracks_count++;
      
      Print("[Logger] Registered trade ticket: ", ticket, " | Strategy: ", t.strategy, " | Setup: ", t.setup_id);
     }

   //+------------------------------------------------------------------+
   //| Tick evaluation loop to update running metrics                   |
   //+------------------------------------------------------------------+
   static void UpdateRunningMetrics()
     {
      for(int i = 0; i < active_tracks_count; i++)
        {
         ulong ticket = active_tracks[i].position_ticket;
         if(PositionSelectByTicket(ticket))
           {
            string symbol = active_tracks[i].symbol;
            double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
            double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
            bool is_buy = (active_tracks[i].direction == "BUY");
            
            // 1. MAE / MFE Pricing Excursion Calculations
            if(is_buy)
              {
               double raw_mfe = bid - active_tracks[i].entry_price;
               double raw_mae = active_tracks[i].entry_price - bid;
               
               if(raw_mfe > active_tracks[i].mfe_points)
                 {
                  active_tracks[i].mfe_points = raw_mfe;
                  active_tracks[i].peak_price = bid;
                  active_tracks[i].peak_mfe_time = TimeCurrent();
                 }
               if(raw_mae > active_tracks[i].mae_points)
                 {
                  active_tracks[i].mae_points = raw_mae;
                  active_tracks[i].valley_price = bid;
                 }
              }
            else // SELL
              {
               double raw_mfe = active_tracks[i].entry_price - ask;
               double raw_mae = ask - active_tracks[i].entry_price;
               
               if(raw_mfe > active_tracks[i].mfe_points)
                 {
                  active_tracks[i].mfe_points = raw_mfe;
                  active_tracks[i].peak_price = ask;
                  active_tracks[i].peak_mfe_time = TimeCurrent();
                 }
               if(raw_mae > active_tracks[i].mae_points)
                 {
                  active_tracks[i].mae_points = raw_mae;
                  active_tracks[i].valley_price = ask;
                 }
              }
              
            // 2. R Checkpoint Trigger Evaluations (Static Denominator)
            if(active_tracks[i].risk_points > 0)
              {
               double current_mfe_r = active_tracks[i].mfe_points / active_tracks[i].risk_points;
               active_tracks[i].peak_profit_r = current_mfe_r;
               
               datetime t_entry = active_tracks[i].entry_time;
               datetime t_curr = TimeCurrent();
               
               if(current_mfe_r >= 0.5 && !active_tracks[i].reached_0_5R)
                 {
                  active_tracks[i].reached_0_5R = true;
                  active_tracks[i].time_to_0_5R = (int)(t_curr - t_entry);
                 }
               if(current_mfe_r >= 1.0 && !active_tracks[i].reached_1R)
                 {
                  active_tracks[i].reached_1R = true;
                  active_tracks[i].time_to_1R = (int)(t_curr - t_entry);
                 }
               if(current_mfe_r >= 1.5 && !active_tracks[i].reached_1_5R)
                 {
                  active_tracks[i].reached_1_5R = true;
                  active_tracks[i].time_to_1_5R = (int)(t_curr - t_entry);
                 }
               if(current_mfe_r >= 2.0 && !active_tracks[i].reached_2R)
                 {
                  active_tracks[i].reached_2R = true;
                  active_tracks[i].time_to_2R = (int)(t_curr - t_entry);
                 }
               if(current_mfe_r >= 3.0 && !active_tracks[i].reached_3R)
                 {
                  active_tracks[i].reached_3R = true;
                  active_tracks[i].time_to_3R = (int)(t_curr - t_entry);
                 }
               if(current_mfe_r >= 4.0 && !active_tracks[i].reached_4R)
                 {
                  active_tracks[i].reached_4R = true;
                  active_tracks[i].time_to_4R = (int)(t_curr - t_entry);
                 }
               if(current_mfe_r >= 5.0 && !active_tracks[i].reached_5R)
                 {
                  active_tracks[i].reached_5R = true;
                  active_tracks[i].time_to_5R = (int)(t_curr - t_entry);
                 }
              }
           }
        }
     }

   //+------------------------------------------------------------------+
   //| Query closure deals and write records to CSV                     |
   //+------------------------------------------------------------------+
   static void FinalizeClosedTrades()
     {
      int remaining_count = 0;
      ActiveTradeTracking remaining_tracks[100];
      
      for(int i = 0; i < active_tracks_count; i++)
        {
         ulong ticket = active_tracks[i].position_ticket;
         
         // Check if position is no longer open
         if(!PositionSelectByTicket(ticket))
           {
            double exit_price = 0.0;
            datetime exit_time = 0;
            double profit = 0.0;
            string actual_exit = "UNKNOWN";
            
            // Loop history deals to extract PnL details and exit executions
            HistorySelect(active_tracks[i].entry_time, TimeCurrent() + 60);
            int deals_total = HistoryDealsTotal();
            bool found_deal = false;
            
            for(int d = deals_total - 1; d >= 0; d--)
              {
               ulong deal = HistoryDealGetTicket(d);
               if(HistoryDealGetInteger(deal, DEAL_POSITION_ID) == ticket)
                 {
                  long entry_type = HistoryDealGetInteger(deal, DEAL_ENTRY);
                  
                  // Aggregate overall PnL (in case of partial closes)
                  profit += HistoryDealGetDouble(deal, DEAL_PROFIT);
                  profit += HistoryDealGetDouble(deal, DEAL_COMMISSION);
                  profit += HistoryDealGetDouble(deal, DEAL_SWAP);
                  
                  if(entry_type == DEAL_ENTRY_OUT || entry_type == DEAL_ENTRY_OUT_BY)
                    {
                     exit_price = HistoryDealGetDouble(deal, DEAL_PRICE);
                     exit_time = (datetime)HistoryDealGetInteger(deal, DEAL_TIME);
                     string comment = HistoryDealGetString(deal, DEAL_COMMENT);
                     
                     if(StringFind(comment, "sl") >= 0 || StringFind(comment, "SL") >= 0) actual_exit = "SL";
                     else if(StringFind(comment, "tp") >= 0 || StringFind(comment, "TP") >= 0) actual_exit = "TP";
                     else if(StringFind(comment, "partial") >= 0 || StringFind(comment, "Partial") >= 0) actual_exit = "PARTIAL";
                     else if(comment != "") actual_exit = comment;
                     else actual_exit = "MANUAL";
                     
                     found_deal = true;
                    }
                 }
              }
              
            if(found_deal && exit_time > 0)
              {
               // Final calculations
               if(active_tracks[i].initial_risk_money > 0)
                 {
                  active_tracks[i].time_to_peak_mfe = (int)(active_tracks[i].peak_mfe_time - active_tracks[i].entry_time);
                  active_tracks[i].mae_r = active_tracks[i].mae_points / active_tracks[i].risk_points;
                  
                  double final_profit_r = profit / active_tracks[i].initial_risk_money;
                  double peak_giveback_r = active_tracks[i].peak_profit_r - final_profit_r;
                  double exit_efficiency = (active_tracks[i].peak_profit_r > 0) ? (final_profit_r / active_tracks[i].peak_profit_r) : 0.0;
                  
                  // Set default exit reason if not defined
                  string req_exit = "EXIT_UNKNOWN";
                  if(actual_exit == "SL") req_exit = "EXIT_SL";
                  else if(actual_exit == "TP") req_exit = "EXIT_TP";
                  
                  int bars_held = iBarShift(active_tracks[i].symbol, PERIOD_CURRENT, active_tracks[i].entry_time) - iBarShift(active_tracks[i].symbol, PERIOD_CURRENT, exit_time);
                  int secs_held = (int)(exit_time - active_tracks[i].entry_time);
                  
                  WriteCSV(active_tracks[i], exit_time, exit_price, profit, final_profit_r, peak_giveback_r, exit_efficiency, req_exit, actual_exit, bars_held, secs_held);
                 }
              }
            else
              {
               Print("[Logger] Lost trace of ticket: ", ticket, " - exit data not fully available in deal history.");
              }
           }
         else
           {
            // Keep active positions
            if(remaining_count < 100)
              {
               remaining_tracks[remaining_count] = active_tracks[i];
               remaining_count++;
              }
           }
        }
        
      active_tracks_count = remaining_count;
      for(int i = 0; i < active_tracks_count; i++)
        {
         active_tracks[i] = remaining_tracks[i];
        }
     }

   //+------------------------------------------------------------------+
   //| Write a complete lifecycle record row to the CSV file            |
   //+------------------------------------------------------------------+
   static void WriteCSV(const ActiveTradeTracking &t, datetime exit_time, double exit_price, double profit, double final_r, double giveback_r, double efficiency, string req_exit, string actual_exit, int bars, int secs)
     {
      int file_handle = FileOpen(filename, FILE_WRITE|FILE_READ|FILE_CSV|FILE_ANSI|FILE_COMMON, ',');
      if(file_handle == INVALID_HANDLE)
        {
         Print("Failed to open TradeAnalytics file: ", filename);
         return;
        }
        
      // Write headers if file is empty
      if(FileSize(file_handle) == 0)
        {
         FileWrite(file_handle,
            "AnalyticsTradeID", "PositionTicket", "OrderTicket", "DealTicket", "MagicNumber",
            "Symbol", "Strategy", "SetupID", "Timeframe", "EntryTime", "ExitTime", "Direction",
            "EntryPrice", "InitialSL", "InitialTP", "RiskPoints", "InitialRiskMoney", "ExitPrice",
            "ProfitMoney", "FinalProfitR", "PeakProfitR", "PeakGivebackR", "ExitEfficiencyR",
            "RequestedExitReason", "ActualExitReason", "MAE_Points", "MAE_R", "MFE_Points",
            "Reached_0_5R", "Reached_1R", "Reached_1_5R", "Reached_2R", "Reached_3R", "Reached_4R", "Reached_5R",
            "TimeTo_0_5R", "TimeTo_1R", "TimeTo_1_5R", "TimeTo_2R", "TimeTo_3R", "TimeTo_4R", "TimeTo_5R",
            "TimeToPeakMFE", "BarsHeld", "SecondsHeld", "SpreadAtEntry", "EntryScore", "HTFTrend",
            "Momentum", "ATR", "ADX", "LiquiditySweep", "MSS", "FVG", "OrderBlock", "Session", "MarketRegime",
            "RecoveredAfterRestart", "DataQuality"
         );
        }
        
      FileSeek(file_handle, 0, SEEK_END);
      
      FileWrite(file_handle,
         t.analytics_trade_id,
         IntegerToString(t.position_ticket),
         IntegerToString(t.order_ticket),
         IntegerToString(t.deal_ticket),
         IntegerToString(t.magic_number),
         t.symbol,
         t.strategy,
         t.setup_id,
         t.timeframe,
         TimeToString(t.entry_time, TIME_DATE|TIME_MINUTES|TIME_SECONDS),
         TimeToString(exit_time, TIME_DATE|TIME_MINUTES|TIME_SECONDS),
         t.direction,
         DoubleToString(t.entry_price, _Digits),
         DoubleToString(t.initial_sl, _Digits),
         DoubleToString(t.initial_tp, _Digits),
         DoubleToString(t.risk_points, _Digits),
         DoubleToString(t.initial_risk_money, 2),
         DoubleToString(exit_price, _Digits),
         DoubleToString(profit, 2),
         DoubleToString(final_r, 4),
         DoubleToString(t.peak_profit_r, 4),
         DoubleToString(giveback_r, 4),
         DoubleToString(efficiency, 4),
         req_exit,
         actual_exit,
         DoubleToString(t.mae_points, _Digits),
         DoubleToString(t.mae_r, 4),
         DoubleToString(t.mfe_points, _Digits),
         t.reached_0_5R ? "1" : "0",
         t.reached_1R ? "1" : "0",
         t.reached_1_5R ? "1" : "0",
         t.reached_2R ? "1" : "0",
         t.reached_3R ? "1" : "0",
         t.reached_4R ? "1" : "0",
         t.reached_5R ? "1" : "0",
         IntegerToString(t.time_to_0_5R),
         IntegerToString(t.time_to_1R),
         IntegerToString(t.time_to_1_5R),
         IntegerToString(t.time_to_2R),
         IntegerToString(t.time_to_3R),
         IntegerToString(t.time_to_4R),
         IntegerToString(t.time_to_5R),
         IntegerToString(t.time_to_peak_mfe),
         IntegerToString(bars),
         IntegerToString(secs),
         DoubleToString(t.spread_at_entry, 0),
         IntegerToString(t.entry_score),
         t.htf_trend,
         DoubleToString(t.momentum, 4),
         DoubleToString(t.atr, _Digits),
         DoubleToString(t.adx, 4),
         t.liquidity_sweep ? "1" : "0",
         t.mss ? "1" : "0",
         t.fvg ? "1" : "0",
         t.order_block ? "1" : "0",
         t.session,
         t.market_regime,
         t.recovered_after_restart ? "1" : "0",
         t.data_quality
      );
      
      FileClose(file_handle);
      Print("[Logger] Trade analytics lifecycle written successfully to CSV: ", filename);
     }
  };

// Initialize static members
ActiveTradeTracking TradeAnalyticsLogger::active_tracks[100];
int TradeAnalyticsLogger::active_tracks_count = 0;
string TradeAnalyticsLogger::filename = "";
