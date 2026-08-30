import os

graph_dir = r"d:\FOR RENDO (ONLY )\Personal Project\Dashboard\mql5\Graph"
files = {
    "Baseline_ICT_Scalper": "baseline_ict_scalper.set.csv",
    "Baseline_ICT_Sniper": "baseline_ict_sniper.set.csv",
    "Baseline_MomentumScalper": "baseline_momentumscalper.csv"
}

def analyze_curve(file_path):
    if not os.path.exists(file_path):
        return None
        
    dates = []
    balances = []
    equities = []
    
    # Files are tab-separated, might have UTF-16LE or UTF-8
    content = ""
    try:
        with open(file_path, 'r', encoding='utf-16') as f:
            content = f.read()
    except Exception:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception:
            with open(file_path, 'r', encoding='latin-1') as f:
                content = f.read()

    lines = content.strip().split('\n')
    header_found = False
    
    for line in lines:
        if not line.strip():
            continue
        parts = line.split('\t')
        if len(parts) >= 3:
            if "<DATE>" in parts[0] or "DATE" in parts[0]:
                header_found = True
                continue
            
            try:
                date_str = parts[0].strip()
                balance = float(parts[1].strip())
                equity = float(parts[2].strip())
                
                dates.append(date_str)
                balances.append(balance)
                equities.append(equity)
            except ValueError:
                continue

    if not equities:
        return None

    start_balance = balances[0]
    end_balance = balances[-1]
    net_profit = end_balance - start_balance
    
    start_equity = equities[0]
    end_equity = equities[-1]
    net_equity_profit = end_equity - start_equity

    # Calculate Drawdown based on Equity
    max_equity = -999999999.0
    max_dd_usd = 0.0
    max_dd_pct = 0.0
    
    for eq in equities:
        if eq > max_equity:
            max_equity = eq
        dd_usd = max_equity - eq
        dd_pct = (dd_usd / max_equity) * 100.0 if max_equity > 0 else 0.0
        
        if dd_usd > max_dd_usd:
            max_dd_usd = dd_usd
        if dd_pct > max_dd_pct:
            max_dd_pct = dd_pct

    return {
        "StartBalance": start_balance,
        "EndBalance": end_balance,
        "NetProfit": net_profit,
        "StartEquity": start_equity,
        "EndEquity": end_equity,
        "MaxDD_USD": max_dd_usd,
        "MaxDD_Pct": max_dd_pct,
        "PointsCount": len(equities),
        "FirstDate": dates[0],
        "LastDate": dates[-1]
    }

print("=== BASELINE GRAPH ANALYSIS (XAUUSD) ===")
print("-" * 60)

for name, filename in files.items():
    path = os.path.join(graph_dir, filename)
    res = analyze_curve(path)
    if res:
        print(f"Strategy: {name}")
        print(f"  Period:         {res['FirstDate']} to {res['LastDate']}")
        print(f"  Start Balance:  ${res['StartBalance']:.2f}")
        print(f"  End Balance:    ${res['EndBalance']:.2f}")
        print(f"  Net Profit:     ${res['NetProfit']:.2f}")
        print(f"  Max Equity DD:  ${res['MaxDD_USD']:.2f} ({res['MaxDD_Pct']:.2f}%)")
        print(f"  Activity (pts): {res['PointsCount']} data points")
        print("-" * 60)
    else:
        print(f"Strategy: {name} - FILE NOT FOUND OR EMPTY")
        print("-" * 60)
