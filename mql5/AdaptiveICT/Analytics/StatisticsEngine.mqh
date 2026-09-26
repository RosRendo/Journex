//+------------------------------------------------------------------+
//|                                             StatisticsEngine.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Types.mqh"

//+------------------------------------------------------------------+
//| Struct holding statistics for a specific score band               |
//+------------------------------------------------------------------+
struct ScoreBandStat
  {
   int      band_min;
   int      band_max;
   string   band_label;      // "50-59", "60-69", "70-79", "80-89", "90-100"
   int      count;
   int      wins;
   int      losses;
   double   win_rate;        // %
   double   sum_win_r;
   double   avg_win_r;
   double   sum_loss_r;
   double   avg_loss_r;
   double   expectancy;      // (wr * avgWinR) - (lr * avgLossR)
   double   profit_factor;
   double   sum_mae;
   double   avg_mae;
   double   sum_mfe;
   double   avg_mfe;
  };

//+------------------------------------------------------------------+
//| Struct holding statistics for setup combinations                  |
//+------------------------------------------------------------------+
struct SetupComboStat
  {
   string   combo_key;
   int      count;
   int      wins;
   int      losses;
   double   sum_win_r;
   double   sum_loss_r;
   double   win_rate;
   double   expectancy;
   double   profit_factor;
  };

