//+------------------------------------------------------------------+
//|                                                   MarketData.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

//+------------------------------------------------------------------+
//| Closed-bar scan mode: when true, GetRates returns only COMPLETED  |
//| candles (rates[0] = last closed bar). Signals are evaluated once  |
//| per confirmed candle, eliminating intrabar repaint/re-evaluation. |
//| The tick-driven Momentum Scalper keeps live-bar data via its own  |
//| direct CopyRates calls and is unaffected by this flag.            |
//+------------------------------------------------------------------+
bool g_scan_closed_bars = false;

//+------------------------------------------------------------------+
//| Copy candle rates helper in time-series (reverse index) order     |
//+------------------------------------------------------------------+
int GetRates(ENUM_TIMEFRAMES tf, int count, MqlRates &rates[])
  {
   ArraySetAsSeries(rates, true);
   int start_shift = g_scan_closed_bars ? 1 : 0;
   int copied = CopyRates(_Symbol, tf, start_shift, count, rates);
   return copied;
  }
