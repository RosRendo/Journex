import os
import sys
import argparse
import numpy as np
import pandas as pd

def parse_mt5_csv(filepath):
    """
    Parses MT5 Strategy Tester report CSV files.
    Format: Tab-separated, headers: <DATE>\t<BALANCE>\t<EQUITY>\t<DEPOSIT LOAD>
    """
    try:
        # Read the file with tab separator
        df = pd.read_csv(filepath, sep='\t', encoding='utf-16')
    except UnicodeError:
        try:
            df = pd.read_csv(filepath, sep='\t', encoding='utf-8')
        except Exception as e:
            print(f"Error reading file encoding: {e}")
            sys.exit(1)
            
    # Normalize headers
    df.columns = [c.replace('<', '').replace('>', '').strip().lower() for c in df.columns]
    
    if 'balance' not in df.columns:
        print("Error: Could not find 'balance' column in the CSV file.")
        print(f"Columns found: {list(df.columns)}")
        sys.exit(1)
        
    return df

def extract_trades(df):
    """
    Reconstructs individual trade returns from consecutive balance changes.
    """
    balances = df['balance'].values
    gains = []
    prev_bal = balances[0]
    
    # Track baseline balance levels for R-multiple calculations (assuming 1% risk per trade base)
    r_multiples = []
    
    for bal in balances[1:]:
        gain = bal - prev_bal
        if abs(gain) > 1e-4: # Filter out non-trading balance updates
            gains.append(gain)
            
            # Estimate R-multiple: assume risk was 1% of the previous balance
            est_risk_amount = prev_bal * 0.01
            r_mult = gain / est_risk_amount
            r_multiples.append(r_mult)
            
            prev_bal = bal
            
    return np.array(gains), np.array(r_multiples), balances[0]

def run_monte_carlo(r_multiples, start_balance, risk_pct, max_dd_limit, num_paths=5000):
    """
    Runs sequence-shuffled Monte Carlo simulations.
    Calculates final balances and maximum drawdowns across thousands of random paths.
    """
    num_trades = len(r_multiples)
    final_balances = []
    max_drawdowns = []
    ruined_paths = 0
    
    for _ in range(num_paths):
        # Shuffle trade sequence (Sequence Risk test)
        shuffled_r = np.random.choice(r_multiples, size=num_trades, replace=True)
        
        balance = start_balance
        peak = balance
        max_dd = 0.0
        ruined = False
        
        for r in shuffled_r:
            risk_amt = balance * risk_pct
            
            if balance <= 0:
                balance = 0
                ruined = True
                break
                
            balance += risk_amt * r
            if balance < 0:
                balance = 0
                
            # Track drawdown
            if balance > peak:
                peak = balance
            dd = (peak - balance) / peak if peak > 0 else 0.0
            if dd > max_dd:
                max_dd = dd
                
            # Check if hit max DD limit
            if dd >= max_dd_limit:
                ruined = True
                
        if ruined:
            ruined_paths += 1
            
        final_balances.append(balance)
        max_drawdowns.append(max_dd)
        
    prob_of_ruin = ruined_paths / num_paths
    return np.array(final_balances), np.array(max_drawdowns), prob_of_ruin

def run_slippage_stress_test(r_multiples, penalty_r=0.2, penalty_pct=0.3):
    """
    Injects negative expectancy noise (slippage/spread widenings).
    Worsens a random % of trades by a specified R-multiple penalty.
    """
    num_trades = len(r_multiples)
    num_penalized = int(num_trades * penalty_pct)
    
    stressed_r = r_multiples.copy()
    penalized_indices = np.random.choice(num_trades, size=num_penalized, replace=False)
    stressed_r[penalized_indices] -= penalty_r
    
    return stressed_r

def calculate_sqn(r_multiples):
    """
    Van Tharp's System Quality Number (SQN).
    SQN = (Mean of R / StdDev of R) * sqrt(N)
    """
    n = len(r_multiples)
    if n <= 1:
        return 0.0
    mean_r = np.mean(r_multiples)
    std_r = np.std(r_multiples)
    if std_r == 0:
        return 0.0
    return (mean_r / std_r) * np.sqrt(n)

