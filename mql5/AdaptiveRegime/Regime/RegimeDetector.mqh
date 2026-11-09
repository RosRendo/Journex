//+------------------------------------------------------------------+
//|                                                 RegimeDetector.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "..\Core\Types.mqh"
#include "..\Core\Config.mqh"
#include "..\Core\Logger.mqh"
#include "..\Core\MarketData.mqh"

//+------------------------------------------------------------------+
//| Multi-factor regime detector on the SETUP timeframe, evaluated    |
//| on CLOSED bars only, with hysteresis (min dwell bars).            |
//| Factors: trend alignment (EMA), trend strength (ADX/DI),          |
//| volatility state (ATR vs own baseline), market structure.         |
//+------------------------------------------------------------------+
RegimeResult _rg_current;
datetime     _rg_last_bar = 0;

string RegName(const ENUM_REGIME r)
  {
   switch(r)
     {
      case REGIME_BULL_STRONG:     return "BULL_STRONG";
      case REGIME_BULL_WEAK:       return "BULL_WEAK";
      case REGIME_BEAR_STRONG:     return "BEAR_STRONG";
      case REGIME_BEAR_WEAK:       return "BEAR_WEAK";
      case REGIME_RANGE:           return "RANGE";
      case REGIME_VOL_EXPANSION:   return "VOL_EXPANSION";
      case REGIME_VOL_COMPRESSION: return "VOL_COMPRESSION";
      case REGIME_REVERSAL:        return "REVERSAL";
      default:                     return "UNCERTAIN";
     }
  }

string VolName(const ENUM_VOL_STATE v)
  {
   switch(v)
     {
      case VOL_COMPRESSION: return "COMPRESS";
      case VOL_NORMAL:      return "NORMAL";
      case VOL_EXPANSION:   return "EXPANSION";
      default:              return "UNKNOWN";
     }
  }

ENUM_REGIME RegCurrent()             { return _rg_current.regime; }
int RegConfidence()                  { return _rg_current.confidence; }
ENUM_VOL_STATE RegVolState()         { return _rg_current.vol; }
int RegBias()                        { return _rg_current.bias; }
RegimeResult RegResult()             { return _rg_current; }

void RegInit()
  {
   _rg_current.regime = REGIME_UNCERTAIN;
   _rg_current.confidence = 0;
   _rg_current.vol = VOL_UNKNOWN;
   _rg_current.bias = 0;
   _rg_current.reason_count = 0;
   _rg_current.evaluated_at = 0;
   _rg_current.since = 0;
   _rg_current.bars_in_regime = 0;
   _rg_last_bar = 0;
  }

//--- structure check over closed bars: returns  +1/-1 structure bias (0 none)
int RegStructure(MqlRates &rates[], const int count, string &detail)
  {
   if(count < 10) { detail = "no_data"; return 0; }
   int n = MathMin(count - 1, InpRegStructBars); // usable closed bars
   int lows_pos[], highs_pos[];
   ArrayResize(lows_pos, 0);
   ArrayResize(highs_pos, 0);
   
   // swing points: a swing low has 2 lower lows either side (5-bar pivot)
   for(int i = 2; i < n - 2; i++)
     {
      bool is_l = rates[i].low <= rates[i+1].low && rates[i].low <= rates[i+2].low
               && rates[i].low <= rates[i-1].low && rates[i].low <= rates[i-2].low;
      bool is_h = rates[i].high >= rates[i+1].high && rates[i].high >= rates[i+2].high
               && rates[i].high >= rates[i-1].high && rates[i].high >= rates[i-2].high;
      if(is_l)
        {
         int m = ArraySize(lows_pos);
         ArrayResize(lows_pos, m + 1);
         lows_pos[m] = i;
        }
      if(is_h)
        {
         int m = ArraySize(highs_pos);
         ArrayResize(highs_pos, m + 1);
         highs_pos[m] = i;
        }
     }
   
   int bias = 0;
   // newest-first arrays; compare two most recent pivots
   if(ArraySize(highs_pos) >= 2)
     {
      double h_new = rates[highs_pos[0]].high;
      double h_old = rates[highs_pos[1]].high;
      bias += (h_new > h_old) ? 1 : -1;
     }
   if(ArraySize(lows_pos) >= 2)
     {
      double l_new = rates[lows_pos[0]].low;
      double l_old = rates[lows_pos[1]].low;
      bias += (l_new > l_old) ? 1 : -1;
     }
   detail = StringFormat("HHbias=%d", bias);
   return bias;
  }

