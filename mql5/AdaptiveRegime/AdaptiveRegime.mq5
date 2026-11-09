//+------------------------------------------------------------------+
//|                                               AdaptiveRegime.mq5 |
//|                         Adaptive Multi-Regime Trading EA for MT5 |
//+------------------------------------------------------------------+
#property copyright "AdaptiveRegime"
#property link      ""
#property version   "1.000"
#property description "Adaptive multi-regime EA: regime detection drives strategy selection;"
#property description "6 engines, hard-capped risk, strategy-aware exits, persist lockouts."
#property strict

//--- core (ordered: selector before strategy engines, base before engines)
#include "Core\Types.mqh"
#include "Core\Config.mqh"
#include "Core\Logger.mqh"
#include "Core\StateStore.mqh"
#include "Core\MarketData.mqh"
#include "Execution\Executor.mqh"
#include "Risk\RiskEngine.mqh"
#include "Risk\SetupThrottle.mqh"
#include "Regime\RegimeDetector.mqh"
#include "Regime\StrategySelector.mqh"
#include "Strategies\StrategyBase.mqh"
#include "News\NewsFilter.mqh"
#include "Strategies\ScalpEngine.mqh"
#include "Strategies\IntradayEngine.mqh"
#include "Strategies\SwingEngine.mqh"
#include "Strategies\ReversalEngine.mqh"
#include "Strategies\RangeEngine.mqh"
#include "Strategies\BreakoutEngine.mqh"
#include "Management\TradeManager.mqh"
#include "UI\Dashboard.mqh"

datetime g_risk_last_update = 0;
datetime g_last_setup_bar   = 0;
datetime g_last_entry_bar   = 0;
string   g_sel_text         = "NONE";
string   g_news_text        = "OFF";
// TradeManager module also declares g_sel_text is not duplicated (module reopened)
string   g_sel_text_holder  = "";

void SetSelText(const string s)  { g_sel_text = s; }
string GetSelText()              { return g_sel_text; }
void SetNewsText(const string s) { g_news_text = s; }
string GetNewsText()             { return g_news_text; }

//+------------------------------------------------------------------+
//| Deterministic self-test — pure math & state roundtrips only,     |
//| no network and no environment-dependent gates.                   |
//+------------------------------------------------------------------+
bool ARSelfTest()
  {
   int failures = 0;
   
   // T1: pip size positive
   double pip = PipSize();
   if(pip <= 0.0) { LogError("SELFTEST T1 FAIL: PipSize<=0"); failures++; }
   else LogInfo(StringFormat("SELFTEST T1 PASS: pip=%.5f", pip));
   
   // T2: raw lot math on symbol numbers
   if(_re_equity > 0.0 && SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE) > 0.0)
     {
      double test_pct = 0.25;
      double risk_money = 10000.0 * test_pct / 100.0;
      double dist = 1.50;
      double ts = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
      double tv = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
      double mpl = (dist / ts) * tv;
      double lots = risk_money / mpl;
      if(lots <= 0.0) { LogError("SELFTEST T2 FAIL: lots<=0"); failures++; }
      else LogInfo(StringFormat("SELFTEST T2 PASS: rawLots=%.3f (mpl=%.2f)", lots, mpl));
     }
   else
      LogInfo("SELFTEST T2 SKIP: symbol tick specs unavailable");
   
   // T3: volume normalization rejects sub-min
   double lots3 = 0.0005;
   string err3 = "";
   bool ok3 = ExecNormalizeLots(lots3, err3);
   double minv = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   if(lots3 >= minv && ok3) { LogError("SELFTEST T3 FAIL: sub-min accepted"); failures++; }
   else LogInfo("SELFTEST T3 PASS: sub-min rejected (" + err3 + ")");
   
   // T4: StateStore roundtrip
   IntSSSet("selftest_int", 42);
   DoubleSSSet("selftest_dbl", 1.25);
   if(IntSSGet("selftest_int", -1) != 42)
     { LogError("SELFTEST T4 FAIL: int roundtrip"); failures++; }
   if(MathAbs(DoubleSSGet("selftest_dbl", 0.0) - 1.25) > 1e-9)
     { LogError("SELFTEST T4 FAIL: double roundtrip"); failures++; }
   if(IntSSGet("selftest_int", -1) == 42)
      LogInfo("SELFTEST T4 PASS: StateStore roundtrip");
   
   // T5: naming + selector mask sanity
   if(RegName(REGIME_UNCERTAIN) != "UNCERTAIN")
     { LogError("SELFTEST T5 FAIL: RegName"); failures++; }
   else LogInfo("SELFTEST T5 PASS: RegName");
   SelAllow("TESTX", true); // unknown id ignored
   if(SelAllowedText() == "") { LogError("SELFTEST T5b FAIL: mask"); failures++; }
   else LogInfo("SELFTEST T5b PASS: selector mask text");
   
   // T6: price normalization respects tick size
   double p6 = EENormPrice(1.234567);
   double tick6 = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tick6 > 0.0)
     {
      double k = p6 / tick6;
      if(MathAbs(k - MathRound(k)) > 1e-6) { LogError("SELFTEST T6 FAIL: not tick-aligned"); failures++; }
      else LogInfo("SELFTEST T6 PASS: EENormPrice tick-aligned");
     }
   
   // T7: news parser sanity (deterministic)
   NEWS_Parse("09:00-09:30;14:00-14:15");
   if(!_nf_parse_ok || _nf_count != 2)
     { LogError("SELFTEST T7 FAIL: news parse"); failures++; }
   else
      LogInfo("SELFTEST T7 PASS: news parser");
   NEWS_Parse(""); // leave clean state
   
   LogInfo(StringFormat("SELFTEST COMPLETE: failures=%d", failures));
   return failures == 0;
  }

