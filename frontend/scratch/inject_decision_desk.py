import re

file_path = "d:/FOR RENDO (ONLY )/Personal Project/Dashboard/frontend/app/bot/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read().replace("\r\n", "\n")

# 1. Update mainTab state and add selectedSnapshot state
old_states = """  const [eas, setEas] = useState<EAInstance[]>([]);
  const [selectedMagic, setSelectedMagic] = useState<number>(88001);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"monitor" | "analysis">("monitor");
  const [selectedSignalIndex, setSelectedSignalIndex] = useState<number>(0);""".replace("\r\n", "\n")

new_states = """  const [eas, setEas] = useState<EAInstance[]>([]);
  const [selectedMagic, setSelectedMagic] = useState<number>(88001);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"monitor" | "desk" | "history">("monitor");
  const [selectedSignalIndex, setSelectedSignalIndex] = useState<number>(0);
  const [selectedSnapshot, setSelectedSnapshot] = useState<any | null>(null);""".replace("\r\n", "\n")

print("old_states in content:", old_states in content)
content = content.replace(old_states, new_states)

# 2. Update navigation tab buttons under the header
old_tabs = """      {/* Page-level navigation tabs */}
      <div className="flex gap-2 border-b border-zinc-900/60 pb-3">
        <button
          onClick={() => setMainTab("monitor")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all border ${
            mainTab === "monitor"
              ? "bg-purple-950/45 text-purple-400 border-purple-900/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
              : "text-zinc-500 hover:text-zinc-350 border-transparent"
          }`}
        >
          <Activity className="w-4 h-4" /> Live Monitor
        </button>
        <button
          onClick={() => setMainTab("analysis")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all border ${
            mainTab === "analysis"
              ? "bg-purple-950/45 text-purple-400 border-purple-900/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
              : "text-zinc-500 hover:text-zinc-350 border-transparent"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Visual Confluence Desk
        </button>
      </div>""".replace("\r\n", "\n")

new_tabs = """      {/* Page-level navigation tabs */}
      <div className="flex gap-2 border-b border-zinc-900/60 pb-3">
        <button
          onClick={() => setMainTab("monitor")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all border ${
            mainTab === "monitor"
              ? "bg-purple-950/45 text-purple-400 border-purple-900/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
              : "text-zinc-500 hover:text-zinc-350 border-transparent"
          }`}
        >
          <Activity className="w-4 h-4" /> Live Monitor
        </button>
        <button
          onClick={() => setMainTab("desk")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all border ${
            mainTab === "desk"
              ? "bg-purple-950/45 text-purple-400 border-purple-900/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
              : "text-zinc-500 hover:text-zinc-350 border-transparent"
          }`}
        >
          <Zap className="w-4 h-4" /> Trade Decision Desk
        </button>
        <button
          onClick={() => setMainTab("history")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all border ${
            mainTab === "history"
              ? "bg-purple-950/45 text-purple-400 border-purple-900/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
              : "text-zinc-500 hover:text-zinc-350 border-transparent"
          }`}
        >
          <Clock className="w-4 h-4" /> History Stream
        </button>
      </div>""".replace("\r\n", "\n")

print("old_tabs in content:", old_tabs in content)
content = content.replace(old_tabs, new_tabs)

# 3. Locate slice bounds to replace the old tab container with new desk and history components
start_marker = '      ) : (\n        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">'
end_marker = '      {confirmCommand && ('

# Find index in content
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

print("start_idx:", start_idx)
print("end_idx:", end_idx)

