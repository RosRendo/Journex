//+------------------------------------------------------------------+
//|                                                     Executor.mqh |
//|                                          AdaptiveRegime EA       |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property version   "1.00"
#property once
#include <Trade\Trade.mqh>
#include "..\Core\Types.mqh"
#include "..\Core\Config.mqh"
#include "..\Core\Logger.mqh"
#include "..\Core\MarketData.mqh"

//+------------------------------------------------------------------+
//| Execution layer: validation, normalization, retcode reporting.   |
//| No strategy logic. Always logs planned vs actual fill.           |
//+------------------------------------------------------------------+
CTrade EETrade;

bool EEInit(const int magic)
  {
   EETrade.SetExpertMagicNumber(magic);
   EETrade.SetDeviationInPoints(InpTerminalSlippagePts);
   EETrade.SetTypeFillingBySymbol(_Symbol);
   EETrade.SetAsyncMode(false);
   return true;
  }

//+------------------------------------------------------------------+
//| Price normalization to tick size                                 |
//+------------------------------------------------------------------+
double EENormPrice(double price)
  {
   double tick_size = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tick_size <= 0.0) return NormalizeDouble(price, (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS));
   return NormalizeDouble(MathRound(price / tick_size) * tick_size,
                          (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS));
  }

//+------------------------------------------------------------------+
//| Market execution with pre-flight validation and fill reporting   |
//+------------------------------------------------------------------+
bool EEExecuteMarket(const TradeSignal &sig, const TradeAllocation &alloc)
  {
   if(!alloc.ok) { LogError("EXEC: called with rejected allocation"); return false; }
   
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick)) { LogError("EXEC: no tick"); return false; }
   
   double price = (sig.dir > 0) ? tick.ask : tick.bid;
   double dev_pct = MathAbs(price - sig.entry) / MathMax(1e-9, sig.entry) * 100.0;
   if(dev_pct > InpMaxFillDeviationPct)
      LogError(StringFormat("EXEC: entry drift %.3f%% > cap %.3f%% (planned %.2f live %.2f)",
                            dev_pct, InpMaxFillDeviationPct, sig.entry, price));
   // proceeds with guarded drift because SL distance re-check follows
   
   // keep SL distance >= floor vs LIVE price (drift protection)
   double atr_live = 0.0;
   MdIndValue(InpEntryTF, 0, InpRegAtrPeriod, 1, atr_live);
   double live_dist = MathAbs(price - sig.sl);
   double floor_live = MdMinSLDist(atr_live);
   if(floor_live > 0.0 && live_dist < floor_live)
     {
      LogError(StringFormat("EXEC: rejecting, live SL dist %.2f < floor %.2f", live_dist, floor_live));
      return false;
     }
   
   double sl = EENormPrice(sig.sl);
   double tp = (sig.tp > 0.0) ? EENormPrice(sig.tp) : 0.0;
   
   bool ok = false;
   if(sig.dir > 0)
      ok = EETrade.PositionOpen(_Symbol, ORDER_TYPE_BUY,  alloc.lots, price, sl, tp, sig.reason);
   else
      ok = EETrade.PositionOpen(_Symbol, ORDER_TYPE_SELL, alloc.lots, price, sl, tp, sig.reason);
   
   uint rc = EETrade.ResultRetcode();
   if(!ok || (rc != TRADE_RETCODE_DONE && rc != TRADE_RETCODE_PLACED))
     {
      LogError(StringFormat("EXEC: open failed rc=%u (%s) lots=%.2f", rc, EETrade.ResultRetcodeDescription(), alloc.lots));
      return false;
     }
   
   LogInfo(StringFormat("EXEC: OPENED %s %.2f lots planned=%.2f fill=%.2f sl=%.2f tp=%.2f [%s] score=%.1f",
                        sig.dir > 0 ? "BUY" : "SELL", alloc.lots, sig.entry, price, sl, tp,
                        sig.strategy_id, sig.score));
   return true;
  }

//+------------------------------------------------------------------+
//| Close one owned position                                         |
//+------------------------------------------------------------------+
bool EEClosePosition(const ulong ticket)
  {
   if(!PositionSelectByTicket(ticket))
     {
      LogError(StringFormat("EXEC: close failed, ticket %I64u not found", ticket));
      return false;
     }
   bool ok = EETrade.PositionClose(ticket);
   if(!ok)
      LogError(StringFormat("EXEC: close failed rc=%u (%s) ticket=%I64u",
                            EETrade.ResultRetcode(), EETrade.ResultRetcodeDescription(), ticket));
   else
      LogInfo(StringFormat("EXEC: CLOSED ticket=%I64u", ticket));
   return ok;
  }

//+------------------------------------------------------------------+
//| Modify SL/TP of an owned position                                |
//+------------------------------------------------------------------+
bool EEModifyStops(const ulong ticket, const double sl, const double tp)
  {
   if(!PositionSelectByTicket(ticket))
     {
      LogError("EXEC: modify failed, position gone");
      return false;
     }
   bool ok = EETrade.PositionModify(ticket, EENormPrice(sl), (tp > 0.0) ? EENormPrice(tp) : 0.0);
   if(!ok)
      LogError(StringFormat("EXEC: modify failed rc=%u ticket=%I64u", EETrade.ResultRetcode(), ticket));
   return ok;
  }

//+------------------------------------------------------------------+
//| Iterate owned positions; callback-free helper pattern            |
//| Returns count; caller reads via PositionSelectByTicket inside.   |
//+------------------------------------------------------------------+
int EEMine(ulong &tickets[])
  {
   ArrayResize(tickets, 0);
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong pticket = PositionGetTicket(i);
      if(pticket == 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      int n = ArraySize(tickets);
      ArrayResize(tickets, n + 1);
      tickets[n] = pticket;
     }
   return ArraySize(tickets);
  }