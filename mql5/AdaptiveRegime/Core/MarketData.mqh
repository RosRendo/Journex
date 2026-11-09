//+------------------------------------------------------------------+
//|                                                    MarketData.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "Types.mqh"
#include "Logger.mqh"

//+------------------------------------------------------------------+
//| Market data access with the reliability lessons baked in:        |
//|  - ALL structural evaluation uses CLOSED bars (shift 1)          |
//|  - Indicator handles are cached and reused (never leaked)        |
//|  - Copy failures are reported, never silently ignored            |
//+------------------------------------------------------------------+
#define MD_CACHE_MAX 24

struct SIndCache
  {
   ENUM_TIMEFRAMES   tf;
   int               type;      // 0=ATR 1=EMA 2=ADX
   int               param;     // period
   int               handle;
  };

SIndCache _md_cache[MD_CACHE_MAX];
int       _md_cache_count = 0;

void MdReset()
  {
   _md_cache_count = 0;
  }

void MdReleaseAll()
  {
   for(int i = 0; i < _md_cache_count; i++)
     {
      if(_md_cache[i].handle != INVALID_HANDLE)
         IndicatorRelease(_md_cache[i].handle);
      _md_cache[i].handle = INVALID_HANDLE;
     }
   _md_cache_count = 0;
  }

int MdGetHandle(const ENUM_TIMEFRAMES tf, const int type, const int param)
  {
   for(int i = 0; i < _md_cache_count; i++)
      if(_md_cache[i].tf == tf && _md_cache[i].type == type && _md_cache[i].param == param)
         return _md_cache[i].handle;
   
   if(_md_cache_count >= MD_CACHE_MAX)
     {
      LogError("MarketData: indicator cache full");
      return INVALID_HANDLE;
     }
   
   int handle = INVALID_HANDLE;
   switch(type)
     {
      case 0:  handle = iATR(_Symbol, tf, param);   break;
      case 1:  handle = iMA(_Symbol, tf, param, 0, MODE_EMA, PRICE_CLOSE); break;
      case 2:  handle = iADX(_Symbol, tf, param);  break;
      case 3:  handle = iATR(_Symbol, tf, param);  break;
      default: break;
     }
   if(handle == INVALID_HANDLE)
     {
      LogError(StringFormat("MarketData: handle creation failed tf=%d type=%d param=%d err=%d",
                            (int)tf, type, param, GetLastError()));
      return INVALID_HANDLE;
     }
   
   _md_cache[_md_cache_count].tf = tf;
   _md_cache[_md_cache_count].type = type;
   _md_cache[_md_cache_count].param = param;
   _md_cache[_md_cache_count].handle = handle;
   _md_cache_count++;
   return handle;
  }

//+------------------------------------------------------------------+
//| One value of an indicator on a CLOSED bar (shift>=1)             |
//+------------------------------------------------------------------+
bool MdIndValue(const ENUM_TIMEFRAMES tf, const int type, const int param,
                const int shift, double &value)
  {
   int handle = MdGetHandle(tf, type, param);
   if(handle == INVALID_HANDLE) return false;
   
   double buf[1];
   if(CopyBuffer(handle, 0, shift, 1, buf) != 1)
      return false;
   value = buf[0];
   return true;
  }

//+------------------------------------------------------------------+
//| One value from an indicator buffer on a CLOSED bar (shift>=1)    |
//| e.g. iADX: buffer 0=ADX main, 1=DI+, 2=DI-                       |
//+------------------------------------------------------------------+
bool MdIndBuffer(const ENUM_TIMEFRAMES tf, const int type, const int param,
                 const int buffer, const int shift, double &value)
  {
   int handle = MdGetHandle(tf, type, param);
   if(handle == INVALID_HANDLE) return false;
   
   double buf[1];
   if(CopyBuffer(handle, buffer, shift, 1, buf) != 1)
      return false;
   value = buf[0];
   return true;
  }