//+------------------------------------------------------------------+
int OnInit()
  {
   if(InpMagic <= 0)
     {
      Print("[AR] ERR invalid magic number");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(InpRiskPerTradePct <= 0.0 || InpRiskPerTradePct > 2.0)
     {
      Print("[AR] ERR risk per trade out of bounds (0,2]: ", InpRiskPerTradePct);
      return INIT_PARAMETERS_INCORRECT;
     }
   if(InpMinRR < 1.0)
     {
      Print("[AR] ERR min RR must be >= 1.0, got ", InpMinRR);
      return INIT_PARAMETERS_INCORRECT;
     }
   if(InpSetupTF <= InpEntryTF)
     {
      Print("[AR] ERR SetupTF must be >= EntryTF (got ", EnumToString(InpSetupTF), " / ", EnumToString(InpEntryTF), ")");
      return INIT_PARAMETERS_INCORRECT;
     }
   
   LoggerInit(InpMagic);
   EEInit(InpMagic);
   SSLoad();
   RegInit();
   SelInit();
   MdReset();
   
   double ts = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(ts <= 0.0)
      LogError("INIT: symbol tick size unavailable yet (strategies wait for refresh)");
   
   string mode_name = (InpOperatingMode == OP_CONSERVATIVE) ? "CONSERVATIVE"
                    : (InpOperatingMode == OP_AGGRESSIVE)   ? "AGGRESSIVE"
                    : "BALANCED";
   LogInfo(StringFormat("INIT: mode=%s effRiskCap=%.3f%% agg=%.2f%% maxPos=%d dailyLoss=%.2f%% dd=%.2f%%",
                        mode_name, RiskEffectivePerTradePct(), InpMaxAggregateRiskPct,
                        InpMaxOpenPositions, InpMaxDailyLossPct, InpMaxDrawdownPct));
   
   _re_equity = AccountInfoDouble(ACCOUNT_EQUITY);
   RiskUpdateState();
   DbInit();
   
   if(InpRunSelfTest)
      ARSelfTest();
   
   EventSetTimer(5);
   LogInfo("INIT COMPLETE");
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   SSFlush();
   MdReleaseAll();
   DbShutdown();
   LoggerShutdown();
  }

//+------------------------------------------------------------------+
void OnTick()
  {
   MqlTick tick;
   if(!MdTick(tick)) return;
   
   //--- risk state every ~10s
   if((int)tick.time - (int)g_risk_last_update >= 10)
     {
      g_risk_last_update = tick.time;
      RiskUpdateState();
     }
   
   //--- regime + selector on each new closed setup-TF bar
   bool reg_new = RegOnNewBar();
   RegimeResult reg = RegResult();
   if(reg_new)
     {
      SelUpdate(reg);
      g_sel_text = SelAllowedText();
     }
   g_news_text = NewsStateText();
   
   //--- manage open positions every tick
   TMOnTick();
   
   //--- entries: news gate blocks new business only, management continues
   if(!NewsBlocked() && !RiskLockoutAny())
      ARRunPipeline(reg);
   
   //--- dashboard ~1s throttle inside
   double sp = MdSpreadPoints();
   DbUpdate(reg, RiskStateText(), RiskLockoutText(), sp, _re_open_count,
            g_sel_text, g_news_text);
  }

//+------------------------------------------------------------------+
//| Entry pipeline: engines (selector-allowed) -> conflict check ->  |
//| risk gate -> execute -> register management meta                 |
//+------------------------------------------------------------------+
void ARRunPipeline(const RegimeResult &reg)
  {
   datetime setup_bar = iTime(_Symbol, InpSetupTF, 0);
   bool new_setup = (setup_bar != g_last_setup_bar);
   
   datetime entry_bar = iTime(_Symbol, InpEntryTF, 0);
   bool new_entry = (entry_bar != g_last_entry_bar);
   
   TradeSignal sig;
   ZeroMemory(sig);
   bool have_signal = false;
   
   if(new_setup)
     {
      g_last_setup_bar = setup_bar;
      if(EnSwing(sig))         have_signal = true;
      else if(EnReversal(sig)) have_signal = true;
      else if(EnRange(sig))    have_signal = true;
      else if(EnBreakout(sig)) have_signal = true;
     }
   
   if(!have_signal && new_entry)
     {
      g_last_entry_bar = entry_bar;
      if(EnIntraday(sig)) have_signal = true;
     }
   
   //--- scalper: tick-driven (momentum bursts do not wait for bar close)
   if(!have_signal)
      if(EnScalp(sig)) have_signal = true;
   
   if(!have_signal) return;
   
   //--- conflict rule: no same-direction stacking (no hedging / pyramiding)
   ulong tkts[];
   int n_open = EEMine(tkts);
   for(int i = 0; i < n_open; i++)
     {
      if(!PositionSelectByTicket(tkts[i])) continue;
      int pos_dir = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;
      if(pos_dir == sig.dir)
        {
         LogDebug(StringFormat("PIPE: skip %s signal, same-direction position open", sig.strategy_id));
         return;
        }
     }
   
   //--- risk gate (sessions, spread, caps, RR, sizing)
   TradeAllocation alloc = RiskGateSignal(sig, _Symbol);
   if(!alloc.ok)
     {
      LogInfo(StringFormat("PIPE: %s rejected: %s", sig.strategy_id, alloc.reject_reason));
      return;
     }
   
   //--- execute
   if(!EEExecuteMarket(sig, alloc)) return;
   
   //--- resolve REAL position ticket from the execution deal
   ulong pos_ticket = 0;
   long deal = (long)EETrade.ResultDeal();
   if(deal > 0 && HistoryDealSelect((ulong)deal))
      pos_ticket = (ulong)HistoryDealGetInteger((ulong)deal, DEAL_POSITION_ID);
   
   if(pos_ticket > 0)
     {
      TMRegister(pos_ticket, sig.strategy_id, sig.entry, sig.sl, TimeCurrent());
      RiskNoteEntry(); // daily trade-count cap
      LogInfo(StringFormat("PIPE: registered %s ticket=%I64u", sig.strategy_id, pos_ticket));
     }
   else
      LogError("PIPE: could not resolve position ticket; manager will adopt later");
  }

//+------------------------------------------------------------------+
void OnTimer()
  {
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick)) return;
   if((int)tick.time - (int)g_risk_last_update >= 10)
     {
      g_risk_last_update = tick.time;
      RiskUpdateState();
     }
   TMOnTick();
   DbUpdate(RegResult(), RiskStateText(), RiskLockoutText(),
            MdSpreadPoints(), _re_open_count, g_sel_text, g_news_text);
  }

//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
   {
    if(trans.type != TRADE_TRANSACTION_DEAL_ADD) return;
    if(trans.symbol != _Symbol) return;
    
    if(HistoryDealSelect(trans.deal))
      {
       long mag = HistoryDealGetInteger(trans.deal, DEAL_MAGIC);
       if(mag != InpMagic) return;
      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
       if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
         {
          double pnl = HistoryDealGetDouble(trans.deal, DEAL_PROFIT)
                     + HistoryDealGetDouble(trans.deal, DEAL_SWAP)
                     + HistoryDealGetDouble(trans.deal, DEAL_COMMISSION);
          RiskRegisterClosedPnL(pnl);
          long pos_id = HistoryDealGetInteger(trans.deal, DEAL_POSITION_ID);
          if(HistorySelectByPosition(pos_id) && HistoryDealsTotal() > 0)
            {
             ulong first = HistoryDealGetTicket(0);
             string cm = HistoryDealGetString(first, DEAL_COMMENT);
             ThrottleRecordClosed(cm, pnl);
            }
          LogInfo(StringFormat("TXN: closed pnl=%.2f (day total=%.2f)", pnl, _re_day_pnl));
         }
     }
  }