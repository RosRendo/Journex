//+------------------------------------------------------------------+
//|                                               StrategySelector.mqh|
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include "..\Core\Types.mqh"
#include "..\Core\Config.mqh"
#include "..\Core\Logger.mqh"

//+------------------------------------------------------------------+
//| Regime -> engine permission matrix, recomputed each new          |
//| setup-TF bar. Conflict rules live in the main pipeline:          |
//|   - no hedge (long+short simultaneously off)                     |
//|   - one entry attempt per closed setup bar                       |
//|   - engine cooldowns enforced per-strategy (StrategyBase)        |
//+------------------------------------------------------------------+
#define SE_ENGS 6

string SE_NAMES[SE_ENGS] = {"SCALP", "INTRADAY", "SWING", "REVERSAL", "RANGE", "BREAKOUT"};
bool   SE_ALLOWED[SE_ENGS];

string SelName(const int i) { return (i >= 0 && i < SE_ENGS) ? SE_NAMES[i] : "?"; }

void SelInit()
  {
   for(int i = 0; i < SE_ENGS; i++) SE_ALLOWED[i] = false;
  }

bool SelAllowed(const string id)
  {
   for(int i = 0; i < SE_ENGS; i++)
      if(SE_NAMES[i] == id) return SE_ALLOWED[i];
   return false;
  }

int SelAllowedMask()
  {
   int m = 0;
   for(int i = 0; i < SE_ENGS; i++)
      if(SE_ALLOWED[i]) m |= (1 << i);
   return m;
  }

string SelAllowedText()
  {
   string s = "";
   for(int i = 0; i < SE_ENGS; i++)
      if(SE_ALLOWED[i]) s += (s == "" ? "" : "+") + SE_NAMES[i];
   if(s == "") s = "NONE";
   return s;
  }

void SelAllow(const string id, const bool val)
  {
   for(int i = 0; i < SE_ENGS; i++)
      if(SE_NAMES[i] == id) { SE_ALLOWED[i] = val; return; }
  }

//+------------------------------------------------------------------+
//| Recompute permissions from the current regime result             |
//+------------------------------------------------------------------+
void SelUpdate(const RegimeResult &reg)
  {
   for(int i = 0; i < SE_ENGS; i++) SE_ALLOWED[i] = false;
   
   // confidence floor: no engine acts on weak regime readings
   if(reg.confidence < InpRegMinConfidence)
     {
      LogInfo(StringFormat("SEL: NONE (conf=%d < %d)", reg.confidence, InpRegMinConfidence));
      return;
     }
   
   switch(reg.regime)
     {
      case REGIME_BULL_STRONG:
      case REGIME_BEAR_STRONG:
         SelAllow("SWING",    InpSwingEnabled);    // trend continuation
         SelAllow("INTRADAY", InpIntradayEnabled); // range break w/ bias
         SelAllow("BREAKOUT", InpBreakoutEnabled); // continuation breakout
         break;
         
      case REGIME_BULL_WEAK:
      case REGIME_BEAR_WEAK:
         SelAllow("INTRADAY", InpIntradayEnabled);
         SelAllow("RANGE",    InpRangeEnabled);    // fades ok in weak trend... risk: soft
         break;
         
      case REGIME_RANGE:
         SelAllow("RANGE", InpRangeEnabled);
         break;
         
      case REGIME_VOL_COMPRESSION:
         SelAllow("BREAKOUT", InpBreakoutEnabled); // pre-breakout compression
         SelAllow("RANGE",    InpRangeEnabled);    // still sideways until break
         break;
         
      case REGIME_VOL_EXPANSION:
         SelAllow("SCALP", InpScalpEnabled);       // ride momentum bursts
         SelAllow("BREAKOUT", InpBreakoutEnabled);
         break;
         
      case REGIME_REVERSAL:
         SelAllow("REVERSAL", InpReversalEnabled);
         break;
         
      default:
         break; // UNCERTAIN -> none
     }
   
   LogInfo("SEL: " + SelAllowedText());
  }