//+------------------------------------------------------------------+
//| Multi-value read, closed-bar series (shift = newest closed bar)  |
//+------------------------------------------------------------------+
int MdIndSeries(const ENUM_TIMEFRAMES tf, const int type, const int param,
                const int count, double &out[])
  {
   int handle = MdGetHandle(tf, type, param);
   if(handle == INVALID_HANDLE) return -1;
   ArraySetAsSeries(out, true);
   int copied = CopyBuffer(handle, 0, 1, count, out);
   if(copied != count)
      LogDebug(StringFormat("MarketData: series partial copied=%d/%d", copied, count));
   return copied;
  }

//+------------------------------------------------------------------+
//| ATR on closed bar; baseline = average ATR over baseline bars     |
//+------------------------------------------------------------------+
bool MdAtrRatio(const ENUM_TIMEFRAMES tf, const int atr_period,
                const int baseline_bars, double &ratio, double &atr_now)
  {
   double arr[];
   int copied = MdIndSeries(tf, 0, atr_period, baseline_bars + 1, arr);
   if(copied < 10) return false;
   
   atr_now = arr[0]; // newest closed bar
   double sum = 0.0;
   int n = MathMin(copied - 1, baseline_bars);
   for(int i = 1; i <= n && i < copied; i++)
      sum += arr[i];
   if(n <= 0 || sum <= 0.0) return false;
   
   double baseline = sum / n;
   if(baseline <= 0.0) return false;
   ratio = atr_now / baseline;
   return true;
  }

//+------------------------------------------------------------------+
//| Closed-bar rates, newest-first series                            |
//| index 0 = last CLOSED bar (shift 1 of the chart)                 |
//+------------------------------------------------------------------+
int MdGetClosedRates(const ENUM_TIMEFRAMES tf, const int count, MqlRates &rates[])
  {
   ArraySetAsSeries(rates, true);
   int copied = CopyRates(_Symbol, tf, 1, count, rates);
   if(copied <= 0)
      LogError(StringFormat("MarketData: CopyRates failed tf=%d want=%d got=%d err=%d",
                            (int)tf, count, copied, GetLastError()));
   return copied;
  }

//+------------------------------------------------------------------+
//| New closed-bar detection per timeframe (one call per tf)         |
//+------------------------------------------------------------------+
bool MdIsNewClosedBar(const ENUM_TIMEFRAMES tf, datetime &state)
  {
   datetime bar_time = iTime(_Symbol, tf, 0);
   if(bar_time <= 0) return false;
   if(bar_time == state) return false;
   state = bar_time;
   return true;
  }

//+------------------------------------------------------------------+
//| Spread in points                                                 |
//+------------------------------------------------------------------+
double MdSpreadPoints()
  {
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick)) return 999999.0;
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   if(point <= 0.0) return 999999.0;
   return (tick.ask - tick.bid) / point;
  }

//+------------------------------------------------------------------+
//| Live tick (returns false and zeroes on failure)                  |
//+------------------------------------------------------------------+
bool MdTick(MqlTick &tick)
  {
   if(!SymbolInfoTick(_Symbol, tick)) return false;
   return tick.bid > 0.0 && tick.ask > 0.0;
  }

//+------------------------------------------------------------------+
//| SL distance floors in PRICE units — digit/pip safe.              |
//| Min: max(minAtrMult x ATR(entry TF), spreadMult x spread)        |
//| Max: maxAtrMult x ATR(setup TF) (0 ATR = unlimited)              |
//+------------------------------------------------------------------+
double MdMinSLDist(const double atr_entry)
  {
   MqlTick t;
   double spread_price = SymbolInfoTick(_Symbol, t) ? (t.ask - t.bid)
                        : InpScalpMaxSpreadPts * SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   return MathMax(InpMinSLAtrMult * atr_entry, InpMinSLSpreadMult * spread_price);
  }

double MdMaxSLDist(const double atr_setup)
  {
   if(atr_setup <= 0.0) return 0.0; // no data: never over-constrain
   return InpMaxSLAtrMult * atr_setup;
  }

//+------------------------------------------------------------------+
//| Bars since a closed bar timestamp (inclusive of partial bar)     |
//+------------------------------------------------------------------+
int MdBarsSince(const ENUM_TIMEFRAMES tf, const datetime bar_time)
  {
   if(bar_time <= 0) return -1;
   int shift = iBarShift(_Symbol, tf, bar_time, false);
   return shift; // 0 = current forming bar
  }