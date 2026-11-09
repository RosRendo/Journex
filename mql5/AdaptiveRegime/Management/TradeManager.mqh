//+------------------------------------------------------------------+
//|                                                  TradeManager.mqh|
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
#include "..\Execution\Executor.mqh"

//+------------------------------------------------------------------+
//| Strategy-aware position management with persistent meta:         |
//|   SCALP    : time stop (max hold) + BE@0.5R, no trail          |
//|   INTRADAY : BE@1R, partial@1.5R 50%, ATR trail                  |
//|   SWING    : BE@1R (+0.1R), partial@2R, wide trail (setupTF ATR)|
//|   REVERSAL : BE@1R, no partial, trail default                    |
//|   RANGE    : broker TP only, no BE/trail                         |
//|   BREAKOUT : BE@1R, no partial, trail default                    |
//| Meta persists across EA restarts (keys tm<tkt>_*) and is         |
//| cleaned up when the position disappears.                         |
//+------------------------------------------------------------------+
ulong  _tm_seen[];

//--- config switch per strategy (used below)
bool TMUseBE(const string s)
  {
   if(s == "SCALP" || s == "INTRADAY" || s == "SWING" || s == "REVERSAL" || s == "BREAKOUT")
      return InpUseBreakeven;
   return false; // RANGE: none
  }

double TMBETriggerR(const string s)
  {
   if(s == "SCALP")    return 0.5;
   if(s == "SWING")    return InpSwingBETriggerRR;   // default 1.0
   return 1.0; // INTRADAY / REVERSAL / BREAKOUT
  }

double TMBEOffsetR(const string s)
  {
   if(s == "SWING") return 0.1;
   return 0.0;
  }

double TMPartialRR(const string s)
  {
   if(s == "INTRADAY") return 1.5;
   if(s == "SWING")    return InpSwingPartialRR;    // default 2.0
   return 0.0;
  }

double TMPartialPct(const string s)
  {
   if(s == "INTRADAY") return 50.0;
   if(s == "SWING")    return InpSwingPartialPct;   // default 50
   return 0.0;
  }

double TMTrailMult(const string s)
  {
   if(!InpUseTrailing) return 0.0;
   if(s == "SCALP" || s == "RANGE") return 0.0;  // no trail
   if(s == "SWING")    return InpSwingTrailATRMult;   // default 4.0 wide
   return InpTrailATRMultDefault;                     // 3.5
  }
//+------------------------------------------------------------------+
//| Register a freshly opened position's meta (called by pipeline)   |
//+------------------------------------------------------------------+
void TMRegister(const ulong ticket, const string strategy, const double entry,
                const double initial_sl, const datetime opened_at)
  {
   DoubleSSSet("tm" + IntegerToString((long)ticket) + "_ie", entry);
   DoubleSSSet("tm" + IntegerToString((long)ticket) + "_isl", initial_sl);
   IntSSSet("tm" + IntegerToString((long)ticket) + "_oa", (long)opened_at);
   StringSSSet("tm" + IntegerToString((long)ticket) + "_s", strategy);
   IntSSSet("tm" + IntegerToString((long)ticket) + "_bs", 0);   // be_stage
   IntSSSet("tm" + IntegerToString((long)ticket) + "_pd", 0);   // partial_done
   DoubleSSSet("tm" + IntegerToString((long)ticket) + "_pr", 0.0); // peak_r
   
   int n = ArraySize(_tm_seen);
   ArrayResize(_tm_seen, n + 1);
   _tm_seen[n] = ticket;
  }

bool TMLoad(const long ticket, string &strategy, double &entry, double &isl,
            datetime &oa, int &bs, int &pd, double &peak_r)
  {
   string key = "tm" + IntegerToString(ticket);
   strategy = StringSSGet(key + "_s", "");
   if(strategy == "") return false;
   entry  = DoubleSSGet(key + "_ie", 0.0);
   isl    = DoubleSSGet(key + "_isl", 0.0);
   oa     = (datetime)IntSSGet(key + "_oa", 0);
   bs     = (int)IntSSGet(key + "_bs", 0);
   pd     = (int)IntSSGet(key + "_pd", 0);
   peak_r = DoubleSSGet(key + "_pr", 0.0);
   return true;
  }

void TMForget(const long ticket)
  {
   string key = "tm" + IntegerToString(ticket);
   SSDelete(key + "_s");
   SSDelete(key + "_ie");
   SSDelete(key + "_isl");
   SSDelete(key + "_oa");
   SSDelete(key + "_bs");
   SSDelete(key + "_pd");
   SSDelete(key + "_pr");
  }

