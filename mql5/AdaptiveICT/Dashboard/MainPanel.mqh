//+------------------------------------------------------------------+
//|                                                    MainPanel.mqh |
//|                                  Copyright 2026, AdaptiveICT     |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, AdaptiveICT"
#property link      "https://www.mql5.com"
#property version   "1.00"

#include "../Core/StateManager.mqh"
#include "../Market/Session.mqh"
#include "../Market/MarketRegime.mqh"
#include "../Risk/RiskManager.mqh"

//+------------------------------------------------------------------+
//| Create text labels for the on-chart dashboard                    |
//+------------------------------------------------------------------+
void CreateLabel(string name, string text, int x, int y, int size, color col, int anchor=ANCHOR_LEFT)
  {
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
      ObjectSetString(0, name, OBJPROP_FONT, "Consolas");
      ObjectSetInteger(0, name, OBJPROP_FONTSIZE, size);
      ObjectSetInteger(0, name, OBJPROP_ANCHOR, anchor);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_SELECTED, false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
     }
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetInteger(0, name, OBJPROP_COLOR, col);
   ObjectSetInteger(0, name, OBJPROP_CORNER, InpDashboardCorner);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
  }

//+------------------------------------------------------------------+
//| Create (or update) background panel rectangle                    |
//+------------------------------------------------------------------+
void CreateRect(string name, int x, int y, int width, int height, color bg_col, color border_col)
  {
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, name, OBJPROP_SELECTED,   false);
      ObjectSetInteger(0, name, OBJPROP_HIDDEN,     true);
     }
   ObjectSetInteger(0, name, OBJPROP_CORNER,     InpDashboardCorner);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE,   x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE,   y);
   ObjectSetInteger(0, name, OBJPROP_XSIZE,       width);
   ObjectSetInteger(0, name, OBJPROP_YSIZE,       height);
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR,     bg_col);
   ObjectSetInteger(0, name, OBJPROP_BORDER_COLOR,border_col);
  }