//+------------------------------------------------------------------+
//| Evaluate one closed setup-TF bar; returns true when updated      |
//+------------------------------------------------------------------+
bool RegEvaluate(RegimeResult &out)
  {
   //--- gather factors (failures reported, never silently skipped)
   double ema_fast, ema_slow, adx, di_plus, di_minus;
   if(!MdIndValue(InpSetupTF, 1, InpRegEmaFast, 1, ema_fast))   { LogDebug("REG: ema_fast no data"); return false; }
   if(!MdIndValue(InpSetupTF, 1, InpRegEmaSlow, 1, ema_slow))  { LogDebug("REG: ema_slow no data"); return false; }
   if(!MdIndBuffer(InpSetupTF, 2, InpRegAdxPeriod, 0, 1, adx))      { LogDebug("REG: adx no data"); return false; }
   if(!MdIndBuffer(InpSetupTF, 2, InpRegAdxPeriod, 1, 1, di_plus))  { LogDebug("REG: DI+ no data"); return false; }
   if(!MdIndBuffer(InpSetupTF, 2, InpRegAdxPeriod, 2, 1, di_minus)) { LogDebug("REG: DI- no data"); return false; }
   
   double atr_ratio = 1.0, atr_now = 0.0;
   bool vol_ok = MdAtrRatio(InpSetupTF, InpRegAtrPeriod, InpRegBaselineBars, atr_ratio, atr_now);
   
   MqlRates rates[];
   int rc = MdGetClosedRates(InpSetupTF, MathMax(InpRegStructBars + 10, 60), rates);
   
   //--- factor 1: trend alignment / bias
   int bias = 0;
   if(ema_fast > ema_slow * 1.0002) bias = 1;
   else if(ema_fast < ema_slow * 0.9998) bias = -1;
   
   //--- factor 2: DI direction
   int di_dir = (di_plus > di_minus) ? 1 : -1;
   
   //--- factor 3: structure
   string detail = "";
   int struct_bias = (rc > 10) ? RegStructure(rates, rc, detail) : 0;
   
   //--- factor 4: volatility state
   ENUM_VOL_STATE vol = VOL_NORMAL;
   if(vol_ok)
     {
      if(atr_ratio >= InpRegVolSpikeRatio) vol = VOL_EXPANSION;
      else if(atr_ratio <= InpRegVolDeadRatio) vol = VOL_COMPRESSION;
     }
   
   //--- decision matrix
   ENUM_REGIME new_regime = REGIME_UNCERTAIN;
   int conf = 0;
   string reasons[5];
   int rn = 0;
   
   if(vol_ok && vol == VOL_EXPANSION)
     {
      new_regime = REGIME_VOL_EXPANSION;
      conf = 85;
      reasons[rn++] = "ATRratio=" + DoubleToString(atr_ratio, 2);
     }
   else if(adx >= InpRegAdxStrong)
     {
      if(bias == di_dir && struct_bias * di_dir > 0)
        {
         new_regime = (di_dir > 0) ? REGIME_BULL_STRONG : REGIME_BEAR_STRONG;
         conf = 80 + (int)MathMin(15.0, (adx - InpRegAdxStrong));
        }
      else if(struct_bias * di_dir < 0)
        {
         new_regime = REGIME_REVERSAL; // strong trend but structure disagrees
         conf = 85;
        }
      else
        {
         new_regime = (di_dir > 0) ? REGIME_BULL_STRONG : REGIME_BEAR_STRONG;
         conf = 65;
        }
     }
   else if(adx < InpRegAdxWeak)
     {
      if(vol == VOL_COMPRESSION)
        {
         new_regime = REGIME_VOL_COMPRESSION;
         conf = 70;
        }
      else
        {
         new_regime = REGIME_RANGE;
         conf = 70;
        }
     }
   else
     {
      // mid-strength trend: weak continuation
      new_regime = (di_dir > 0) ? REGIME_BULL_WEAK : REGIME_BEAR_WEAK;
      conf = 55 + (struct_bias == di_dir ? 10 : 0);
     }
   
   if(!vol_ok)
     {
      reasons[rn++] = "vol:no_data";
      conf = (int)(conf * 0.7); // data confidence penalty, never silent
     }
   
   //--- hysteresis: min dwell before switching.
   //    The initial UNCERTAIN state is NOT protected: dwell/confidence hysteresis
   //    only guards real regimes, otherwise attach-time stays stuck at conf=0.
   if(_rg_last_bar > 0 && new_regime != _rg_current.regime
      && _rg_current.regime != REGIME_UNCERTAIN && _rg_current.confidence > 0)
     {
      bool rv_takeover = (new_regime == REGIME_REVERSAL && conf >= InpRegMinConfidence);
      if(!rv_takeover && (_rg_current.bars_in_regime < InpRegMinDwellBars || conf < _rg_current.confidence))
        {
         new_regime = _rg_current.regime;
         conf = _rg_current.confidence;
         reasons[rn++] = "hysteresis_hold";
        }
      else
         _rg_current.since = iTime(_Symbol, InpSetupTF, 1);
     }
   
   if(rn > 5) rn = 5;
   _rg_current.regime = new_regime;
   _rg_current.confidence = conf;
   _rg_current.vol = vol;
   _rg_current.bias = (bias == di_dir) ? bias : 0; // agree = directional, disagree = flat
   for(int i = 0; i < rn; i++) _rg_current.reasons[i] = reasons[i];
   _rg_current.reason_count = rn;
   _rg_current.evaluated_at = TimeCurrent();
   if(_rg_current.since == 0) _rg_current.since = iTime(_Symbol, InpSetupTF, 1);
   
   out = _rg_current;
   return true;
  }

//+------------------------------------------------------------------+
//| Called from EA loop; evaluates once per new closed setup bar     |
//+------------------------------------------------------------------+
bool RegOnNewBar()
  {
   datetime bar_time = iTime(_Symbol, InpSetupTF, 0);
   if(bar_time <= 0 || bar_time == _rg_last_bar) return false;
   _rg_last_bar = bar_time;
   
   RegimeResult prev = _rg_current;
   if(!RegEvaluate(_rg_current)) return false;
   
   _rg_current.bars_in_regime = (_rg_current.since > 0)
      ? (long)iBarShift(_Symbol, InpSetupTF, _rg_current.since, false) : 0;
   LogInfo(StringFormat("REG: %s conf=%d vol=%s bars=%d",
                        RegName(_rg_current.regime), _rg_current.confidence,
                        VolName(_rg_current.vol), (int)_rg_current.bars_in_regime));
   return true;
  }