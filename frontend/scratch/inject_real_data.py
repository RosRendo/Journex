file_path = "d:/FOR RENDO (ONLY )/Personal Project/Dashboard/frontend/app/bot/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read().replace("\r\n", "\n")

# Precise Replacements for Entry Checklist Validation Panel
replacements = [
    (
        '{score >= 80 ? "8 / 8 PASSED" : "7 / 8 PASSED"}',
        '{score >= 70 && getSymbolSpread(activeData.symbol) < 20 ? "8 / 8 PASSED" : "7 / 8 PASSED"}'
    ),
    (
        '<span className="text-emerald-500 font-bold">✓</span>\n                            <span>Velocity: Strong</span>',
        '<span className="text-emerald-450 font-bold">✓</span>\n                            <span>Velocity: {getVelocity(score, activeData.type)}</span>'
    ),
    (
        '<span className="text-emerald-500 font-bold">✓</span>\n                            <span>Acceleration: Positive</span>',
        '<span className="text-emerald-450 font-bold">✓</span>\n                            <span>Acceleration: {getAcceleration(score, activeData.type)}</span>'
    ),
    (
        '<span className="text-emerald-500 font-bold">✓</span>\n                            <span>Volatility: High</span>',
        '<span className="text-emerald-450 font-bold">✓</span>\n                            <span>Volatility: {activeData.volatility.toUpperCase()}</span>'
    ),
    (
        '''                            {score >= 80 ? (
                              <span className="text-emerald-500 font-bold">✓</span>
                            ) : (
                              <span className="text-red-500 font-bold">✕</span>
                            )}
                            <span>Spread: 8 &lt; 20 (Safe limit)</span>''',
        '''                            {getSymbolSpread(activeData.symbol) < 20 ? (
                              <span className="text-emerald-450 font-bold">✓</span>
                            ) : (
                              <span className="text-red-500 font-bold">✕</span>
                            )}
                            <span>Spread: {getSymbolSpread(activeData.symbol)} &lt; 20 (Safe limit)</span>'''
    ),
    (
        '<span className="text-emerald-500 font-bold">✓</span>\n                            <span>Session: {activeData.session}</span>',
        '<span className="text-emerald-450 font-bold">✓</span>\n                            <span>Session: {activeData.session}</span>'
    ),
    (
        '<span className="text-emerald-500 font-bold">✓</span>\n                            <span>Risk allocation: {riskPercent}%</span>',
        '<span className="text-emerald-450 font-bold">✓</span>\n                            <span>Risk allocation: {riskPercent}%</span>'
    ),
    (
        '<span className="text-emerald-500 font-bold">✓</span>\n                            <span>Margin validation: OK</span>',
        '<span className="text-emerald-450 font-bold">✓</span>\n                            <span>Margin validation: OK</span>'
    ),
    # Risk Control Desk replacements
    (
        '${balance.toLocaleString()} / ${equity.toLocaleString()}',
        '${balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} / ${equity.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}'
    ),
    (
        '{riskPercent}% / {currentExposure}%',
        '{riskPercent.toFixed(2)}% / {currentExposure.toFixed(2)}%'
    ),
    (
        '${pnlToday} ({pnlToday >= 0 ? "+" : ""}{(2.1).toFixed(1)}%)',
        '{pnlToday >= 0 ? "+" : ""}${pnlToday.toFixed(2)} ({balance > 0 ? (Math.max(0, ((balance - equity) / balance) * 100)).toFixed(2) : "0.00"}%)'
    ),
    (
        '''                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Exposure Status</span>
                            <span className="px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-widest bg-emerald-950/20 text-emerald-455 border border-emerald-900/30">
                              ✓ SAFE MODE
                            </span>
                          </div>''',
        '''                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Daily Drawdown Limit</span>
                            <span className="font-bold text-red-400">-${(balance * 0.05).toFixed(2)} (-5.0%)</span>
                          </div>'''
    ),
    (
        '''                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Exposure Status</span>
                            <span className="px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-widest bg-emerald-950/20 text-emerald-450 border border-emerald-900/30">
                              ✓ SAFE MODE
                            </span>
                          </div>''',
        '''                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Daily Drawdown Limit</span>
                            <span className="font-bold text-red-400">-${(balance * 0.05).toFixed(2)} (-5.0%)</span>
                          </div>'''
    )
]

for old_str, new_str in replacements:
    old_norm = old_str.replace("\r\n", "\n")
    new_norm = new_str.replace("\r\n", "\n")
    if old_norm in content:
        content = content.replace(old_norm, new_norm)
        safe_print = old_norm.splitlines()[0][:40].encode('ascii', errors='ignore').decode('ascii')
        print(f"Replaced block: {safe_print}")
    else:
        safe_print = old_norm.splitlines()[0][:40].encode('ascii', errors='ignore').decode('ascii')
        print(f"Skipped block (not found): {safe_print}")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Finished applying replacements!")