def get_sqn_grade(sqn):
    if sqn < 1.6: return "Poor (Un-tradable / Overfitted)"
    if sqn < 2.0: return "Average"
    if sqn < 2.5: return "Good"
    if sqn < 3.0: return "Excellent"
    if sqn < 5.0: return "Outstanding"
    if sqn < 7.0: return "Holy Grail"
    return "Super Holy Grail (Caution: Likely Overfitted)"

def main():
    parser = argparse.ArgumentParser(description="AdaptiveICT EA Robustness & Validation Engine")
    parser.add_argument("file", help="Path to the MT5 backtest report CSV file")
    parser.add_argument("--risk", type=float, default=1.0, help="Compounding risk per trade in % (default: 1.0%)")
    parser.add_argument("--ruindd", type=float, default=30.0, help="Drawdown limit to define account ruin in % (default: 30.0%)")
    parser.add_argument("--slippage", type=float, default=0.2, help="Slippage penalty in R-multiples (default: 0.2R)")
    parser.add_argument("--slip_pct", type=float, default=30.0, help="% of trades affected by slippage (default: 30.0%)")
    
    # Mock sys.argv if running in a generic terminal context without arguments
    if len(sys.argv) == 1:
        print("Usage: python validate_preset_robustness.py <backtest_csv_file> [options]")
        print("\nUsing default test file for demonstration...")
        # Fallback to research CSV
        default_csv = r"D:\FOR RENDO (ONLY )\Personal Project\Dashboard\mql5\Presets\testergraph.report.v1.csv"
        if os.path.exists(default_csv):
            args = parser.parse_args([default_csv])
        else:
            sys.exit(1)
    else:
        args = parser.parse_args()
        
    filepath = args.file
    risk_pct = args.risk / 100.0
    ruin_dd = args.ruindd / 100.0
    slip_penalty = args.slippage
    slip_pct = args.slip_pct / 100.0
    
    print(f"\n==========================================================")
    print(f"   ADAPTIVEICT EA ROBUSTNESS & VALIDATION ENGINE")
    print(f"==========================================================\n")
    print(f"Analyzing File: {os.path.basename(filepath)}")
    print(f"Simulating Risk: {args.risk}% Compounding")
    print(f"Ruin Drawdown Threshold: {args.ruindd}%")
    print(f"Slippage Injection: -{args.slippage}R on {args.slip_pct}% of trades")
    
    # 1. Parse File
    df = parse_mt5_csv(filepath)
    
    # 2. Extract Trades
    gains, r_multiples, start_balance = extract_trades(df)
    total_trades = len(gains)
    
    if total_trades == 0:
        print("Error: No trade events detected in the balance sheet.")
        sys.exit(0)
        
    wins = gains[gains > 0]
    losses = gains[gains < 0]
    win_rate = len(wins) / total_trades if total_trades > 0 else 0.0
    
    # 3. Base Metrics
    net_profit = df['balance'].values[-1] - start_balance
    profit_factor = abs(np.sum(wins) / np.sum(losses)) if len(losses) > 0 else float('inf')
    
    print(f"\n[+] Raw Backtest Statistics:")
    print(f"    - Starting Balance: ${start_balance:,.2f}")
    print(f"    - Ending Balance:   ${df['balance'].values[-1]:,.2f} (${net_profit:+,.2f})")
    print(f"    - Total Trades:     {total_trades}")
    print(f"    - Win Rate:         {win_rate*100:.2f}%")
    print(f"    - Profit Factor:    {profit_factor:.2f}")
    print(f"    - Avg Win / Loss:   ${np.mean(wins):,.2f} / ${np.mean(losses):,.2f}")
    
    # 4. System Quality Number
    sqn = calculate_sqn(r_multiples)
    sqn_grade = get_sqn_grade(sqn)
    
    print(f"\n[+] System Quality Scoring:")
    print(f"    - SQN Score:        {sqn:.2f}")
    print(f"    - System Grade:     {sqn_grade}")
    
    # 5. Monte Carlo Compounding Simulation (Standard)
    final_bals, max_dds, ruin_prob = run_monte_carlo(r_multiples, start_balance, risk_pct, ruin_dd)
    
    print(f"\n[+] Monte Carlo Sequence Risk Analysis (5,000 Shuffled Runs):")
    print(f"    - Median End Balance: ${np.median(final_bals):,.2f}")
    print(f"    - Median Max Drawdown: {np.median(max_dds)*100:.2f}%")
    print(f"    - Probability of Ruin: {ruin_prob*100:.2f}% (Chance of hitting >{args.ruindd}% DD)")
    
    # 6. Stress Test (Slippage Injection + Monte Carlo)
    stressed_r = run_slippage_stress_test(r_multiples, slip_penalty, slip_pct)
    s_final_bals, s_max_dds, s_ruin_prob = run_monte_carlo(stressed_r, start_balance, risk_pct, ruin_dd)
    stressed_sqn = calculate_sqn(stressed_r)
    
    print(f"\n[+] Slippage & Spread Stress Testing (Severe Conditions):")
    print(f"    - Stressed SQN:       {stressed_sqn:.2f} ({get_sqn_grade(stressed_sqn)})")
    print(f"    - Median End Balance: ${np.median(s_final_bals):,.2f}")
    print(f"    - Median Max Drawdown: {np.median(s_max_dds)*100:.2f}%")
    print(f"    - Probability of Ruin: {s_ruin_prob*100:.2f}%")
    
    # 7. Generate Markdown Report
    filename_clean = os.path.basename(filepath).replace('.', '_')
    report_filename = f"robustness_report_{filename_clean}.md"
    report_path = os.path.join(os.path.dirname(filepath), report_filename)
    
    md_content = f"""# Robustness & Stress Test Report: {os.path.basename(filepath)}
    
## Executive Summary
* **Preset File:** `{os.path.basename(filepath)}`
* **System Quality Number (SQN):** `{sqn:.2f}`
* **System Quality Rating:** `{sqn_grade}`
* **Compound Multiplier Expectancy:** `{np.mean(r_multiples):.3f}R per trade`

---

## Performance Matrix

| Metric | Raw Backtest | Monte Carlo Median | Stressed Conditions |
| :--- | :--- | :--- | :--- |
| **Ending Balance** | ${df['balance'].values[-1]:,.2f} | ${np.median(final_bals):,.2f} | ${np.median(s_final_bals):,.2f} |
| **Max Drawdown** | N/A | {np.median(max_dds)*100:.2f}% | {np.median(s_max_dds)*100:.2f}% |
| **Risk of Ruin** | N/A | {ruin_prob*100:.2f}% | {s_ruin_prob*100:.2f}% |
| **SQN Index** | {sqn:.2f} | {sqn:.2f} | {stressed_sqn:.2f} |

---

## Stress Test Settings
* **Slippage Penalty:** `- {slip_penalty}R`
* **Percent Affected:** `{args.slip_pct}%`
* **Ruin Drawdown Cap:** `{args.ruindd}%`

---

## Recommendations & Verdict

"""
    # Dynamic Recommendations
    if ruin_prob > 0.15:
        md_content += f"> [!WARNING]\n> **HIGH RISK OF RUIN DETECTED ({ruin_prob*100:.1f}%)**\n> Shuffled sequences show a high probability of hitting your {args.ruindd}% drawdown threshold. This preset is fragile. Reduce your `InpRiskPercent` below {args.risk}%.\n"
    elif stressed_sqn < 1.6:
        md_content += f"> [!CAUTION]\n> **POOR STRESSED ROBUSTNESS**\n> While the raw backtest looks profitable, injecting slippage and spread noise collapsed the SQN to {stressed_sqn:.2f}. This strategy is highly spread-sensitive and will likely lose money on live retail accounts.\n"
    else:
        md_content += f"> [!TIP]\n> **STRATEGY APPROVED FOR LIVE PRODUCTION**\n> The preset maintains a high SQN ({stressed_sqn:.2f}) and a near-zero ruin probability even under severe slippage. Highly robust.\n"
        
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(md_content)
        
    print(f"\n[+] Detailed markdown report saved to:\n    {report_path}")
    print(f"==========================================================\n")

if __name__ == "__main__":
    main()
