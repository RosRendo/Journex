//+------------------------------------------------------------------+
//|                                              TakeProfitModel.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Types.mqh"
#include "../Core/Config.mqh"
#include "../Core/StateManager.mqh"
#include "../ICT/MarketStructure.mqh"
#include "../ICT/Liquidity.mqh"

//+------------------------------------------------------------------+
//| T032 [US3]: Structural Take-Profit Model                         |
//| Derives TP1, TP2, TP3 from liquidity pools & structural swings.  |
//| Maps to: FR-022, FR-024                                          |
//+------------------------------------------------------------------+
class TakeProfitModel
  {
public:
   // Identifies structural take profit targets TP1, TP2, TP3
   // TP1 = nearest untapped liquidity pool within 3R
   // TP2 = next structural swing high/low
   // TP3 = HTF liquidity pool
   // Fallback to entry +/- sl_distance * InpMinRR
   static void IdentifyTargets(ENUM_TIMEFRAMES tf, const TradeSignal &signal, double &tp1, double &tp2, double &tp3)
     {
      double entry = signal.entry_price;
      double sl = signal.invalidation_price;
      double sl_dist = MathAbs(entry - sl);
      if(sl_dist <= 0.0) sl_dist = 20.0 * SymbolInfoDouble(_Symbol, SYMBOL_POINT) * 10.0;
      bool is_buy = (signal.type == "BUY");

      // Retrieve local TF swing points (120 bars)
      MqlSwing swings_high[], swings_low[];
      GetSwings(tf, 120, swings_high, swings_low);

      // Retrieve HTF swing points (H1 or H4)
      ENUM_TIMEFRAMES htf = (tf <= PERIOD_M15) ? PERIOD_H1 : PERIOD_H4;
      MqlSwing htf_high[], htf_low[];
      GetSwings(htf, 60, htf_high, htf_low);

      tp1 = 0.0;
      tp2 = 0.0;
      tp3 = 0.0;

      double min_tp_dist  = sl_dist * 1.0;         // Minimum 1R
      double max_tp1_dist = sl_dist * 3.0;         // Within 3R for TP1
      double max_tp2_dist = sl_dist * 4.5;         // Within 4.5R for TP2
      double max_tp3_dist = sl_dist * 6.5;         // Within 6.5R for TP3

      if(is_buy)
        {
         // TP1: nearest untapped liquidity pool / swing high above entry within 3R
         double best_tp1 = 999999.0;
         for(int i = 0; i < ArraySize(swings_high); i++)
           {
            double price = swings_high[i].price;
            double dist = price - entry;
            if(dist >= min_tp_dist && dist <= max_tp1_dist)
              {
               if(price < best_tp1) best_tp1 = price;
              }
           }
         if(best_tp1 < 999990.0) tp1 = best_tp1;
         else tp1 = entry + sl_dist * InpMinRR;

         // TP2: next structural swing high beyond TP1
         double best_tp2 = 999999.0;
         for(int i = 0; i < ArraySize(swings_high); i++)
           {
            double price = swings_high[i].price;
            double dist = price - entry;
            if(price > tp1 && dist <= max_tp2_dist)
              {
               if(price < best_tp2) best_tp2 = price;
              }
           }
         if(best_tp2 < 999990.0) tp2 = best_tp2;
         else tp2 = entry + sl_dist * (InpMinRR * 1.6);

         // TP3: HTF liquidity pool from HTF swings beyond TP2
         double best_tp3 = 999999.0;
         for(int i = 0; i < ArraySize(htf_high); i++)
           {
            double price = htf_high[i].price;
            double dist = price - entry;
            if(price > tp2 && dist <= max_tp3_dist)
              {
               if(price < best_tp3) best_tp3 = price;
              }
           }
         if(best_tp3 < 999990.0) tp3 = best_tp3;
         else tp3 = entry + sl_dist * (InpMinRR * 2.2);
        }
      else // SELL
        {
         // TP1: nearest untapped liquidity pool / swing low below entry within 3R
         double best_tp1 = -999999.0;
         for(int i = 0; i < ArraySize(swings_low); i++)
           {
            double price = swings_low[i].price;
            double dist = entry - price;
            if(dist >= min_tp_dist && dist <= max_tp1_dist)
              {
               if(price > best_tp1) best_tp1 = price;
              }
           }
         if(best_tp1 > -999990.0) tp1 = best_tp1;
         else tp1 = entry - sl_dist * InpMinRR;

         // TP2: next structural swing low beyond TP1
         double best_tp2 = -999999.0;
         for(int i = 0; i < ArraySize(swings_low); i++)
           {
            double price = swings_low[i].price;
            double dist = entry - price;
            if(price < tp1 && dist <= max_tp2_dist)
              {
               if(price > best_tp2) best_tp2 = price;
              }
           }
         if(best_tp2 > -999990.0) tp2 = best_tp2;
         else tp2 = entry - sl_dist * (InpMinRR * 1.6);

         // TP3: HTF liquidity pool from HTF swings beyond TP2
         double best_tp3 = -999999.0;
         for(int i = 0; i < ArraySize(htf_low); i++)
           {
            double price = htf_low[i].price;
            double dist = entry - price;
            if(price < tp2 && dist <= max_tp3_dist)
              {
               if(price > best_tp3) best_tp3 = price;
              }
           }
         if(best_tp3 > -999990.0) tp3 = best_tp3;
         else tp3 = entry - sl_dist * (InpMinRR * 2.2);
        }

      tp1 = NormalizeDouble(tp1, _Digits);
      tp2 = NormalizeDouble(tp2, _Digits);
      tp3 = NormalizeDouble(tp3, _Digits);
     }
  };

// Legacy backward-compatibility function
TradePlan CreateTradePlan(const SignalCandidate &candidate, const ConfluenceResult &confluence)
  {
   TradePlan plan;
   plan.symbol = candidate.symbol;
   plan.type = candidate.type;
   plan.entry_price = candidate.entry_price;
   plan.sl = candidate.invalidation_price;
   plan.confidence = confluence.score;
   plan.reasoning = candidate.reason;
   plan.signal_id = "";
   
   ENUM_TIMEFRAMES tf = (candidate.signal_tf != 0) ? candidate.signal_tf : Period();
   TakeProfitModel::IdentifyTargets(tf, candidate, plan.tp1, plan.tp2, plan.tp3);
   double dist = MathAbs(plan.entry_price - plan.sl);
   plan.risk_reward = dist > 0.0 ? MathAbs(plan.tp1 - plan.entry_price) / dist : 0.0;
   
   return plan;
  }
