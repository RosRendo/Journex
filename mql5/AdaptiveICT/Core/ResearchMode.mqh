//+------------------------------------------------------------------+
//|                                                 ResearchMode.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "Types.mqh"
#include "Config.mqh"
#include "StateManager.mqh"

#define MAX_RESEARCH_SETUPS 100

//+------------------------------------------------------------------+
//| T035 [US5]: Research Mode & Missed Opportunity Logging           |
//| Records simulated setups without placing orders.                 |
//| Maps to: FR-039, FR-040                                          |
//+------------------------------------------------------------------+
class ResearchMode
  {
private:
   static ResearchSetup m_open_setups[MAX_RESEARCH_SETUPS];
   static int           m_open_count;
   static string        m_current_filename;

public:
   // Returns true if Research Mode is active
   static bool IsActive()
     {
      return (InpResearchModeOnly || research_mode_active);
     }

   // Generates the daily research file name
   static string GetFilename(string symbol)
     {
      MqlDateTime dt;
      TimeToStruct(TimeCurrent(), dt);
      string date_str = StringFormat("%04d%02d%02d", dt.year, dt.mon, dt.day);
      return "RESEARCH_" + symbol + "_" + date_str + ".csv";
     }

   // Logs newly detected setup to CSV file and tracking array
   static void LogSetup(const ResearchSetup &setup)
     {
      string fname = GetFilename(setup.symbol);
      int handle = FileOpen(fname, FILE_WRITE|FILE_READ|FILE_CSV|FILE_ANSI|FILE_COMMON, ',');
      if(handle != INVALID_HANDLE)
        {
         if(FileSize(handle) == 0)
           {
            string header = "SetupID,Symbol,Direction,Timeframe,DetectedAt,Entry,SL,TP1,TP2,TP3,Regime,Session,Outcome,Finalized,RegimePts,HTFStructPts,LiquidityPts,EntryLocPts,MSSPts,FVGOBPts,SMTPts,VolPts,SessionPts,ExecQualityPts,TotalScore,ScoreTier\r\n";
            FileWriteString(handle, header);
           }
         FileSeek(handle, 0, SEEK_END);

         string row = setup.setup_id + "," +
                      setup.symbol + "," +
                      setup.direction + "," +
                      setup.timeframe + "," +
                      TimeToString(setup.detected_at, TIME_DATE|TIME_MINUTES|TIME_SECONDS) + "," +
                      DoubleToString(setup.entry, _Digits) + "," +
                      DoubleToString(setup.sl, _Digits) + "," +
                      DoubleToString(setup.tp1, _Digits) + "," +
                      DoubleToString(setup.tp2, _Digits) + "," +
                      DoubleToString(setup.tp3, _Digits) + "," +
                      setup.regime + "," +
                      setup.session + "," +
                      setup.sim_outcome + "," +
                      (setup.outcome_finalized ? "1" : "0") + "," +
                      IntegerToString(setup.score.regime_pts) + "," +
                      IntegerToString(setup.score.htf_structure_pts) + "," +
                      IntegerToString(setup.score.liquidity_pts) + "," +
                      IntegerToString(setup.score.entry_location_pts) + "," +
                      IntegerToString(setup.score.mss_pts) + "," +
                      IntegerToString(setup.score.fvg_ob_pts) + "," +
                      IntegerToString(setup.score.smt_pts) + "," +
                      IntegerToString(setup.score.volatility_pts) + "," +
                      IntegerToString(setup.score.session_pts) + "," +
                      IntegerToString(setup.score.exec_quality_pts) + "," +
                      IntegerToString(setup.score.total) + "," +
                      setup.score.tier + "\r\n";

         FileWriteString(handle, row);
         FileClose(handle);
         Print("[ResearchMode] Setup logged to CSV: ", setup.setup_id, " | Score: ", setup.score.total, " (Tier: ", setup.score.tier, ")");
        }
      else
        {
         Print("[WARN] ResearchMode: Failed to open file: ", fname);
        }

      // Add to open tracking list
      if(m_open_count < MAX_RESEARCH_SETUPS)
        {
         m_open_setups[m_open_count] = setup;
         m_open_count++;
        }
     }

   // Updates outcomes for all active simulated setups
   static void UpdateOutcome(string symbol, datetime bar_time, double high, double low)
     {
      for(int i = 0; i < m_open_count; i++)
        {
         if(m_open_setups[i].symbol != symbol || m_open_setups[i].outcome_finalized)
            continue;

         bool is_buy = (m_open_setups[i].direction == "BUY");

         if(is_buy)
           {
            if(low <= m_open_setups[i].sl)
              {
               m_open_setups[i].sim_outcome = "SL_HIT";
               m_open_setups[i].outcome_finalized = true;
               Print("[ResearchMode] Setup ", m_open_setups[i].setup_id, " finalized: SL_HIT");
              }
            else if(m_open_setups[i].tp2 > 0.0 && high >= m_open_setups[i].tp2)
              {
               m_open_setups[i].sim_outcome = "TP2_HIT";
               m_open_setups[i].outcome_finalized = true;
               Print("[ResearchMode] Setup ", m_open_setups[i].setup_id, " finalized: TP2_HIT");
              }
            else if(m_open_setups[i].tp1 > 0.0 && high >= m_open_setups[i].tp1)
              {
               m_open_setups[i].sim_outcome = "TP1_HIT";
              }
           }
         else // SELL
           {
            if(high >= m_open_setups[i].sl)
              {
               m_open_setups[i].sim_outcome = "SL_HIT";
               m_open_setups[i].outcome_finalized = true;
               Print("[ResearchMode] Setup ", m_open_setups[i].setup_id, " finalized: SL_HIT");
              }
            else if(m_open_setups[i].tp2 > 0.0 && low <= m_open_setups[i].tp2)
              {
               m_open_setups[i].sim_outcome = "TP2_HIT";
               m_open_setups[i].outcome_finalized = true;
               Print("[ResearchMode] Setup ", m_open_setups[i].setup_id, " finalized: TP2_HIT");
              }
            else if(m_open_setups[i].tp1 > 0.0 && low <= m_open_setups[i].tp1)
              {
               m_open_setups[i].sim_outcome = "TP1_HIT";
              }
           }

         // Expiration after 5 days
         if(!m_open_setups[i].outcome_finalized && (bar_time - m_open_setups[i].detected_at > 86400 * 5))
           {
            m_open_setups[i].sim_outcome = "EXPIRED";
            m_open_setups[i].outcome_finalized = true;
           }
        }
     }

   // Polls outcomes on current bar rates
   static void CheckAllOutcomes(ENUM_TIMEFRAMES tf)
     {
      if(m_open_count == 0) return;
      MqlRates rates[];
      if(CopyRates(_Symbol, tf, 0, 2, rates) >= 1)
        {
         UpdateOutcome(_Symbol, rates[0].time, rates[0].high, rates[0].low);
        }
     }
  };

// Static member definitions
ResearchSetup ResearchMode::m_open_setups[MAX_RESEARCH_SETUPS];
int           ResearchMode::m_open_count = 0;
string        ResearchMode::m_current_filename = "";