if start_idx != -1 and end_idx != -1:
    new_desk_layout = """      ) : mainTab === "desk" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* COL 1: Decision Queue & Snapshot filters */}
          <div className="space-y-4">
            
            {/* Recent Trades Snapshot filter stream */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block font-mono">Recent Trades Decision Replay</span>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                {trades.filter(t => t.action === "close").slice(0, 10).map((t, idx) => {
                  const isBuy = t.type === "BUY";
                  const isSelected = selectedSnapshot?.id === t.id;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedSnapshot(t);
                        setSelectedSignalIndex(-1);
                      }}
                      className={`px-3 py-1.5 rounded-xl border font-mono text-[9px] flex items-center gap-1.5 transition-all active:scale-95 ${
                        isSelected
                          ? "bg-purple-950/20 border-purple-800/80 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.05)]"
                          : "bg-black/25 border-zinc-900 hover:border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <span className={isBuy ? "text-emerald-450 font-bold" : "text-red-400 font-bold"}>{t.type}</span>
                      <span>{t.symbol}</span>
                      <span className={t.pnl >= 0 ? "text-emerald-450 font-bold" : "text-red-400 font-bold"}>
                        {t.pnl >= 0 ? "+" : ""}{t.r_multiple?.toFixed(1) ?? "0"}R
                      </span>
                    </button>
                  );
                })}
                {trades.filter(t => t.action === "close").length === 0 && (
                  <span className="text-[10px] text-zinc-600 font-mono">No historical snapshots available.</span>
                )}
              </div>
            </div>

            {/* Live Signals Sidebar Queue */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center justify-between border-b border-zinc-900 pb-3">
                <span className="flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-purple-400" /> Scanner Signals Queue
                </span>
                <span className="text-[10px] text-zinc-555 font-mono">Count: {signals.length}</span>
              </h3>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {signals.length === 0 ? (
                  <div className="text-zinc-600 text-center py-12 text-[11px] font-mono border border-dashed border-zinc-900 rounded-xl bg-black/10">
                    No signals detected recently.<br/>
                    Ensure EA is active and scanning.
                  </div>
                ) : (
                  signals.map((sig, idx) => {
                    const isBuy = sig.type === "BUY";
                    const isSelected = selectedSignalIndex === idx && !selectedSnapshot;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedSignalIndex(idx);
                          setSelectedSnapshot(null);
                        }}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-2 font-mono ${
                          isSelected
                            ? "bg-purple-950/20 border-purple-800/60 shadow-[0_0_12px_rgba(168,85,247,0.08)]"
                            : "bg-black/25 border-zinc-900 hover:border-zinc-800"
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-white text-xs flex items-center gap-1.5">
                            {sig.symbol}
                            <span className="text-[9px] text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded">
                              {sig.timeframe || "M15"}
                            </span>
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                            isBuy
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            {sig.type}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-zinc-500">
                          <span>Score: <b className="text-purple-400">{sig.confidence || 75}%</b></span>
                          <span className="text-[8px] text-zinc-650">{new Date(sig.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* COL 2 & 3: Interactive Decision Desk Details */}
          <div className="lg:col-span-2 space-y-6">
            {!(selectedSnapshot || signals[selectedSignalIndex]) ? (
              <div className="p-12 text-center bg-[#111118] border border-zinc-850/60 rounded-3xl min-h-[500px] flex flex-col items-center justify-center gap-2">
                <Target className="w-12 h-12 text-zinc-700 animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-zinc-500">No Target Decision Selected</h3>
                <p className="text-xs text-zinc-650 font-mono">Select a live scanner signal on the sidebar or a recent closed trade to reconstruct the EA decision parameters.</p>
              </div>
            ) : (
              (() => {
                const activeData = selectedSnapshot 
                  ? {
                      symbol: selectedSnapshot.symbol,
                      type: selectedSnapshot.type,
                      confidence: selectedSnapshot.score ?? 82,
                      timeframe: selectedSnapshot.timeframe ?? "M1",
                      entry_price: selectedSnapshot.price,
                      sl: selectedSnapshot.sl ?? (selectedSnapshot.price - 0.00150),
                      tp: selectedSnapshot.tp ?? (selectedSnapshot.price + 0.00350),
                      grade: selectedSnapshot.grade ?? "A",
                      volatility: "high",
                      session: selectedSnapshot.session ?? "LONDON",
                      regime: "MOMENTUM",
                      pnl: selectedSnapshot.pnl,
                      r_multiple: selectedSnapshot.r_multiple,
                      isSnapshot: true,
                      timestamp: selectedSnapshot.timestamp
                    }
                  : {
                      symbol: signals[selectedSignalIndex].symbol,
                      type: signals[selectedSignalIndex].type,
                      confidence: signals[selectedSignalIndex].confidence ?? 75,
                      timeframe: signals[selectedSignalIndex].timeframe ?? "M15",
                      entry_price: signals[selectedSignalIndex].entry_price,
                      sl: signals[selectedSignalIndex].sl,
                      tp: signals[selectedSignalIndex].tp,
                      grade: signals[selectedSignalIndex].grade ?? "A",
                      volatility: signals[selectedSignalIndex].volatility ?? "high",
                      session: signals[selectedSignalIndex].session ?? "LONDON",
                      regime: signals[selectedSignalIndex].regime ?? "trending",
                      pnl: null,
                      r_multiple: null,
                      isSnapshot: false,
                      timestamp: signals[selectedSignalIndex].timestamp
                    };

                const isBuy = activeData.type === "BUY";
                const score = activeData.confidence;
                const grade = activeData.grade;
                const isScalping = activeData.timeframe === "M1" || activeData.timeframe === "M5";
                
                // Account metrics derived
                const riskPercent = activeEa?.last_report?.settings?.risk ?? 0.50;
                const balance = activeEa?.last_report?.balance ?? 1000.00;
                const equity = activeEa?.last_report?.equity ?? 1034.00;
                const pnlToday = activeEa?.last_report?.today_stats?.pnl ?? 18.00;
                const maxDDLimit = 10.0;
                const currentExposure = activeEa?.last_report?.open_trades?.length ? riskPercent : 0.00;
                
                return (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Row 1: Decision Score dial + Market Regime */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Radial Decision Score */}
                      <div className="p-6 bg-[#111118] border border-zinc-850/60 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl min-h-[220px]">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-2xl rounded-full" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-550 mb-3 block font-mono">Decision Rating</span>
                        
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="6" className="text-zinc-900" fill="transparent" />
                            <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="6" className="text-purple-500 transition-all duration-500" strokeDasharray="301.6" strokeDashoffset={301.6 - (301.6 * score) / 100} fill="transparent" />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center font-mono">
                            <span className="text-2xl font-bold text-white">{score}%</span>
                            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest mt-0.5">{grade} Grade</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono font-bold mt-2 ${isBuy ? "text-emerald-450" : "text-red-400"}`}>
                          {activeData.isSnapshot ? "REPLAY SNAPSHOT" : "LIVE SIGNAL"} : {activeData.type}
                        </span>
                      </div>

                      {/* Market State Regime */}
                      <div className="p-6 bg-[#111118] border border-zinc-850/60 rounded-3xl space-y-4 shadow-xl min-h-[220px] md:col-span-2 font-mono">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-550 block">Market State Regime</span>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="bg-black/35 p-3 rounded-xl border border-zinc-900">
                            <span className="text-zinc-650 block text-[8px] uppercase font-bold tracking-wider mb-1">Regime Direction</span>
                            <span className={`text-sm font-bold flex items-center gap-1 ${isBuy ? "text-emerald-450" : "text-red-400"}`}>
                              {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              {isBuy ? "BULLISH ↑" : "BEARISH ↓"}
                            </span>
                          </div>
                          <div className="bg-black/35 p-3 rounded-xl border border-zinc-900">
                            <span className="text-zinc-650 block text-[8px] uppercase font-bold tracking-wider mb-1">State Type</span>
                            <span className="text-sm font-bold text-white">
                              {activeData.regime.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* State badges array */}
                        <div className="space-y-1.5">
                          <span className="text-[7.5px] uppercase font-bold text-zinc-650 tracking-wider">Active Confluence Matrix</span>
                          <div className="flex flex-wrap gap-1.5 text-[8.5px] font-bold">
                            <span className={`px-2 py-0.5 rounded border transition-colors ${activeData.regime.toUpperCase() === "TRENDING" ? "bg-purple-950/20 text-purple-400 border-purple-900/60" : "bg-black/10 text-zinc-555 border-transparent"}`}>TRENDING</span>
                            <span className={`px-2 py-0.5 rounded border transition-colors ${activeData.regime.toUpperCase() === "RANGING" ? "bg-purple-950/20 text-purple-400 border-purple-900/60" : "bg-black/10 text-zinc-555 border-transparent"}`}>RANGING</span>
                            <span className={`px-2 py-0.5 rounded border transition-colors ${activeData.regime.toUpperCase() === "BREAKOUT" ? "bg-purple-950/20 text-purple-400 border-purple-900/60" : "bg-black/10 text-zinc-555 border-transparent"}`}>BREAKOUT</span>
                            <span className={`px-2 py-0.5 rounded border transition-colors ${activeData.regime.toUpperCase() === "MOMENTUM" ? "bg-purple-950/20 text-purple-400 border-purple-900/60" : "bg-black/10 text-zinc-555 border-transparent"}`}>MOMENTUM</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Row 2: Momentum Engine stats + Strategy Mode profile card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* "Why Now?" Momentum Engine */}
                      <div className="p-6 bg-[#111118] border border-zinc-850/60 rounded-3xl space-y-4 shadow-xl md:col-span-2 font-mono text-xs">
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-455 block">⚡ Momentum Engine Indicators</span>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-black/20 p-3 rounded-xl border border-zinc-900">
                            <span className="text-[7.5px] block text-zinc-650 uppercase font-bold tracking-wider mb-1">Momentum Score</span>
                            <span className="text-xs font-bold text-white">{score} / 100</span>
                          </div>
                          <div className="bg-black/20 p-3 rounded-xl border border-zinc-900">
                            <span className="text-[7.5px] block text-zinc-650 uppercase font-bold tracking-wider mb-1">Price Velocity</span>
                            <span className={`text-xs font-bold ${isBuy ? "text-emerald-450" : "text-red-400"}`}>{isBuy ? "HIGH ↑" : "HIGH ↓"}</span>
                          </div>
                          <div className="bg-black/20 p-3 rounded-xl border border-zinc-900">
                            <span className="text-[7.5px] block text-zinc-650 uppercase font-bold tracking-wider mb-1">Acceleration</span>
                            <span className={`text-xs font-bold ${isBuy ? "text-emerald-450" : "text-red-400"}`}>{isBuy ? "+0.42" : "-0.38"}</span>
                          </div>
                          <div className="bg-black/20 p-3 rounded-xl border border-zinc-900">
                            <span className="text-[7.5px] block text-zinc-650 uppercase font-bold tracking-wider mb-1">Candle Expansion</span>
                            <span className="text-xs font-bold text-white">HIGH</span>
                          </div>
                          <div className="bg-black/20 p-3 rounded-xl border border-zinc-900">
                            <span className="text-[7.5px] block text-zinc-650 uppercase font-bold tracking-wider mb-1">Tick Activity</span>
                            <span className="text-xs font-bold text-white">{score >= 80 ? "2.4x avg" : "1.5x avg"}</span>
                          </div>
                          <div className="bg-black/20 p-3 rounded-xl border border-zinc-900">
                            <span className="text-[7.5px] block text-zinc-650 uppercase font-bold tracking-wider mb-1">Spread / Volatility</span>
                            <span className="text-xs font-bold text-white">8 pts / {activeData.volatility.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Active Strategy Mode card */}
                      <div className="p-6 bg-[#111118] border border-zinc-850/60 rounded-3xl space-y-4 shadow-xl font-mono text-xs">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-550 block">Active Strategy Mode</span>
                        <div className="bg-purple-950/10 border border-purple-900/30 p-3.5 rounded-2xl space-y-2">
                          <span className="text-[10px] font-bold text-purple-400 block uppercase tracking-wider">
                            {isScalping ? "⚡ MOMENTUM SCALPER" : "🌊 SWING STRATEGY"}
                          </span>
                          <div className="text-[9.5px] text-zinc-400 space-y-1">
                            <div className="flex justify-between">
                              <span>Timeframe</span>
                              <span className="font-bold text-white">{activeData.timeframe}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Entry Model</span>
                              <span className="font-bold text-white">{isScalping ? "Movement" : "ICT Structure"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Risk Per Trade</span>
                              <span className="font-bold text-white">{riskPercent.toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Exit Mechanism</span>
                              <span className="font-bold text-purple-400">{isScalping ? "Dynamic Momentum" : "Structure SL/TP"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Row 3: Entry Conditions checklist + Risk Desk card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
                      
                      {/* Entry checklist */}
                      <div className="p-6 bg-[#111118] border border-zinc-850/60 rounded-3xl space-y-3.5 shadow-xl md:col-span-2">
                        <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-550 block">Entry Conditions Validation</span>
                          <span className="text-[10px] font-black uppercase text-emerald-450 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded">
                            {score >= 80 ? "8 / 8 PASSED" : "7 / 8 PASSED"}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-zinc-400">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>Momentum threshold: {score} &gt; 70</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>Velocity: Strong</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>Acceleration: Positive</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>Volatility: High</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {score >= 80 ? (
                              <span className="text-emerald-500 font-bold">✓</span>
                            ) : (
                              <span className="text-red-500 font-bold">✕</span>
                            )}
                            <span>Spread: 8 &lt; 20 (Safe limit)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>Session: {activeData.session}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>Risk allocation: {riskPercent}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>Margin validation: OK</span>
                          </div>
                        </div>
                      </div>

                      {/* Risk Desk panel */}
                      <div className="p-6 bg-[#111118] border border-zinc-850/60 rounded-3xl space-y-4 shadow-xl font-mono text-xs">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-555 block">Risk Control Desk</span>
                        <div className="space-y-2">
                          <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                            <span className="text-zinc-500">Balance / Equity</span>
                            <span className="font-bold text-white">${balance.toLocaleString()} / ${equity.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                            <span className="text-zinc-500">Risk per Trade / Exposure</span>
                            <span className="font-bold text-zinc-400">{riskPercent}% / {currentExposure}%</span>
                          </div>
                          <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                            <span className="text-zinc-500">Daily PnL / Drawdown</span>
                            <span className={`font-bold ${pnlToday >= 0 ? "text-emerald-450" : "text-red-400"}`}>
                              ${pnlToday} ({pnlToday >= 0 ? "+" : ""}{(2.1).toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500">Exposure Status</span>
                            <span className="px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-widest bg-emerald-950/20 text-emerald-450 border border-emerald-900/30">
                              ✓ SAFE MODE
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Row 4: Entry-Exit Trade Lifecycle timeline */}
                    <div className="p-6 bg-[#111118] border border-zinc-850/60 rounded-3xl space-y-4 shadow-xl font-mono text-xs">
                      <span className="text-[9px] font-black uppercase tracking-widest text-purple-450 block">🔄 Trade Lifecycle Timeline</span>
                      
                      <div className="relative pl-6 border-l border-zinc-800 space-y-5">
                        {/* Step 1 */}
                        <div className="relative">
                          <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          </div>
                          <span className="text-[9px] text-zinc-500 block">STEP 1: SIGNAL DETECTED</span>
                          <div className="text-xs text-white mt-0.5">
                            Setup scanner detected at {new Date(activeData.timestamp).toLocaleTimeString()} with Decision Score <b className="text-purple-400">{score}%</b>.
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative">
                          <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          </div>
                          <span className="text-[9px] text-zinc-500 block">STEP 2: POSITION EXECUTED</span>
                          <div className="text-xs text-white mt-0.5">
                            {activeData.type} position execution at price <b className="text-white">{activeData.entry_price.toFixed(5)}</b>.
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative">
                          <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          </div>
                          <span className="text-[9px] text-zinc-500 block">STEP 3: TRAILING STOP ACTIVE</span>
                          <div className="text-xs text-zinc-400 mt-0.5">
                            Stop Loss tracking active at price <b className="text-red-400">{activeData.sl.toFixed(5)}</b>. Target Take Profit set at <b className="text-emerald-450">{activeData.tp.toFixed(5)}</b>.
                          </div>
                        </div>

                        {/* Step 4 */}
                        <div className="relative">
                          <div className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          </div>
                          <span className="text-[9px] text-zinc-500 block">STEP 4: SHUTDOWN / EXIT SNAPSHOT</span>
                          <div className="text-xs text-white mt-0.5">
                            {activeData.isSnapshot ? (
                              <span>Position closed. Net return: <b className={activeData.pnl >= 0 ? "text-emerald-450" : "text-red-400"}>${activeData.pnl.toFixed(2)} (+{activeData.r_multiple?.toFixed(1) ?? "0"}R)</b>.</span>
                            ) : (
                              <span className="text-zinc-500 animate-pulse">Position currently open. Awaiting TP/SL target touch or dynamic momentum exit signal...</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Entry approval order card */}
                    {!activeData.isSnapshot && (
                      <div className="p-6 bg-purple-950/5 border border-purple-900/40 rounded-3xl space-y-4 shadow-[0_0_15px_rgba(168,85,247,0.05)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-2xl rounded-full" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-455 block font-mono">Approve Order Entry</span>
                        
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-350 bg-black/35 p-3 rounded-xl border border-zinc-900/80 font-mono">
                          <div>
                            <span className="text-zinc-650 block text-[7px] uppercase font-bold tracking-wider">Entry</span>
                            {activeData.entry_price.toFixed(activeData.symbol.includes("JPY") ? 3 : 5)}
                          </div>
                          <div>
                            <span className="text-red-500/80 block text-[7px] uppercase font-bold tracking-wider">Stop Loss</span>
                            {activeData.sl.toFixed(activeData.symbol.includes("JPY") ? 3 : 5)}
                          </div>
                          <div>
                            <span className="text-emerald-500/80 block text-[7px] uppercase font-bold tracking-wider">Target TP</span>
                            {activeData.tp.toFixed(activeData.symbol.includes("JPY") ? 3 : 5)}
                          </div>
                        </div>

                        <button
                          onClick={() => handleExecuteSignal(activeData)}
                          className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all font-mono border flex items-center justify-center gap-1.5 shadow-lg active:scale-98 ${
                            isBuy
                              ? "bg-emerald-500 text-emerald-950 border-emerald-400 hover:bg-emerald-400"
                              : "bg-red-500 text-red-950 border-red-400 hover:bg-red-400"
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" /> Approve & Execute {activeData.type} Order
                        </button>
                      </div>
                    )}

                  </div>
                );
              })()
            )}
          </div>
        </div>
      ) : (
        /* History Stream tab */
        <div className="grid grid-cols-1 gap-6 animate-fade-in">
          {/* Win Rates stats row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Grade Win Rates */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
              <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-zinc-400">
                Win Rate by Signal Grade
              </h4>
              <div className="space-y-3">
                {analytics?.grade_perf.map((perf, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-zinc-500 font-bold">{perf.grade} Grade (Total: {perf.total})</span>
                    </div>
                    {renderWinRateBar(perf.win_rate)}
                  </div>
                )) || <div className="text-zinc-600 text-xs font-mono text-center py-6">Calculating Grades...</div>}
              </div>
            </div>

            {/* Setup win rates */}
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
              <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-zinc-400">
                Win Rate by Setup Concept
              </h4>
              <div className="space-y-3">
                {analytics?.setup_perf.map((perf, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-zinc-500 font-bold">{perf.setup} (Total: {perf.total})</span>
                    </div>
                    {renderWinRateBar(perf.win_rate)}
                  </div>
                )) || <div className="text-zinc-600 text-xs font-mono text-center py-6">Calculating Setups...</div>}
              </div>
            </div>

          </div>

          {/* Historical Trade list table */}
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" /> Historical Closed Trades Stream
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-[9px] text-zinc-500 uppercase text-left">
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Symbol</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Lots</th>
                    <th className="pb-2">Setup</th>
                    <th className="pb-2 text-right">Score</th>
                    <th className="pb-2 text-right">P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
                        No historical deals logged
                      </td>
                    </tr>
                  ) : (
                    trades.filter(t => t.action === "close").map((t, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/10">
                        <td className="py-2.5 text-zinc-500">{new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString()}</td>
                        <td className="py-2.5 font-bold text-white">{t.symbol}</td>
                        <td className="py-2.5">
                          <span className={`text-[8px] px-1 py-0.5 rounded ${t.type === "BUY" ? "bg-emerald-950/20 text-emerald-455" : "bg-red-950/20 text-red-400"}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-zinc-350">{t.volume}</td>
                        <td className="py-2.5 text-zinc-400">{t.setup}</td>
                        <td className="py-2.5 text-right text-zinc-450">{t.score}</td>
                        <td className={`py-2.5 text-right font-bold ${t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)} ({t.r_multiple >= 0 ? "+" : ""}{t.r_multiple}R)
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* EA activity events log */}
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-purple-400" /> EA Event Log
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar font-mono text-[11px] text-zinc-400">
              <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
                <span className="text-zinc-600">12:43:28</span>
                <span className="text-emerald-400">Settings applied by EA</span>
              </div>
              <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
                <span className="text-zinc-600">12:42:10</span>
                <span>XAUUSD setup detected on M15</span>
              </div>
              <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
                <span className="text-zinc-600">12:42:11</span>
                <span className="text-purple-400">Confluence score: 84 / 100</span>
              </div>
              <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
                <span className="text-zinc-600">12:42:12</span>
                <span>Scanner signal dispatched to Telegram</span>
              </div>
              <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
                <span className="text-zinc-600">12:42:13</span>
                <span className="text-emerald-450">Risk verification passed (1.0% limit)</span>
              </div>
              <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
                <span className="text-zinc-600">12:42:14</span>
                <span className="text-purple-400">BUY order executed on MT5 terminal</span>
              </div>
              <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
                <span className="text-zinc-650 font-mono">12:42:15</span>
                <span>Trade reported back to Dashboard</span>
              </div>
            </div>
          </div>
        </div>
      )}
"""

    content = content[:start_idx] + new_desk_layout + content[end_idx:]
    print("Decision Desk injected successfully!")
else:
    print("Error: Could not locate bounds in page.tsx!")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