//+------------------------------------------------------------------+
//| Render clean 2-column table panel directly on chart              |
//+------------------------------------------------------------------+
void RenderChartPanel()
  {
   if(!InpShowDashboard)
     {
      ObjectsDeleteAll(0, "ea_panel_");
      return;
     }

   // ── Layout constants ──────────────────────────────────────────
   int px  = InpDashboardX; // panel left offset
   int py  = InpDashboardY; // panel top offset
   int pw  = 290;           // panel width
   int lh  = 15;            // line height
   int fx  = px + 12;       // text left margin
   int vx  = px + 130;      // value column x
   int cur_y = py + 10;

   // ── Colors ───────────────────────────────────────────────────
   color CLR_BG      = (color)0x0D0D0D;  // near-black panel
   color CLR_BORDER  = (color)0x2B2B2B;  // dark border
   color CLR_HDRBAR  = (color)0x181818;  // slightly lighter for header bg
   color CLR_SEP     = clrDimGray;       // separator lines
   color CLR_LABEL   = clrGray;          // left column (key) color
   color CLR_VALUE   = clrSilver;        // right column (value) color
   color CLR_TITLE   = clrWhite;         // title text
   color CLR_PINK    = (color)0xF755A8;  // section header pink
   color CLR_GREEN   = clrLime;
   color CLR_RED     = clrRed;
   color CLR_ORANGE  = clrOrange;

   // ── Helpers ────────────────────────────────────────────────
   string SEP = "─────────────────────────────────────";

   // ── HEADER BAR ────────────────────────────────────────────────
   CreateRect("ea_panel_hdrbar", px, py, pw, 36, CLR_HDRBAR, CLR_BORDER);

   CreateLabel("ea_panel_title",
               "  ADAPTIVE ICT EA",
               fx, cur_y, 9, CLR_TITLE);
   CreateLabel("ea_panel_titlesub",
               "v1.1",
               px + pw - 14, cur_y, 7, CLR_SEP, ANCHOR_RIGHT);
   cur_y += lh;

   string ea_status;
   color  ea_status_col;
   if(is_disabled)    { ea_status = "  DISABLED"; ea_status_col = CLR_RED;    }
   else if(is_paused) { ea_status = "  PAUSED";   ea_status_col = CLR_ORANGE; }
   else               { ea_status = "  RUNNING";  ea_status_col = CLR_GREEN;  }

   CreateLabel("ea_panel_status_dot", "●", fx,      cur_y, 8, ea_status_col);
   CreateLabel("ea_panel_status_txt", ea_status,   fx + 8, cur_y, 8, ea_status_col);
   CreateLabel("ea_panel_magic",
               "Magic: " + IntegerToString(InpMagic),
               px + pw - 14, cur_y, 7, CLR_SEP, ANCHOR_RIGHT);
   cur_y += lh + 6;

    // Render strategy type & position mode selection
    string strat_str = "Unknown";
    if(InpStrategyType == STRATEGY_ICT_SNIPER) strat_str = "ICT Sniper H1";
    else if(InpStrategyType == STRATEGY_ICT_SCALPER) strat_str = "ICT Scalper M15/M1";
    else if(InpStrategyType == STRATEGY_MEAN_REVERSION) strat_str = "Mean Reversion";
    else if(InpStrategyType == STRATEGY_BREAKOUT) strat_str = "Breakout";

    string mode_str = "Unknown";
    if(InpPositionMode == MODE_SINGLE) mode_str = "Single Target Exits";
    else if(InpPositionMode == MODE_PARTIAL_EXIT) mode_str = "Partial Exits (Path 3)";
    else if(InpPositionMode == MODE_GRID) mode_str = "Grid Recovery Mode";
   
   CreateLabel("ea_panel_strat_lbl", "  Strat", fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_strat_val", strat_str, vx, cur_y, 8, CLR_VALUE);
   cur_y += lh;
   
   CreateLabel("ea_panel_mode_lbl",  "  Mode",  fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_mode_val",  mode_str,  vx, cur_y, 8, CLR_VALUE);
   cur_y += lh + 6;

   // ── MAIN BACKGROUND (auto-sized after header) ─────────────────
   CreateRect("ea_panel_bg", px, py + 36, pw, 320, CLR_BG, CLR_BORDER);

   // ── MARKET CONTEXT ────────────────────────────────────────────
   CreateLabel("ea_panel_sep1",  SEP,             fx, cur_y, 7, CLR_BORDER); cur_y += lh - 3;
   CreateLabel("ea_panel_hdr1",  "  MARKET CONTEXT", fx, cur_y, 8, CLR_PINK);  cur_y += lh;

   CreateLabel("ea_panel_m1k", "  Symbol",       fx,  cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_m1v", _Symbol,           vx,  cur_y, 8, CLR_VALUE);  cur_y += lh;

   CreateLabel("ea_panel_m2k", "  Session",      fx,  cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_m2v", GetCurrentSession(), vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   string regime = GetMarketRegime();
   CreateLabel("ea_panel_m3k", "  Regime",       fx,  cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_m3v", regime,            vx,  cur_y, 8, CLR_VALUE);  cur_y += lh;

   string bias    = GetHTFBias();
   color  bias_col = (bias == "BULLISH") ? CLR_GREEN : CLR_RED;
   string bias_icon = (bias == "BULLISH") ? "▲  " : "▼  ";
   CreateLabel("ea_panel_m4k", "  HTF Bias",     fx,  cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_m4v", bias_icon + bias,  vx,  cur_y, 8, bias_col);   cur_y += lh;

   CreateLabel("ea_panel_m5k", "  Volatility",   fx,  cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_m5v", GetVolatility(),   vx,  cur_y, 8, CLR_VALUE);  cur_y += lh;

   // ── LAST SIGNAL ───────────────────────────────────────────────
   CreateLabel("ea_panel_sep2",  SEP,              fx, cur_y, 7, CLR_BORDER); cur_y += lh - 3;
   CreateLabel("ea_panel_hdr2",  "  LAST SIGNAL",  fx, cur_y, 8, CLR_PINK);  cur_y += lh;

   color  sig_col  = (last_sig_type == "BUY") ? CLR_GREEN
                   : (last_sig_type == "SELL") ? CLR_RED
                   : CLR_LABEL;
   string sig_icon = (last_sig_type == "BUY")  ? "▲  "
                   : (last_sig_type == "SELL") ? "▼  " : "";

   CreateLabel("ea_panel_s1k", "  Direction",  fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_s1v", sig_icon + last_sig_type, vx, cur_y, 8, sig_col); cur_y += lh;

   CreateLabel("ea_panel_s2k", "  Score",      fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_s2v",
               IntegerToString(last_sig_score) + " / 100   [" + last_sig_grade + "]",
               vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   CreateLabel("ea_panel_s3k", "  Timeframe",  fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_s3v", InpTimeframe,   vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   // ── PERFORMANCE ───────────────────────────────────────────────
   CreateLabel("ea_panel_sep3",  SEP,               fx, cur_y, 7, CLR_BORDER); cur_y += lh - 3;
   CreateLabel("ea_panel_hdr3",  "  PERFORMANCE",   fx, cur_y, 8, CLR_PINK);  cur_y += lh;

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   int    open_trades = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagic)
         open_trades++;

   int    today_trades = 0, today_wins = 0, today_losses = 0;
   double today_pnl = 0.0;
   GetTodayStats(today_trades, today_wins, today_losses, today_pnl);
   double today_pct = (balance > 0) ? (today_pnl / balance * 100.0) : 0.0;

   CreateLabel("ea_panel_p1k", "  Risk / Trade",   fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_p1v",
               DoubleToString(risk_percent, 1) + "%",
               vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   color  pnl_col = (today_pnl >= 0) ? CLR_GREEN : CLR_RED;
   string pnl_sign = (today_pnl >= 0) ? "+" : "";
   string pnl_str  = pnl_sign + DoubleToString(today_pct, 2) + "%  ($" + pnl_sign + DoubleToString(today_pnl, 2) + ")";
   CreateLabel("ea_panel_p2k", "  Daily P&L",   fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_p2v", pnl_str,          vx, cur_y, 8, pnl_col); cur_y += lh;

   CreateLabel("ea_panel_p3k", "  Open Trades",  fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_p3v",
               IntegerToString(open_trades) + " / " + IntegerToString(InpMaxOpenTrades),
               vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   CreateLabel("ea_panel_p4k", "  W / L Today",  fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_p4v",
               IntegerToString(today_wins) + "W   " + IntegerToString(today_losses) + "L",
               vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   // ── CONNECTION ────────────────────────────────────────────────
   CreateLabel("ea_panel_sep4",  SEP,              fx, cur_y, 7, CLR_BORDER); cur_y += lh - 3;
   CreateLabel("ea_panel_hdr4",  "  CONNECTION",   fx, cur_y, 8, CLR_PINK);  cur_y += lh;

   string conn_txt = bridge_connected ? "Connected"    : "Disconnected";
   color  conn_col = bridge_connected ? CLR_GREEN      : CLR_RED;
   CreateLabel("ea_panel_c1k", "  Bridge",    fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_c1dot", "●",          vx, cur_y, 8, conn_col);
   CreateLabel("ea_panel_c1v",   "  " + conn_txt, vx, cur_y, 8, conn_col); cur_y += lh;

   int hb_age = (last_report_time > 0) ? (int)(TimeCurrent() - last_report_time) : 0;
   CreateLabel("ea_panel_c2k", "  Heartbeat", fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_c2v",
               IntegerToString(hb_age) + "s ago",
               vx, cur_y, 8, (hb_age < 15) ? CLR_GREEN : CLR_ORANGE); cur_y += lh;

   string last_sig_str = (last_sig_time > 0)
                       ? TimeToString(last_sig_time, TIME_MINUTES|TIME_SECONDS)
                       : "--:--:--";
   CreateLabel("ea_panel_c3k", "  Last Signal", fx, cur_y, 8, CLR_LABEL);
   CreateLabel("ea_panel_c3v",  last_sig_str,   vx, cur_y, 8, CLR_VALUE); cur_y += lh;

   CreateLabel("ea_panel_sep5", SEP, fx, cur_y, 7, CLR_BORDER); cur_y += lh - 3;

   // ── Auto-resize main background to fit content ────────────────
   CreateRect("ea_panel_bg", px, py + 36, pw, cur_y - (py + 36) + 8, CLR_BG, CLR_BORDER);

   ChartRedraw();
  }