//+------------------------------------------------------------------+
//| Core management pass � every tick                                |
//+------------------------------------------------------------------+
void TMOnTick()
  {
   ulong tickets[];
   int n_open = EEMine(tickets);
   
   //--- forget meta of closed positions (restart-safe)
   for(int i = ArraySize(_tm_seen) - 1; i >= 0; i--)
     {
      bool still = false;
      for(int k = 0; k < n_open; k++)
         if(tickets[k] == _tm_seen[i]) { still = true; break; }
      if(!still)
        {
         LogInfo(StringFormat("TM: position %I64u closed, meta forgotten", _tm_seen[i]));
         TMForget((long)_tm_seen[i]);
         for(int j = i; j < ArraySize(_tm_seen) - 1; j++) _tm_seen[j] = _tm_seen[j + 1];
         ArrayResize(_tm_seen, ArraySize(_tm_seen) - 1);
        }
     }
   
   if(n_open == 0) return;
   
   double atr_setup = SBAtr(InpSetupTF);
   double atr_entry = SBAtr(InpEntryTF);
   double pip = 10.0 * SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   
   for(int t = 0; t < n_open; t++)
     {
      ulong tk = tickets[t];
      if(!PositionSelectByTicket(tk)) continue;
      
      string strategy;
      double entry, isl, peak_r;
      datetime oa;
      int bs, pd;
      if(!TMLoad((long)tk, strategy, entry, isl, oa, bs, pd, peak_r))
        {
         // position without meta (opened by hand or pre-restart): manage defensively
         LogInfo(StringFormat("TM: adopting position %I64u without meta (DEFA)", tk));
         TMRegister(tk, "DEFA", PositionGetDouble(POSITION_PRICE_OPEN),
                    PositionGetDouble(POSITION_SL), (datetime)PositionGetInteger(POSITION_TIME));
         continue;
        }
      
      int dir = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;
      double cur_sl = PositionGetDouble(POSITION_SL);
      double cur_tp = PositionGetDouble(POSITION_TP);
      double volume = PositionGetDouble(POSITION_VOLUME);
      MqlTick qtick;
      double price = SymbolInfoTick(_Symbol, qtick) ? (dir > 0 ? qtick.bid : qtick.ask) : 0.0;
      if(price <= 0.0) continue;
      
      double r_dist = MathAbs(entry - isl);          // 1R distance
      if(r_dist <= 0.0) continue;
      double r_now = dir * (price - entry) / r_dist; // current R multiple
      
      if(r_now > peak_r)
        {
         peak_r = r_now;
         DoubleSSSet("tm" + IntegerToString((long)tk) + "_pr", peak_r);
        }
      
      //--- 1. breakeven
      double be_trig = TMBETriggerR(strategy);
      if(TMUseBE(strategy) && bs == 0 && r_now >= be_trig && be_trig > 0.0)
        {
         double off = TMBEOffsetR(strategy) * r_dist;
         double new_sl = (dir > 0) ? entry + off : entry - off;
         bool improves = (dir > 0) ? (new_sl > cur_sl + 0.1 * pip) : (cur_sl == 0.0 || new_sl < cur_sl - 0.1 * pip);
         if(improves && EEModifyStops(tk, new_sl, cur_tp))
          {
           bs = 1;
           IntSSSet("tm" + IntegerToString((long)tk) + "_bs", 1);
           LogInfo(StringFormat("TM: %s BE@%.2fR ticket=%I64u", strategy, be_trig, tk));
          }
         continue; // one action per tick per position
        }
      
      //--- 2. partial exit
      double p_rr = TMPartialRR(strategy);
      if(pd == 0 && p_rr > 0.0 && r_now >= p_rr && bs == 1)
        {
         double pct = TMPartialPct(strategy);
         double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
         double vmin = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
         if(step > 0.0 && vmin > 0.0)
           {
            double close_vol = MathFloor(volume * pct / 100.0 / step) * step;
            double rest = volume - close_vol;
            if(close_vol >= vmin && rest >= vmin - 1e-9)
              {
               if(EETrade.PositionClosePartial(tk, close_vol))
                 {
                  pd = 1;
                  IntSSSet("tm" + IntegerToString((long)tk) + "_pd", 1);
                  LogInfo(StringFormat("TM: %s partial %.2f@%.2fR ticket=%I64u", strategy, close_vol, p_rr, tk));
                 }
               else
                  LogError(StringFormat("TM: partial failed rc=%u ticket=%I64u", EETrade.ResultRetcode(), tk));
              }
            else
              {
               pd = 1; // cannot split (min-lot constraint); mark done
               IntSSSet("tm" + IntegerToString((long)tk) + "_pd", 1);
              }
           }
         continue;
        }
      
      //--- 3. ATR trailing (after BE)
      double tmult = TMTrailMult(strategy);
      if(tmult > 0.0 && bs == 1 && r_now >= 0.5)
        {
         double atr_t = (strategy == "SWING") ? atr_setup : atr_entry;
         if(strategy == "REVERSAL") atr_t = atr_setup;
         if(atr_t > 0.0)
           {
            double new_sl = (dir > 0) ? price - tmult * atr_t : price + tmult * atr_t;
            bool improves = (dir > 0) ? (new_sl > cur_sl + 0.2 * pip) : (cur_sl == 0.0 || new_sl < cur_sl - 0.2 * pip);
            if(improves && EEModifyStops(tk, new_sl, cur_tp))
               LogInfo(StringFormat("TM: %s trail=%.2f ticket=%I64u", strategy, new_sl, tk));
           }
         continue;
        }
      
      //--- 4. time stop (SCALP only)
      if(strategy == "SCALP" && InpScalpMaxHoldSec > 0)
        {
         int held = (int)(TimeCurrent() - oa);
         if(held >= InpScalpMaxHoldSec)
           {
            LogInfo(StringFormat("TM: SCALP time stop after %ds ticket=%I64u R=%.2f", held, tk, r_now));
            EEClosePosition(tk);
            continue;
           }
        }
     }
  }
