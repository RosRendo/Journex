import re

file_path = r"d:\Forex\journex\frontend\app\backtesting\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update OpenPosition interface to include ID and handle floating PnL
content = content.replace(
    'interface OpenPosition { id: string; symbol: string; direction: "BUY" | "SELL"; entry: number; sl: number; tp: number; lot_size: number; current_pnl?: number; }',
    'interface OpenPosition { id: string; symbol: string; direction: "BUY" | "SELL"; entry: number; sl: number; tp: number; lot_size: number; current_pnl?: number; }\n\n'
    '// Helper for floating PnL\n'
    'function calculateFloatingPnl(pos: OpenPosition, currentPrice: number) {\n'
    '  const diff = currentPrice - pos.entry;\n'
    '  const directionMultiplier = pos.direction === "BUY" ? 1 : -1;\n'
    '  return diff * directionMultiplier * 100000 * pos.lot_size;\n'
    '}'
)

# 2. Add closePosition API call logic
close_logic = """
  const closePosition = async (posId: string) => {
    if (!session) return;
    try {
      const response = await fetch(`${BACKTEST_API_URL}/replay/${session.session_id}/close_position`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position_id: posId }),
      });
      const data = await response.json();
      if (data.success) {
        setStatistics(data.statistics);
        setOpenPositions(data.open_positions);
      }
    } catch (e) { console.error("Close position error:", e); }
  };
"""

content = content.replace('const simulateTrade = async () => {', close_logic + '\n  const simulateTrade = async () => {')

# 3. Add Line drawing logic to candlestickSeries
# Inside useEffect for [allCandles, currentIndex, showRSI], we want to update the open positions lines.
# But it's easier to add a new useEffect for openPositions to manage price lines.

line_effect = """
  // Sync chart lines for open positions
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;
    // Clear old position lines
    priceLinesRef.current.forEach((pl) => candlestickSeriesRef.current?.removePriceLine(pl));
    priceLinesRef.current = [];
    
    // Add new lines for each open position
    openPositions.forEach(pos => {
      const color = pos.direction === "BUY" ? "#00d4a1" : "#ff4d6a";
      const line = candlestickSeriesRef.current!.createPriceLine({
        price: pos.entry,
        color: color,
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `${pos.direction} ${pos.lot_size}L`
      });
      priceLinesRef.current.push(line);
      
      if (pos.sl > 0) {
        priceLinesRef.current.push(candlestickSeriesRef.current!.createPriceLine({
          price: pos.sl, color: "#ff4d6a", lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: "SL"
        }));
      }
      if (pos.tp > 0) {
        priceLinesRef.current.push(candlestickSeriesRef.current!.createPriceLine({
          price: pos.tp, color: "#00d4a1", lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: "TP"
        }));
      }
    });
  }, [openPositions]);
"""
content = content.replace('const nextCandle = useCallback(async () => {', line_effect + '\n  const nextCandle = useCallback(async () => {')


# 4. Update the Portfolio section to display floating PnL and a Close button.
# Note: we find the mapping loop
old_pos_loop = """{openPositions.map(pos => (
                <div key={pos.id} className="rounded-xl border p-3 flex flex-col" style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold font-mono text-[12px] text-[--text-primary]">{pos.symbol}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: pos.direction === 'BUY' ? "rgba(0,212,161,0.1)" : "rgba(255,77,106,0.1)", color: pos.direction === 'BUY' ? "var(--bull)" : "var(--bear)" }}>{pos.direction} {pos.lot_size}L</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-[--text-tertiary]">Entry Price</p>
                      <p className="text-[12px] font-mono font-bold text-[--text-primary]">{pos.entry.toFixed(3)}</p>
                    </div>
                  </div>
                </div>
              ))}"""

new_pos_loop = """{openPositions.map(pos => {
                const floatingPnl = currentCandle ? calculateFloatingPnl(pos, currentCandle.close) : 0;
                const isProfit = floatingPnl >= 0;
                return (
                <div key={pos.id} className="rounded-2xl border p-4 flex flex-col backdrop-blur-xl shadow-lg transition-all hover:border-white/10 group" style={{ background: "rgba(15,15,20,0.6)", borderColor: "var(--border)" }}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex flex-col">
                      <span className="font-bold font-mono text-[14px] text-[--text-primary]">{pos.symbol}</span>
                      <span className="text-[10px] font-bold mt-1 px-2 py-0.5 rounded w-max" style={{ background: pos.direction === 'BUY' ? "rgba(0,212,161,0.1)" : "rgba(255,77,106,0.1)", color: pos.direction === 'BUY' ? "var(--bull)" : "var(--bear)" }}>{pos.direction} {pos.lot_size}L</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`font-bold font-mono text-[15px] ${isProfit ? "text-[--profit]" : "text-[--loss]"}`}>
                        {isProfit ? '+' : ''}${floatingPnl.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-mono text-[--text-tertiary] mt-1">{currentCandle?.close.toFixed(3)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mt-2">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-[--text-tertiary] tracking-wider mb-0.5">Entry Price</p>
                      <p className="text-[12px] font-mono font-bold text-[--text-secondary]">{pos.entry.toFixed(3)}</p>
                    </div>
                    <button onClick={() => closePosition(pos.id)} className="opacity-0 group-hover:opacity-100 transition-opacity bg-[--bg-base] hover:bg-white/10 text-white border rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ borderColor: "var(--border)" }}>
                      Close
                    </button>
                  </div>
                </div>
              )})}"""

content = content.replace(old_pos_loop, new_pos_loop)

# 5. Aesthetic Overhaul for side panel and main popup
content = content.replace(
    'className={`w-[360px] bg-[--bg-card] h-full flex flex-col transition-all duration-300 border-l ${!session ? \'opacity-30 pointer-events-none\' : \'opacity-100\'}`} style={{ borderColor: "var(--border)" }}',
    'className={`w-[360px] backdrop-blur-2xl h-full flex flex-col transition-all duration-300 border-l shadow-2xl ${!session ? \'opacity-30 pointer-events-none\' : \'opacity-100\'}`} style={{ background: "rgba(10,10,15,0.8)", borderColor: "var(--border-strong)" }}'
)

content = content.replace(
    'className="rounded-3xl p-8 max-w-2xl w-full shadow-2xl flex flex-col gap-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)" }}',
    'className="rounded-3xl p-8 max-w-2xl w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col gap-6 backdrop-blur-3xl border transition-all hover:border-white/10" style={{ background: "rgba(15,15,20,0.8)", borderColor: "var(--border-strong)" }}'
)

content = content.replace(
    'className="rounded-2xl p-6 max-w-2xl w-full shadow-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}',
    'className="rounded-3xl p-6 max-w-2xl w-full shadow-2xl border backdrop-blur-3xl transition-all" style={{ background: "rgba(15,15,20,0.8)", borderColor: "var(--border-strong)" }}'
)

content = content.replace(
    'className="rounded-xl p-4 border space-y-1" style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}',
    'className="rounded-2xl p-4 border space-y-2 backdrop-blur-xl shadow-lg" style={{ background: "rgba(15,15,20,0.6)", borderColor: "var(--border-strong)" }}'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Backtesting page patched successfully")
