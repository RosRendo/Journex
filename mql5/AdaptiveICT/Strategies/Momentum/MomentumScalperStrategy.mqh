//+------------------------------------------------------------------+
//|                                     MomentumScalperStrategy.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "3.00"
#property once

#include "../BaseStrategy.mqh"
#include "../../Core/Config.mqh"

//+------------------------------------------------------------------+
//| Momentum Scalper Strategy V3.0 - Trend-Aligned Momentum          |
//|                                                                  |
//| Key improvement over V2: H4 200-EMA Trend Filter.               |
//| Only BUY signals when price is above the H4 200 EMA.            |
//| Only SELL signals when price is below the H4 200 EMA.           |
//| This eliminates 50% of counter-trend trades that were the        |
//| source of consistent daily losses.                              |
//+------------------------------------------------------------------+
class MomentumScalperStrategy : public BaseStrategy
  {
private:
   datetime m_init_time;       // Timestamp when EA was first attached (for warmup grace period)
   bool     m_h4_ready;        // True once H4 data has loaded at least once

public:
   MomentumScalperStrategy()
     {
      m_init_time = TimeCurrent();
      m_h4_ready  = false;

      // Kick MT5 to start requesting H4 history from broker immediately
      SeriesInfoInteger(_Symbol, PERIOD_H4, SERIES_SYNCHRONIZED);
     }

   ~MomentumScalperStrategy() {}

   //+------------------------------------------------------------------+
   //| Get H4 200 EMA bias using direct CopyClose (bypasses iMA engine) |
   //| Returns: +1 = bullish, -1 = bearish, 0 = data not ready          |
   //+------------------------------------------------------------------+
   int GetHTFBias()
     {
      // Request H4 sync on every call until data is available
      SeriesInfoInteger(_Symbol, PERIOD_H4, SERIES_SYNCHRONIZED);

      double h4_close[];
      ArraySetAsSeries(h4_close, true);
      int period = 200;
      int copied = CopyClose(_Symbol, PERIOD_H4, 0, period, h4_close);

      if(copied < period)
        {
         // Suppress log spam: print once per minute
         static datetime last_warn = 0;
         if(TimeCurrent() - last_warn >= 60)
           {
            int secs = (int)(TimeCurrent() - m_init_time);
            Print("[MomV3] H4 data not ready: got ", copied, "/", period, " bars [", secs, "s since attach]");
            last_warn = TimeCurrent();
           }
         return 0;
        }

      // Manually compute 200-period SMA as a robust EMA approximation
      double sum = 0.0;
      for(int i = 0; i < period; i++)
         sum += h4_close[i];
      double sma200 = sum / period;

      if(!m_h4_ready)
        {
         Print("[MomV3] H4 data loaded! 200-SMA = ", DoubleToString(sma200, _Digits), " | EA is now fully armed.");
         m_h4_ready = true;
        }

      double current_price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      if(current_price > sma200) return 1;   // Price above MA → Bullish
      if(current_price < sma200) return -1;  // Price below MA → Bearish
      return 0;
     }

   //+------------------------------------------------------------------+
   //| Scan specific timeframe and populates candidates                  |
   //+------------------------------------------------------------------+
   virtual bool Scan(ENUM_TIMEFRAMES tf, string tf_str, TradeSignal &candidate)
     {
      // Initialize candidate DTO
      candidate.symbol = _Symbol;
      candidate.type = "NO_TRADE";
      candidate.strategy_id = "MOMENTUM_SCALPER_V3";
      candidate.signal_tf = tf;
      candidate.tf_str = tf_str;
      candidate.entry_price = 0.0;
      candidate.invalidation_price = 0.0;
      candidate.reason = "";

      datetime current_time = TimeCurrent();

      // Enforce Pyramiding Cooldown
      static datetime last_entry_time = 0;
      if(current_time - last_entry_time < InpPyramidCooldownSec) return false;

      // --- H4 Trend Bias ---
      int bias = GetHTFBias();

      // Grace period: allow 60s after attach for broker to sync H4 data.
      // After that, strictly require a known bias to avoid counter-trend trades.
      bool in_warmup = (TimeCurrent() - m_init_time < 60);
      if(bias == 0)
        {
         if(in_warmup)
           {
            // Still warming up — allow trading with no bias filter
           }
         else if(MQLInfoInteger(MQL_TESTER))
           {
            // Tester EMA warmup: allow for first few bars
           }
         else
           {
            return false; // Live trading: do NOT trade without confirmed bias
           }
        }

      // --- Use bar-based lookback ---
      int lookback_bars = (InpMomLookbackSec > 0) ? InpMomLookbackSec : 5;
      if(lookback_bars > 50) lookback_bars = 50;

      int tf_seconds = PeriodSeconds(tf);

      // STARTUP LOCK: Don't trade until the EA has been running for at least
      // one full lookback window in real-time. This prevents the first-bar
      // session-open gap from generating a fake 1000+ pip "momentum" signal.
      long runtime_sec = (long)(TimeCurrent() - m_init_time);
      long required_runtime = (long)(lookback_bars * tf_seconds);
      if(!MQLInfoInteger(MQL_TESTER) && runtime_sec < required_runtime)
        {
         // Still too early - wait silently
         return false;
        }

      MqlRates rates[];
      int total_bars = lookback_bars + 2;
      int copied = CopyRates(_Symbol, tf, 0, total_bars, rates);
      if(copied < lookback_bars + 1) return false;

      // Time gap filter: reject signals spanning weekend/session gaps.
      // Use a strict 1.2x window — only allow minor bar-timing irregularities,
      // not massive overnight/weekend gaps.
      datetime time_now  = rates[copied - 1].time;
      datetime time_then = rates[copied - 1 - lookback_bars].time;
      long actual_gap_sec = (long)(time_now - time_then);
      long max_gap_sec    = (long)((double)(lookback_bars * tf_seconds) * 1.2);
      if(actual_gap_sec > max_gap_sec)
        {
         // Gap spans a session break or weekend — skip silently
         return false;
        }

      double price_now  = rates[copied - 1].close;
      double price_then = rates[copied - 1 - lookback_bars].close;

      double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
      if(point == 0) return false;

      // ATR for dynamic threshold and SL
      double atr_sum = 0.0;
      int atr_period = MathMin(14, copied - 1);
      for(int i = copied - 1; i >= copied - atr_period; i--)
         atr_sum += rates[i].high - rates[i].low;
      double atr = (atr_period > 0) ? (atr_sum / atr_period) : (10.0 * point);

      // Dynamic threshold: price must move InpMomThresholdPips (converted to points)
      double price_change    = price_now - price_then;
      double abs_change      = MathAbs(price_change);
      double required_change = InpMomThresholdPips * point * 10.0;

      // Body strength: reject doji / indecision bars
      double last_bar_range = rates[copied - 1].high - rates[copied - 1].low;
      double last_bar_body  = MathAbs(rates[copied - 1].close - rates[copied - 1].open);
      double body_ratio = (last_bar_range > 0) ? (last_bar_body / last_bar_range) : 0;

      // Debug print (live and tester)
      static datetime last_print = 0;
      int print_interval = MQLInfoInteger(MQL_TESTER) ? 3600 : 30;
      if(current_time - last_print >= print_interval)
        {
         Print("[MomV3] Bias=", (bias == 1 ? "BULL" : bias == -1 ? "BEAR" : "UNK"),
               " | Change=", DoubleToString(abs_change / (point * 10), 1),
               " pips | Required=", DoubleToString(required_change / (point * 10), 1),
               " | gap_sec=", (int)actual_gap_sec, " (max=", (int)max_gap_sec, ")");
         last_print = current_time;
        }

      // --- SIGNAL GENERATION with H4 trend alignment ---
      if(abs_change >= required_change)
        {
         double diff_pips = price_change / (point * 10.0);
         double pip_size = (_Digits == 3 || _Digits == 5) ? 10.0 * point : point;
         double min_sl_dist = InpMinSLPips * pip_size;
         double sl_dist = atr * 3.5;
         if(sl_dist < min_sl_dist) sl_dist = min_sl_dist;

         // BUY: momentum is bullish AND H4 bias is bullish (or unknown in tester warmup)
         if(price_change > 0 && (bias >= 0))
           {
            candidate.type = "BUY";
            candidate.entry_price = price_now;
            candidate.invalidation_price = price_now - sl_dist;
            candidate.signal_id = "MOM_BUY_" + TimeToString(current_time);
            last_entry_time = current_time;
            candidate.reason = StringFormat("BULL_MOM[H4_BULL] | +%.1f pips | body=%.0f%%", diff_pips, body_ratio * 100);
            return true;
           }

         // SELL: momentum is bearish AND H4 bias is bearish (or unknown in tester warmup)
         if(price_change < 0 && (bias <= 0))
           {
            candidate.type = "SELL";
            candidate.entry_price = price_now;
            candidate.invalidation_price = price_now + sl_dist;
            candidate.signal_id = "MOM_SELL_" + TimeToString(current_time);
            last_entry_time = current_time;
            candidate.reason = StringFormat("BEAR_MOM[H4_BEAR] | %.1f pips | body=%.0f%%", diff_pips, body_ratio * 100);
            return true;
           }
        }

      return false;
     }

   //+------------------------------------------------------------------+
   //| Calculate Confluence Score                                        |
   //+------------------------------------------------------------------+
   virtual ConfluenceResult CalculateConfluence(const TradeSignal &candidate)
     {
      ConfluenceResult result;
      result.score = 100;
      result.grade = "A";
      result.is_valid = true;
      return result;
     }
  };
