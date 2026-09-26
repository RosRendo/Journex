//+------------------------------------------------------------------+
//|                                           TradeHealthEngine.mqh  |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "Types.mqh"
#include "Config.mqh"
#include "StateManager.mqh"
#include "DecisionEngine/StructureAnalyzer.mqh"
#include "DecisionEngine/LiquidityAnalyzer.mqh"
#include "DecisionEngine/MomentumAnalyzer.mqh"
#include "DecisionEngine/VolatilityAnalyzer.mqh"
#include "../Market/Session.mqh"
#include "../Indicators/ATR.mqh"
#include "../Analytics/TradeAnalyticsLogger.mqh"

//+------------------------------------------------------------------+
//| T040: Trade Health Engine -- post-entry thesis monitoring        |
//| Evaluates open trade health each new bar                         |
//| Maps to: FR-025, FR-026, FR-027, FR-028                          |
//+------------------------------------------------------------------+
class TradeHealthEngine
  {
public:
   //+------------------------------------------------------------------+
   //| Evaluate: Main health evaluation function                        |
   //| Sub-factor weights:                                              |
   //|   1. Structure Continuation: 25 pts                              |
   //|   2. Liquidity Alignment:    15 pts                              |
   //|   3. Momentum:               15 pts                              |
   //|   4. Price Location:         10 pts                              |
   //|   5. Volatility:             10 pts                              |
   //|   6. SMT Divergence:         10 pts                              |
   //|   7. Volume / Tick Activity:  5 pts                              |
   //|   8. Session Alignment:       5 pts                              |
   //|   9. MFE Progress:            3 pts                              |
   //|  10. MAE / ATR:               2 pts                              |
   //| Total:                      100 pts                              |
   //+------------------------------------------------------------------+
   static TradeHealthState Evaluate(ulong ticket, ENUM_TIMEFRAMES entry_tf, const TradeSignal &original_signal)
     {
      TradeHealthState health;
      ZeroMemory(health);
      health.ticket = ticket;
      health.evaluated_at = TimeCurrent();

      // Retrieve position info if active
      bool is_buy = false;
      double open_price = 0.0;
      double current_sl = 0.0;
      double current_tp = 0.0;
      string pos_type = original_signal.type;

      if(PositionSelectByTicket(ticket))
        {
         is_buy = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY);
         pos_type = is_buy ? "BUY" : "SELL";
         open_price = PositionGetDouble(POSITION_PRICE_OPEN);
         current_sl = PositionGetDouble(POSITION_SL);
         current_tp = PositionGetDouble(POSITION_TP);
        }
      else if(pos_type != "")
        {
         is_buy = (pos_type == "BUY");
         open_price = original_signal.entry_price;
         current_sl = original_signal.invalidation_price;
         current_tp = 0.0;
        }
      else
        {
         health.score = 0;
         health.label = "THESIS_INVALIDATED";
         health.factor_notes = "Position not found";
         return health;
        }

      double current_price = is_buy ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);

      // 1. Structure Continuation (Max 25 pts)
      int struct_pts = 0;
      bool mss_valid = false;
      bool recent_fvg = false;
      bool recent_ob = false;
      string mss_state = "";
      StructureAnalyzer::Analyze(entry_tf, pos_type, mss_valid, recent_fvg, recent_ob, mss_state);

      if(is_buy)
        {
         if(mss_state == "BEARISH")
           {
            struct_pts = 0; // Bearish MSS during BUY trade -> thesis severely compromised
           }
         else if(mss_state == "BULLISH" || mss_valid)
           {
            struct_pts = 25; // Bullish structure actively confirmed
           }
         else // mss_state == "NONE"
           {
            struct_pts = (recent_fvg || recent_ob) ? 20 : 18;
           }
        }
      else // SELL
        {
         if(mss_state == "BULLISH")
           {
            struct_pts = 0; // Bullish MSS during SELL trade -> thesis severely compromised
           }
         else if(mss_state == "BEARISH" || mss_valid)
           {
            struct_pts = 25; // Bearish structure actively confirmed
           }
         else
           {
            struct_pts = (recent_fvg || recent_ob) ? 20 : 18;
           }
        }

      // 2. Liquidity Alignment (Max 15 pts)
      int liq_pts = 0;
      bool has_sweep = false;
      bool smt_div = false;
      LiquidityAnalyzer::Analyze(entry_tf, pos_type, has_sweep, smt_div, SanitizeStringInput(InpSMTSymbol));
      liq_pts = has_sweep ? 15 : 12;

      // 3. Momentum (Max 15 pts)
      int mom_pts = 0;
      double vel = MomentumAnalyzer::GetVelocity(entry_tf, 5);
      if(is_buy)
        {
         if(vel > 0.1)        mom_pts = 15;
         else if(vel >= -0.1) mom_pts = 8;
         else                 mom_pts = 0;
        }
      else
        {
         if(vel < -0.1)       mom_pts = 15;
         else if(vel <= 0.1)  mom_pts = 8;
         else                 mom_pts = 0;
        }

      // 4. Price Location (Max 10 pts)
      int loc_pts = 0;
      if(is_buy)
        {
         if(current_price >= open_price)
            loc_pts = 10;
         else if(current_sl > 0.0 && current_price >= (open_price + current_sl) * 0.5)
            loc_pts = 6;
         else if(current_sl > 0.0 && current_price > current_sl)
            loc_pts = 2;
         else
            loc_pts = 0;
        }
      else
        {
         if(current_price <= open_price)
            loc_pts = 10;
         else if(current_sl > 0.0 && current_price <= (open_price + current_sl) * 0.5)
            loc_pts = 6;
         else if(current_sl > 0.0 && current_price < current_sl)
            loc_pts = 2;
         else
            loc_pts = 0;
        }

      // 5. Volatility (Max 10 pts)
      int vol_pts = 0;
      double vol_mult = 1.0;
      string vol_state = VolatilityAnalyzer::Analyze(entry_tf, vol_mult);
      if(vol_state == "NORMAL" || vol_state == "HIGH") vol_pts = 10;
      else if(vol_state == "LOW")                       vol_pts = 5;
      else                                              vol_pts = 3;

      // 6. SMT Divergence (Max 10 pts)
      int smt_pts = 0;
      if(!InpUseSMT)
        {
         smt_pts = 10;
        }
      else
        {
         smt_pts = smt_div ? 10 : 7;
        }

      // 7. Volume / Tick Activity (Max 5 pts)
      int vol_act_pts = 0;
      double tick_act = MomentumAnalyzer::GetTickActivity(entry_tf, 14);
      if(tick_act >= 1.0) vol_act_pts = 5;
      else                vol_act_pts = 2;

      // 8. Session Alignment (Max 5 pts)
      int sess_pts = 0;
      string cur_sess = GetCurrentSession();
      if(StringFind(cur_sess, "London") >= 0 || StringFind(cur_sess, "New York") >= 0 || StringFind(cur_sess, "NY") >= 0)
         sess_pts = 5;
      else if(StringFind(cur_sess, "Asian") >= 0)
         sess_pts = 3;
      else
         sess_pts = 1;

      // 9. MFE Progress (Max 3 pts) & 10. MAE / ATR (Max 2 pts)
      int mfe_pts_score = 0;
      int mae_pts_score = 0;
      double running_mfe_pts = 0.0, running_mae_pts = 0.0, running_mfe_r = 0.0, running_mae_r = 0.0;
      bool has_metrics = TradeAnalyticsLogger::GetRunningMetrics(ticket, running_mfe_pts, running_mae_pts, running_mfe_r, running_mae_r);
      if(!has_metrics && open_price > 0.0)
        {
         if(is_buy)
           {
            running_mfe_pts = MathMax(0.0, current_price - open_price);
            running_mae_pts = MathMax(0.0, open_price - current_price);
           }
         else
           {
            running_mfe_pts = MathMax(0.0, open_price - current_price);
            running_mae_pts = MathMax(0.0, current_price - open_price);
           }
         double risk = MathAbs(open_price - current_sl);
         if(risk > 0.0)
           {
            running_mfe_r = running_mfe_pts / risk;
            running_mae_r = running_mae_pts / risk;
           }
        }

      if(running_mfe_r >= 1.0)      mfe_pts_score = 3;
      else if(running_mfe_r >= 0.5) mfe_pts_score = 2;
      else if(running_mfe_r > 0.0)  mfe_pts_score = 1;
      else                          mfe_pts_score = 0;

      double current_atr = GetATR(entry_tf, 14);
      if(current_atr <= 0.0) current_atr = 1.0;
      if(running_mae_pts < current_atr * 0.5)      mae_pts_score = 2;
      else if(running_mae_pts < current_atr * 1.0) mae_pts_score = 1;
      else                                         mae_pts_score = 0;

      // Total composite calculation
      health.score = struct_pts + liq_pts + mom_pts + loc_pts + vol_pts +
                     smt_pts + vol_act_pts + sess_pts + mfe_pts_score + mae_pts_score;

      if(health.score > 100) health.score = 100;
      if(health.score < 0)   health.score = 0;

      // Direct invalidation override: If structure broke with opposing MSS while price is in adverse territory, force invalidation
      if((is_buy && mss_state == "BEARISH" && current_price < open_price) ||
         (!is_buy && mss_state == "BULLISH" && current_price > open_price))
        {
         if(health.score >= InpHealthInvalidatedThreshold)
            health.score = InpHealthInvalidatedThreshold - 5;
        }

      // Assign state label according to configurable thresholds
      if(health.score >= InpHealthWeakeningThreshold)
         health.label = "HEALTHY";
      else if(health.score >= InpHealthDangerThreshold)
         health.label = "WEAKENING";
      else if(health.score >= InpHealthInvalidatedThreshold)
         health.label = "DANGER";
      else
         health.label = "THESIS_INVALIDATED";

      health.factor_notes = StringFormat("Str:%d Liq:%d Mom:%d Loc:%d Vol:%d SMT:%d MFE:%.1fR",
                                         struct_pts, liq_pts, mom_pts, loc_pts, vol_pts, smt_pts, running_mfe_r);

      return health;
     }

   //+------------------------------------------------------------------+
   //| Convenience overload when original signal is not held            |
   //+------------------------------------------------------------------+
   static TradeHealthState Evaluate(ulong ticket, ENUM_TIMEFRAMES entry_tf)
     {
      TradeSignal empty_sig;
      ZeroMemory(empty_sig);
      return Evaluate(ticket, entry_tf, empty_sig);
     }
  };
