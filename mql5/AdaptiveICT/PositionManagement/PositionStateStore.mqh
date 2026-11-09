//+------------------------------------------------------------------+
//|                                            PositionStateStore.mqh|
//|                                  Copyright 2026, AdaptiveICT     |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

#include "../Core/Types.mqh"
#include "../Core/Config.mqh"

//+------------------------------------------------------------------+
//| Persist position-manager trade state across EA restarts.         |
//| Without this, a restart re-synthesizes 1R/1.5R targets from the  |
//| CURRENT stop distance (which may already be at BE or trailed),   |
//| corrupting the exit ladder mid-trade. One flat text file per     |
//| (magic, manager mode); skipped entirely in Strategy Tester.      |
//+------------------------------------------------------------------+
string PMStateFileName(const string mode_tag)
  {
   return "AdaptiveICT_PM_" + IntegerToString(InpMagic) + "_" + mode_tag + ".txt";
  }

//+------------------------------------------------------------------+
//| Save the live state array to disk                                |
//+------------------------------------------------------------------+
void PMStateSave(const string mode_tag, const MqlPositionState &states[], const int count)
  {
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)) return;
   
   int fh = FileOpen(PMStateFileName(mode_tag), FILE_WRITE|FILE_TXT|FILE_ANSI);
   if(fh == INVALID_HANDLE) return;
   
   for(int i = 0; i < count; i++)
     {
      string line = IntegerToString((long)states[i].ticket) + ";" +
                    (states[i].tp1_hit ? "1" : "0") + ";" +
                    (states[i].tp2_hit ? "1" : "0") + ";" +
                    DoubleToString(states[i].original_sl, 8) + ";" +
                    DoubleToString(states[i].tp1, 8) + ";" +
                    DoubleToString(states[i].tp2, 8) + ";" +
                    DoubleToString(states[i].tp3, 8) + ";" +
                    IntegerToString((long)states[i].last_health_bar);
      FileWrite(fh, line);
     }
   FileClose(fh);
  }

//+------------------------------------------------------------------+
//| Load raw state rows from disk (count = rows read, 0 on failure)  |
//+------------------------------------------------------------------+
int PMStateLoad(const string mode_tag, MqlPositionState &states[])
  {
   if(MQLInfoInteger(MQL_TESTER) || MQLInfoInteger(MQL_OPTIMIZATION)) return 0;
   
   string fname = PMStateFileName(mode_tag);
   if(!FileIsExist(fname)) return 0;
   
   int fh = FileOpen(fname, FILE_READ|FILE_TXT|FILE_ANSI);
   if(fh == INVALID_HANDLE) return 0;
   
   ArrayFree(states);
   int count = 0;
   while(!FileIsEnding(fh) && count < 100)
     {
      string line = FileReadString(fh);
      if(StringLen(line) == 0) continue;
      
      string parts[];
      if(StringSplit(line, ';', parts) < 8) continue;
      
      ArrayResize(states, count + 1);
      states[count].ticket          = (ulong)StringToInteger(parts[0]);
      states[count].tp1_hit         = (parts[1] == "1");
      states[count].tp2_hit         = (parts[2] == "1");
      states[count].original_sl     = StringToDouble(parts[3]);
      states[count].tp1             = StringToDouble(parts[4]);
      states[count].tp2             = StringToDouble(parts[5]);
      states[count].tp3             = StringToDouble(parts[6]);
      states[count].last_health_bar = (datetime)StringToInteger(parts[7]);
      count++;
     }
   FileClose(fh);
   return count;
  }