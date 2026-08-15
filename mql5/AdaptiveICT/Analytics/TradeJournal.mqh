//+------------------------------------------------------------------+
//|                                                TradeJournal.mqh  |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"
#property once

//+------------------------------------------------------------------+
//| Trade Journal Logger class writing entries to a CSV file         |
//+------------------------------------------------------------------+
class TradeJournal
  {
public:
   //+------------------------------------------------------------------+
   //| Write a entry log to the journal file                            |
   //+------------------------------------------------------------------+
   static void LogEvent(string action, ulong ticket, string symbol, string type, double volume, double price, double sl, double tp, string comment)
     {
      string filename = "AdaptiveICT_TradeJournal_" + IntegerToString(InpMagic) + ".csv";
      int file_handle = FileOpen(filename, FILE_WRITE|FILE_READ|FILE_CSV|FILE_ANSI, ',');
      
      if(file_handle == INVALID_HANDLE)
        {
         Print("Failed to open TradeJournal file: ", filename);
         return;
        }
      
      // If the file is brand new/empty, write headers
      if(FileSize(file_handle) == 0)
        {
         FileWrite(file_handle, 
            "Timestamp", "Action", "Ticket", "Symbol", "Type", "Volume", "Price", "SL", "TP", "Comment"
         );
        }
      
      // Go to end of file
      FileSeek(file_handle, 0, SEEK_END);
      
      // Write entry
      FileWrite(file_handle,
         TimeToString(TimeCurrent(), TIME_DATE|TIME_MINUTES|TIME_SECONDS),
         action,
         IntegerToString(ticket),
         symbol,
         type,
         DoubleToString(volume, 2),
         DoubleToString(price, _Digits),
         DoubleToString(sl, _Digits),
         DoubleToString(tp, _Digits),
         comment
      );
      
      FileClose(file_handle);
     }
  };
