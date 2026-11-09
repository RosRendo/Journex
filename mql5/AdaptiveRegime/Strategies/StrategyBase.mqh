//+------------------------------------------------------------------+
//|                                                 StrategyBase.mqh |
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "..\Core\Types.mqh"
#include "..\Core\Config.mqh"
#include "..\Core\Logger.mqh"
#include "..\Core\StateStore.mqh"
#include "..\Core\MarketData.mqh"

//+------------------------------------------------------------------+
//| Shared strategy helpers: bar-time dedupe (the reliable dedupe    |
//| style proven against the legacy per-second-Id bug), per-strategy |
//| cooldown, ATR of the entry timeframe.                            |
//+------------------------------------------------------------------+
bool SBSignalFresh(const string id, const datetime bar_time)
  {
   long last = IntSSGet("sig_" + id, 0);
   return bar_time > 0 && bar_time != (datetime)last;
  }

void SBMarkSignal(const string id, const datetime bar_time)
  {
   IntSSSet("sig_" + id, (long)bar_time);
  }

bool SBCooldownOk(const string id, const int seconds)
  {
   if(seconds <= 0) return true;
   long last = IntSSGet("cool_" + id, 0);
   return (long)TimeCurrent() - last >= seconds;
  }

void SBMarkFired(const string id)
  {
   IntSSSet("cool_" + id, (long)TimeCurrent());
  }

double SBAtr(const ENUM_TIMEFRAMES tf)
  {
   double v = 0.0;
   if(!MdIndValue(tf, 0, InpRegAtrPeriod, 1, v)) return 0.0;
   return v;
  }

//+------------------------------------------------------------------+
//| Pip helpers                                                      |
//+------------------------------------------------------------------+
double SBPip()
  {
   return 10.0 * SymbolInfoDouble(_Symbol, SYMBOL_POINT);
  }

//--- digit-safe SL distance helpers (price units), see MarketData.mqh
double SBMinSLDist(const double atr) { return MdMinSLDist(atr); }
double SBMaxSLDist(const double atr) { return MdMaxSLDist(atr); }

//+------------------------------------------------------------------+
//| 5-bar pivot lows/highs over closed-bar series (newest-first).    |
//| Fills arrays with bar indices within the passed range only.      |
//+------------------------------------------------------------------+
void SBPivots(MqlRates &rates[], const int count, const int scan_bars,
              int &plows[], int &phighs[])
  {
   ArrayResize(plows, 0);
   ArrayResize(phighs, 0);
   int n = MathMin(count, MathAbs(scan_bars));
   if(n < 7) return;
   for(int i = 2; i < n - 2; i++)
     {
      bool is_l = rates[i].low  <= rates[i+1].low  && rates[i].low  <= rates[i+2].low
               && rates[i].low  <= rates[i-1].low  && rates[i].low  <= rates[i-2].low;
      bool is_h = rates[i].high >= rates[i+1].high && rates[i].high >= rates[i+2].high
               && rates[i].high >= rates[i-1].high && rates[i].high >= rates[i-2].high;
      if(is_l) { int m = ArraySize(plows);  ArrayResize(plows,  m + 1); plows[m]  = i; }
      if(is_h) { int m = ArraySize(phighs); ArrayResize(phighs, m + 1); phighs[m] = i; }
     }
  }

//+------------------------------------------------------------------+
//| Rejection wick percent of a bar                                  |
//+------------------------------------------------------------------+
double SBWickPct(const MqlRates &bar, const int dir)
  {
   double rng = bar.high - bar.low;
   if(rng <= 0.0) return 0.0;
   double wick = (dir > 0) ? (MathMin(bar.open, bar.close) - bar.low)
                           : (bar.high - MathMax(bar.open, bar.close));
   return wick / rng * 100.0;
  }