//+------------------------------------------------------------------+
//| T045: Statistics Engine for Score-Band Validation                |
//| Maps to: FR-037, FR-038                                          |
//+------------------------------------------------------------------+
class StatisticsEngine
  {
private:
   static ScoreBandStat   g_band_stats[5];
   static SetupComboStat  g_combo_stats[20];
   static int             g_combo_count;
   static bool            g_model_validated;
   static int             g_total_trades_analyzed;

   // Helper to initialize the 5 standard score bands
   static void InitBands()
     {
      g_band_stats[0].band_min = 50;  g_band_stats[0].band_max = 59;  g_band_stats[0].band_label = "50-59";
      g_band_stats[1].band_min = 60;  g_band_stats[1].band_max = 69;  g_band_stats[1].band_label = "60-69";
      g_band_stats[2].band_min = 70;  g_band_stats[2].band_max = 79;  g_band_stats[2].band_label = "70-79";
      g_band_stats[3].band_min = 80;  g_band_stats[3].band_max = 89;  g_band_stats[3].band_label = "80-89";
      g_band_stats[4].band_min = 90;  g_band_stats[4].band_max = 100; g_band_stats[4].band_label = "90-100";

      for(int i = 0; i < 5; i++)
        {
         g_band_stats[i].count         = 0;
         g_band_stats[i].wins          = 0;
         g_band_stats[i].losses        = 0;
         g_band_stats[i].win_rate      = 0.0;
         g_band_stats[i].sum_win_r     = 0.0;
         g_band_stats[i].avg_win_r     = 0.0;
         g_band_stats[i].sum_loss_r    = 0.0;
         g_band_stats[i].avg_loss_r    = 0.0;
         g_band_stats[i].expectancy    = 0.0;
         g_band_stats[i].profit_factor = 0.0;
         g_band_stats[i].sum_mae       = 0.0;
         g_band_stats[i].avg_mae       = 0.0;
         g_band_stats[i].sum_mfe       = 0.0;
         g_band_stats[i].avg_mfe       = 0.0;
        }

      g_combo_count = 0;
      ZeroMemory(g_combo_stats);
      g_total_trades_analyzed = 0;
      g_model_validated = false;
     }

   // Update setup combination aggregates
   static void UpdateCombo(string key, double final_r)
     {
      int found = -1;
      for(int i = 0; i < g_combo_count; i++)
        {
         if(g_combo_stats[i].combo_key == key)
           {
            found = i;
            break;
           }
        }
      if(found < 0 && g_combo_count < 20)
        {
         found = g_combo_count;
         g_combo_stats[found].combo_key = key;
         g_combo_stats[found].count = 0;
         g_combo_stats[found].wins = 0;
         g_combo_stats[found].losses = 0;
         g_combo_stats[found].sum_win_r = 0.0;
         g_combo_stats[found].sum_loss_r = 0.0;
         g_combo_count++;
        }
      if(found >= 0)
        {
         g_combo_stats[found].count++;
         if(final_r > 0)
           {
            g_combo_stats[found].wins++;
            g_combo_stats[found].sum_win_r += final_r;
           }
         else
           {
            g_combo_stats[found].losses++;
            g_combo_stats[found].sum_loss_r += MathAbs(final_r);
           }
        }
     }

   // Write statistical report CSV
   static void WriteStatsCSV()
     {
      MqlDateTime dt;
      TimeCurrent(dt);
      string date_str = StringFormat("%04d%02d%02d", dt.year, dt.mon, dt.day);
      string filename = StringFormat("STATS_%s_%s.csv", _Symbol, date_str);
      int h = FileOpen(filename, FILE_WRITE|FILE_CSV|FILE_ANSI|FILE_COMMON, ',');
      if(h == INVALID_HANDLE)
        {
         h = FileOpen(filename, FILE_WRITE|FILE_CSV|FILE_ANSI, ',');
        }
      if(h == INVALID_HANDLE) return;

      string hdr = "Band,Count,Wins,Losses,WinRatePct,AvgWinR,AvgLossR,ExpectancyR,ProfitFactor,AvgMAER,AvgMFER";
      FileWriteString(h, hdr + "\r\n");

      for(int b = 0; b < 5; b++)
        {
         string row = StringFormat("%s,%d,%d,%d,%.2f,%.4f,%.4f,%.4f,%.2f,%.4f,%.4f",
                                   g_band_stats[b].band_label,
                                   g_band_stats[b].count,
                                   g_band_stats[b].wins,
                                   g_band_stats[b].losses,
                                   g_band_stats[b].win_rate,
                                   g_band_stats[b].avg_win_r,
                                   g_band_stats[b].avg_loss_r,
                                   g_band_stats[b].expectancy,
                                   g_band_stats[b].profit_factor,
                                   g_band_stats[b].avg_mae,
                                   g_band_stats[b].avg_mfe);
         FileWriteString(h, row + "\r\n");
        }

      FileWriteString(h, "\r\nSetupCombination,Count,Wins,Losses,WinRatePct,ExpectancyR,ProfitFactor\r\n");
      for(int c = 0; c < g_combo_count; c++)
        {
         string row = StringFormat("%s,%d,%d,%d,%.2f,%.4f,%.2f",
                                   g_combo_stats[c].combo_key,
                                   g_combo_stats[c].count,
                                   g_combo_stats[c].wins,
                                   g_combo_stats[c].losses,
                                   g_combo_stats[c].win_rate,
                                   g_combo_stats[c].expectancy,
                                   g_combo_stats[c].profit_factor);
         FileWriteString(h, row + "\r\n");
        }

      FileClose(h);
      Print("[StatisticsEngine] Stats report written to ", filename, " (Model Validated: ", g_model_validated ? "YES" : "NO", ")");
     }

   // Print summary to MT5 Journal
   static void PrintJournalSummary()
     {
      Print("==========================================================================");
      Print("[StatisticsEngine] SCORE-BAND STATISTICAL VALIDATION REPORT");
      Print(StringFormat("Total Trades Analyzed: %d | Model Status: %s",
                         g_total_trades_analyzed,
                         g_model_validated ? "VALIDATED (Higher Risk Tiers Permitted)" : "UNVALIDATED (Capped at NORMAL Risk)"));
      Print("Band     Count  Wins Losses WinRate   AvgWinR   AvgLossR  Expectancy  PF");
      Print("--------------------------------------------------------------------------");
      for(int b = 0; b < 5; b++)
        {
         Print(StringFormat("%-8s %-6d %-4d %-6d %-8.1f%% %-9.2f %-9.2f %-11.2f %.2f",
                            g_band_stats[b].band_label,
                            g_band_stats[b].count,
                            g_band_stats[b].wins,
                            g_band_stats[b].losses,
                            g_band_stats[b].win_rate,
                            g_band_stats[b].avg_win_r,
                            g_band_stats[b].avg_loss_r,
                            g_band_stats[b].expectancy,
                            g_band_stats[b].profit_factor));
        }
      Print("==========================================================================");
     }

public:
   //+------------------------------------------------------------------+
   //| ComputeBandStats: Parse trade log and calculate band statistics  |
   //+------------------------------------------------------------------+
   static void ComputeBandStats()
     {
      InitBands();

      int file_flags = FILE_READ|FILE_CSV|FILE_ANSI|FILE_COMMON;
      string filename = "AdaptiveICT_TradeAnalytics_v4.csv";
      int handle = FileOpen(filename, file_flags, ',');
      if(handle == INVALID_HANDLE)
        {
         file_flags = FILE_READ|FILE_CSV|FILE_ANSI;
         handle = FileOpen(filename, file_flags, ',');
        }

      if(handle == INVALID_HANDLE)
        {
         Print("[StatisticsEngine] No trade analytics log found (", filename, "). Model remains UNVALIDATED.");
         g_model_validated = false;
         return;
        }

      // Skip header line
      if(!FileIsEnding(handle))
        {
         while(!FileIsLineEnding(handle) && !FileIsEnding(handle))
           {
            FileReadString(handle);
           }
        }

      int rows_processed = 0;
      while(!FileIsEnding(handle))
        {
         string fields[];
         ArrayResize(fields, 0);
         while(!FileIsEnding(handle))
           {
            string val = FileReadString(handle);
            int sz = ArraySize(fields);
            ArrayResize(fields, sz + 1);
            fields[sz] = val;
            if(FileIsLineEnding(handle)) break;
           }

         if(ArraySize(fields) < 20) continue;

         double final_r = (ArraySize(fields) > 19) ? StringToDouble(fields[19]) : 0.0;
         double peak_r  = (ArraySize(fields) > 20) ? StringToDouble(fields[20]) : 0.0;
         double mae_r   = (ArraySize(fields) > 26) ? StringToDouble(fields[26]) : 0.0;
         string strat   = (ArraySize(fields) > 6)  ? fields[6] : "DEFAULT";
         string setup   = (ArraySize(fields) > 7)  ? fields[7] : "";

         int score = 0;
         if(ArraySize(fields) > 69 && fields[69] != "")
            score = (int)StringToInteger(fields[69]);
         else if(ArraySize(fields) > 46 && fields[46] != "")
            score = (int)StringToInteger(fields[46]);
         else
            score = 70;

         int band_idx = -1;
         if(score >= 50 && score <= 59)      band_idx = 0;
         else if(score >= 60 && score <= 69) band_idx = 1;
         else if(score >= 70 && score <= 79) band_idx = 2;
         else if(score >= 80 && score <= 89) band_idx = 3;
         else if(score >= 90)                band_idx = 4;

         if(band_idx >= 0)
           {
            g_band_stats[band_idx].count++;
            if(final_r > 0)
              {
               g_band_stats[band_idx].wins++;
               g_band_stats[band_idx].sum_win_r += final_r;
              }
            else
              {
               g_band_stats[band_idx].losses++;
               g_band_stats[band_idx].sum_loss_r += MathAbs(final_r);
              }
            g_band_stats[band_idx].sum_mae += mae_r;
            g_band_stats[band_idx].sum_mfe += peak_r;
           }

         string combo_key = strat;
         if(setup != "") combo_key += "_" + setup;
         UpdateCombo(combo_key, final_r);

         rows_processed++;
        }
      FileClose(handle);

      g_total_trades_analyzed = rows_processed;

      // Compute statistics per band
      for(int b = 0; b < 5; b++)
        {
         if(g_band_stats[b].count > 0)
           {
            g_band_stats[b].win_rate = ((double)g_band_stats[b].wins / g_band_stats[b].count) * 100.0;
            g_band_stats[b].avg_win_r = (g_band_stats[b].wins > 0) ? (g_band_stats[b].sum_win_r / g_band_stats[b].wins) : 0.0;
            g_band_stats[b].avg_loss_r = (g_band_stats[b].losses > 0) ? (g_band_stats[b].sum_loss_r / g_band_stats[b].losses) : 0.0;
            double wr = g_band_stats[b].win_rate / 100.0;
            double lr = 1.0 - wr;
            g_band_stats[b].expectancy = (wr * g_band_stats[b].avg_win_r) - (lr * g_band_stats[b].avg_loss_r);
            g_band_stats[b].profit_factor = (g_band_stats[b].sum_loss_r > 0) ? (g_band_stats[b].sum_win_r / g_band_stats[b].sum_loss_r) : ((g_band_stats[b].sum_win_r > 0) ? 999.0 : 0.0);
            g_band_stats[b].avg_mae = g_band_stats[b].sum_mae / g_band_stats[b].count;
            g_band_stats[b].avg_mfe = g_band_stats[b].sum_mfe / g_band_stats[b].count;
           }
        }

      // Compute combo stats
      for(int c = 0; c < g_combo_count; c++)
        {
         if(g_combo_stats[c].count > 0)
           {
            g_combo_stats[c].win_rate = ((double)g_combo_stats[c].wins / g_combo_stats[c].count) * 100.0;
            double avg_w = (g_combo_stats[c].wins > 0) ? (g_combo_stats[c].sum_win_r / g_combo_stats[c].wins) : 0.0;
            double avg_l = (g_combo_stats[c].losses > 0) ? (g_combo_stats[c].sum_loss_r / g_combo_stats[c].losses) : 0.0;
            double wr = g_combo_stats[c].win_rate / 100.0;
            double lr = 1.0 - wr;
            g_combo_stats[c].expectancy = (wr * avg_w) - (lr * avg_l);
            g_combo_stats[c].profit_factor = (g_combo_stats[c].sum_loss_r > 0) ? (g_combo_stats[c].sum_win_r / g_combo_stats[c].sum_loss_r) : ((g_combo_stats[c].sum_win_r > 0) ? 999.0 : 0.0);
           }
        }

      // Model Validation: Bands 80-89 & 90-100 outperform 60-69 in expectancy
      int high_count = g_band_stats[3].count + g_band_stats[4].count;
      int mid_count  = g_band_stats[1].count;
      double high_exp = 0.0;
      if(high_count > 0)
        {
         high_exp = (g_band_stats[3].expectancy * g_band_stats[3].count + g_band_stats[4].expectancy * g_band_stats[4].count) / high_count;
        }
      double mid_exp = g_band_stats[1].expectancy;

      if(high_count >= 5 && mid_count >= 5 && high_exp > mid_exp && high_exp > 0.0)
        {
         g_model_validated = true;
        }
      else
        {
         g_model_validated = false;
        }

      WriteStatsCSV();
      PrintJournalSummary();
     }

   //+------------------------------------------------------------------+
   //| IsModelValidated: Returns true if higher bands outperform mid    |
   //+------------------------------------------------------------------+
   static bool IsModelValidated()
     {
      static bool initialized = false;
      if(!initialized)
        {
         initialized = true;
         ComputeBandStats();
        }
      return g_model_validated;
     }

   //+------------------------------------------------------------------+
   //| GetBandStat: Accessor for individual band statistics             |
   //+------------------------------------------------------------------+
   static ScoreBandStat GetBandStat(int index)
     {
      if(index >= 0 && index < 5) return g_band_stats[index];
      ScoreBandStat empty;
      ZeroMemory(empty);
      return empty;
     }

   static int GetTotalTradesAnalyzed() { return g_total_trades_analyzed; }
  };

// Initialize static members
ScoreBandStat   StatisticsEngine::g_band_stats[5];
SetupComboStat  StatisticsEngine::g_combo_stats[20];
int             StatisticsEngine::g_combo_count = 0;
bool            StatisticsEngine::g_model_validated = false;
int             StatisticsEngine::g_total_trades_analyzed = 0;
