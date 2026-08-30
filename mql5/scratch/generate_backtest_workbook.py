import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def create_workbook():
    wb = openpyxl.Workbook()
    # Remove default sheet
    default_sheet = wb.active
    wb.remove(default_sheet)

    # Styles
    font_family = "Segoe UI"
    header_font = Font(name=font_family, size=11, bold=True, color="FFFFFF")
    title_font = Font(name=font_family, size=16, bold=True, color="1F4E79")
    regular_font = Font(name=font_family, size=10)
    bold_font = Font(name=font_family, size=10, bold=True)
    
    header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    accent_fill = PatternFill(start_color="DDEBF7", end_color="DDEBF7", fill_type="solid")
    zebra_fill = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")
    green_fill = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
    red_fill = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")

    thin_border_side = Side(border_style="thin", color="D9D9D9")
    thin_border = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
    thick_bottom_side = Side(border_style="medium", color="1F4E79")
    header_border = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thick_bottom_side)

    # Helper function to auto-adjust column widths
    def autofit_cols(ws):
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                val = str(cell.value or '')
                if val.startswith('='): # skip formulas for width calculation
                    max_len = max(max_len, 10)
                else:
                    max_len = max(max_len, len(val))
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    # Strategies and Preset files mapping
    strategies = [
        ("ICT Sniper", "HolyGrail_Phase3_Result.set"),
        ("ICT Scalper", "XAUUSD_M15_Scalper.set"),
        ("Mean Reversion", "HolyGrail_Phase3_Result.set"),
        ("Breakout", "XAUUSD_M15_Breakout.set"),
        ("Momentum Scalper", "MomentumScalper_Optimize_Grid.set")
    ]

    timeframes = ["M1", "M15", "H1"]
    modes = ["Single Position", "Partial Exit", "Grid Recovery"]

    # ==================== SUMMARY DASHBOARD ====================
    ws_dash = wb.create_sheet(title="Dashboard")
    ws_dash.views.sheetView[0].showGridLines = True
    ws_dash.cell(row=1, column=1, value="AdaptiveICT Backtest Master Dashboard").font = title_font
    
    dash_headers = ["Strategy Name", "Best Timeframe", "Best Position Mode", "Max Backtest Profit", "Max Drawdown (%)", "Status Notes"]
    for col_num, h in enumerate(dash_headers, 1):
        cell = ws_dash.cell(row=3, column=col_num, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = header_border

    dash_rows = [
        ("ICT Sniper", "Pending", "Pending", "", "", "Needs baseline testing."),
        ("ICT Scalper", "Pending", "Pending", "", "", "Needs baseline testing."),
        ("Mean Reversion", "H1 / M15", "Partial Exit", 3000000.00, "Unknown", "Confirmed $3M optimization run. Need to locate specific drawdowns."),
        ("Breakout", "Pending", "Pending", "", "", "Needs baseline testing."),
        ("Momentum Scalper", "M1", "Grid Recovery", 41263.44, 32.8, "High-frequency optimization completed successfully.")
    ]

    for row_idx, row_data in enumerate(dash_rows, 4):
        for col_idx, val in enumerate(row_data, 1):
            cell = ws_dash.cell(row=row_idx, column=col_idx, value=val)
            cell.font = regular_font
            cell.border = thin_border
            if col_idx in [2, 3]:
                cell.alignment = Alignment(horizontal="center")
            if col_idx == 4 and val:
                cell.number_format = '$#,##0.00'
                cell.alignment = Alignment(horizontal="right")
                cell.font = bold_font
            if col_idx == 5 and val:
                cell.number_format = '0.0"%"'
                cell.alignment = Alignment(horizontal="right")
                
    autofit_cols(ws_dash)

    # ==================== INDIVIDUAL STRATEGY MATRICES ====================
    for strat_name, default_preset in strategies:
        ws = wb.create_sheet(title=strat_name)
        ws.views.sheetView[0].showGridLines = True
        
        ws.cell(row=1, column=1, value=f"{strat_name} - Backtest Matrix").font = title_font
        
        headers = [
            "Status", "Strategy Mode", "Timeframe", "Target Preset File", "Testing Period", 
            "Start Balance", "End Balance", "Net Profit", "Max Drawdown (%)", 
            "Total Trades", "Win Rate (%)", "Profit Factor", "Notes"
        ]
        
        for col_num, h in enumerate(headers, 1):
            cell = ws.cell(row=3, column=col_num, value=h)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = header_border
            
        row_idx = 4
        for mode in modes:
            for tf in timeframes:
                ws.cell(row=row_idx, column=1, value="PENDING").alignment = Alignment(horizontal="center")
                ws.cell(row=row_idx, column=2, value=mode)
                ws.cell(row=row_idx, column=3, value=tf).alignment = Alignment(horizontal="center")
                ws.cell(row=row_idx, column=4, value=default_preset)
                ws.cell(row=row_idx, column=5, value="Jan 2026 - Present")
                
                # Start balance
                ws.cell(row=row_idx, column=6, value=10000.00).number_format = '$#,##0.00'
                ws.cell(row=row_idx, column=6).alignment = Alignment(horizontal="right")
                
                # End balance
                ws.cell(row=row_idx, column=7).number_format = '$#,##0.00'
                ws.cell(row=row_idx, column=7).alignment = Alignment(horizontal="right")
                
                # Net profit formula
                np_cell = ws.cell(row=row_idx, column=8, value=f"=G{row_idx}-F{row_idx}")
                np_cell.font = bold_font
                np_cell.number_format = '$#,##0.00'
                np_cell.alignment = Alignment(horizontal="right")
                
                # Formatting remaining blank inputs
                ws.cell(row=row_idx, column=9).number_format = '0.0"%"'
                ws.cell(row=row_idx, column=10).number_format = '#,##0'
                ws.cell(row=row_idx, column=11).number_format = '0.0"%"'
                ws.cell(row=row_idx, column=12).number_format = '0.00'
                
                for c in range(1, 14):
                    ws.cell(row=row_idx, column=c).border = thin_border
                    ws.cell(row=row_idx, column=c).font = regular_font
                    
                row_idx += 1
                
        autofit_cols(ws)

    # ==================== EXPERIMENT LOG ====================
    ws_log = wb.create_sheet(title="Experiment Log")
    ws_log.views.sheetView[0].showGridLines = True
    ws_log.cell(row=1, column=1, value="AdaptiveICT - Version Control & Experiment Log").font = title_font
    
    headers_log = [
        "Test ID", "Strategy", "TF", "Version", "Change Description", 
        "Start Balance", "End Balance", "Net Profit", "Profit Factor", 
        "Max Drawdown (%)", "Trades", "Win Rate (%)", "Result", 
        "Preset File", "Detailed Parameter Changes"
    ]
    for col_num, h in enumerate(headers_log, 1):
        cell = ws_log.cell(row=3, column=col_num, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = header_border

    # Sample rows for visualization
    sample_log_data = [
        ("M001", "Momentum Scalper", "M1", "V1", "Baseline", 10000.00, 10000.00, 0.82, 18.0, 4821, 45.0, "FAIL", "MomentumScalper_Safe_Single_V1.set", "Baseline parameters"),
        ("R001", "Mean Reversion", "M15", "V1", "Phase 3 Grid Combined Test", 10000.00, 3010000.00, 3.12, 15.0, 8912, 62.0, "IMPROVED", "HolyGrail_Phase3_Result.set", "Optimized lookback, confluence & partial exits")
    ]

    for row_idx, row_data in enumerate(sample_log_data, 4):
        ws_log.cell(row=row_idx, column=1, value=row_data[0]).alignment = Alignment(horizontal="center")
        ws_log.cell(row=row_idx, column=2, value=row_data[1])
        ws_log.cell(row=row_idx, column=3, value=row_data[2]).alignment = Alignment(horizontal="center")
        ws_log.cell(row=row_idx, column=4, value=row_data[3]).alignment = Alignment(horizontal="center")
        ws_log.cell(row=row_idx, column=5, value=row_data[4])
        
        # Start & End Balance
        ws_log.cell(row=row_idx, column=6, value=row_data[5]).number_format = '$#,##0.00'
        ws_log.cell(row=row_idx, column=7, value=row_data[6]).number_format = '$#,##0.00'
        
        # Net Profit Formula
        np_cell = ws_log.cell(row=row_idx, column=8, value=f"=G{row_idx}-F{row_idx}")
        np_cell.font = bold_font
        np_cell.number_format = '$#,##0.00'
        
        # PF, DD, Trades, Win Rate
        ws_log.cell(row=row_idx, column=9, value=row_data[7]).number_format = '0.00'
        ws_log.cell(row=row_idx, column=10, value=row_data[8]).number_format = '0.0"%"'
        ws_log.cell(row=row_idx, column=11, value=row_data[9]).number_format = '#,##0'
        ws_log.cell(row=row_idx, column=12, value=row_data[10]).number_format = '0.0"%"'
        
        # Result Status Formatting
        res_cell = ws_log.cell(row=row_idx, column=13, value=row_data[11])
        res_cell.alignment = Alignment(horizontal="center")
        if row_data[11] == "FAIL":
            res_cell.fill = red_fill
            res_cell.font = Font(name=font_family, size=10, bold=True, color="C00000")
        else:
            res_cell.fill = green_fill
            res_cell.font = Font(name=font_family, size=10, bold=True, color="375623")
            
        ws_log.cell(row=row_idx, column=14, value=row_data[12])
        ws_log.cell(row=row_idx, column=15, value=row_data[13])

        for c in range(1, 16):
            cell = ws_log.cell(row=row_idx, column=c)
            cell.border = thin_border
            cell.font = regular_font
            if c not in [1, 3, 4, 13]:
                if c in [6, 7, 8, 9, 10, 11, 12]:
                    cell.alignment = Alignment(horizontal="right")
                else:
                    cell.alignment = Alignment(horizontal="left")

    autofit_cols(ws_log)

    # ==================== TRADE ANALYSIS ====================
    ws_ta = wb.create_sheet(title="Trade Analysis")
    ws_ta.views.sheetView[0].showGridLines = True
    ws_ta.cell(row=1, column=1, value="AdaptiveICT - Detailed Trade Analysis").font = title_font
    
    headers_ta = [
        "Test ID", "Avg Trade Duration", "Avg Profit / Trade", "Avg Loss / Trade", 
        "Avg Spread (pips)", "Commission / Lot", "Slippage (pips)", "Best Trading Session", 
        "Worst Trading Session", "Losing Trade Patterns Detected"
    ]
    for col_num, h in enumerate(headers_ta, 1):
        cell = ws_ta.cell(row=3, column=col_num, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = header_border
        
    autofit_cols(ws_ta)

    # ==================== FINAL CANDIDATES ====================
    ws_fc = wb.create_sheet(title="Final Candidates")
    ws_fc.views.sheetView[0].showGridLines = True
    ws_fc.cell(row=1, column=1, value="AdaptiveICT - Live Demo & Production Candidates").font = title_font
    
    headers_fc = [
        "Status", "Candidate Preset File", "Strategy Mode", "Timeframe", 
        "Net Profit (BT)", "Max Drawdown (%)", "Profit Factor", 
        "Live Demo Start Date", "Demo Performance", "Status Notes"
    ]
    for col_num, h in enumerate(headers_fc, 1):
        cell = ws_fc.cell(row=3, column=col_num, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = header_border

    autofit_cols(ws_fc)

    # Save Workbook
    wb.save("d:\\FOR RENDO (ONLY )\\Personal Project\Dashboard\\mql5\\AdaptiveICT_Backtest_Lab.xlsx")
    print("Multi-Strategy AdaptiveICT_Backtest_Lab.xlsx successfully generated!")

if __name__ == "__main__":
    create_workbook()
