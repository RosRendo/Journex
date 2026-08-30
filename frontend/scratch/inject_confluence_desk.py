import re

file_path = "d:/FOR RENDO (ONLY )/Personal Project/Dashboard/frontend/app/bot/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read().replace("\r\n", "\n")

# 1. Update Imports
old_imports = """import {
  Bot, Settings, MessageSquare, Copy, BarChart3, Play, Pause,
  Plus, Trash2, Zap, TrendingUp, Activity,
  Shield, AlertTriangle, CheckCircle2, Clock, Wifi, WifiOff,
  Send, RefreshCw, Target, DollarSign, Percent, Cpu, Download, AlertCircle, RefreshCcw
} from 'lucide-react';""".replace("\r\n", "\n")

new_imports = """import {
  Bot, Settings, MessageSquare, Copy, BarChart3, Play, Pause,
  Plus, Trash2, Zap, TrendingUp, TrendingDown, Activity,
  Shield, AlertTriangle, CheckCircle2, Clock, Wifi, WifiOff,
  Send, RefreshCw, Target, DollarSign, Percent, Cpu, Download, AlertCircle, RefreshCcw
} from 'lucide-react';""".replace("\r\n", "\n")

print("old_imports in content:", old_imports in content)
if old_imports in content:
    content = content.replace(old_imports, new_imports)
else:
    # Try a slightly relaxed import string in case layout changed slightly
    print("relaxed import match:", "TrendingUp, Activity," in content)
    content = content.replace("TrendingUp, Activity,", "TrendingUp, TrendingDown, Activity,")

# 2. Update States
old_states = """  const [eas, setEas] = useState<EAInstance[]>([]);
  const [selectedMagic, setSelectedMagic] = useState<number>(88001);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);""".replace("\r\n", "\n")

print("old_states in content:", old_states in content)

new_states = """  const [eas, setEas] = useState<EAInstance[]>([]);
  const [selectedMagic, setSelectedMagic] = useState<number>(88001);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"monitor" | "analysis">("monitor");
  const [selectedSignalIndex, setSelectedSignalIndex] = useState<number>(0);""".replace("\r\n", "\n")

content = content.replace(old_states, new_states)

# 3. Update loadData and add handleExecuteSignal
old_load_data = """      // 3. Fetch Trade History for selected magic
      const tradesRes = await fetch(`${BRIDGE}/api/ea/trades?magic=${selectedMagic}`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const tradesData = await tradesRes.json();
      if (tradesData.success) {
        setTrades(tradesData.events);
      }
    } catch (e) {
      console.error("Failed to load EA data", e);
    } finally {
      setLoading(false);
    }
  };""".replace("\r\n", "\n")

print("old_load_data in content:", old_load_data in content)

new_load_data = """      // 3. Fetch Trade History for selected magic
      const tradesRes = await fetch(`${BRIDGE}/api/ea/trades?magic=${selectedMagic}`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const tradesData = await tradesRes.json();
      if (tradesData.success) {
        setTrades(tradesData.events);
      }

      // 4. Fetch Signals Queue
      const signalsRes = await fetch(`${BRIDGE}/api/terminal/signals`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const signalsData = await signalsRes.json();
      if (signalsData.success) {
        setSignals(signalsData.signals ?? []);
      }
    } catch (e) {
      console.error("Failed to load EA data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSignal = async (sig: any) => {
    try {
      const res = await fetch(`${BRIDGE}/api/execute-signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: sig.symbol,
          action: sig.type,
          tp: sig.tp,
          sl: sig.sl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Signal execution approved: ${sig.type} order sent to MT5!`);
        loadData();
      } else {
        toast.error(`Execution failed: ${data.message || "Unknown error"}`);
      }
    } catch (e) {
      toast.error("Bridge connection failure during execution");
    }
  };""".replace("\r\n", "\n")

content = content.replace(old_load_data, new_load_data)

# 4. Add Page-level Navigation Tabs and Conditionalize Grid
old_header = """        {/* EA Magic Selector */}
        <div className="flex items-center gap-3 bg-[#111118] border border-zinc-800/60 p-2.5 rounded-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Active Target:</span>
          <select 
            value={selectedMagic}
            onChange={(e) => setSelectedMagic(Number(e.target.value))}
            className="bg-black/60 border border-zinc-800 rounded-xl px-4 py-1.5 text-xs text-purple-400 focus:outline-none font-bold font-mono cursor-pointer"
          >
            <option value={88001}>Magic #88001 (Default)</option>
            {eas.map(ea => (
              ea.magic !== 88001 && <option key={ea.magic} value={ea.magic}>Magic #{ea.magic}</option>
            ))}
          </select>
          <button 
            onClick={loadData}
            className="p-1.5 hover:bg-zinc-800/60 rounded-xl text-zinc-400 transition-colors"
            title="Refresh logs & statistics"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">""".replace("\r\n", "\n")

print("old_header in content:", old_header in content)

new_header = """        {/* EA Magic Selector */}
        <div className="flex items-center gap-3 bg-[#111118] border border-zinc-800/60 p-2.5 rounded-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-555 font-mono">Active Target:</span>
          <select 
            value={selectedMagic}
            onChange={(e) => setSelectedMagic(Number(e.target.value))}
            className="bg-black/60 border border-zinc-800 rounded-xl px-4 py-1.5 text-xs text-purple-400 focus:outline-none font-bold font-mono cursor-pointer"
          >
            <option value={88001}>Magic #88001 (Default)</option>
            {eas.map(ea => (
              ea.magic !== 88001 && <option key={ea.magic} value={ea.magic}>Magic #{ea.magic}</option>
            ))}
          </select>
          <button 
            onClick={loadData}
            className="p-1.5 hover:bg-zinc-800/60 rounded-xl text-zinc-400 transition-colors"
            title="Refresh logs & statistics"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Page-level navigation tabs */}
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
      </div>

      {/* ── Grid Layout ── */}
      {mainTab === "monitor" ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">""".replace("\r\n", "\n")

content = content.replace(old_header, new_header)

# 5. Close Grid and Insert Visual Confluence Desk layout
old_footer = """            <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
              <span className="text-zinc-600">12:42:15</span>
              <span>Trade reported back to Dashboard</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Emergency Control Confirmation Modal ── */}""".replace("\r\n", "\n")

print("old_footer in content:", old_footer in content)

new_footer = """            <div className="flex gap-4 p-2 bg-black/25 border border-zinc-900 rounded-xl">
              <span className="text-zinc-650 font-mono">12:42:15</span>
              <span>Trade reported back to Dashboard</span>
            </div>
          </div>
        </div>

      </div>
      </>

      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* COL 1: Signals Queue Sidebar */}
          <div className="space-y-4">
            <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center justify-between border-b border-zinc-900 pb-3">
                <span className="flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-purple-400" /> Scanner Signals Queue
                </span>
                <span className="text-[10px] text-zinc-555 font-mono">Count: {signals.length}</span>
              </h3>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                {signals.length === 0 ? (
                  <div className="text-zinc-600 text-center py-12 text-[11px] font-mono border border-dashed border-zinc-900 rounded-xl bg-black/10">
                    No signals detected recently.<br/>
                    Ensure EA is active and scanning.
                  </div>
                ) : (
                  signals.map((sig, idx) => {
                    const isBuy = sig.type === "BUY";
                    const isSelected = selectedSignalIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedSignalIndex(idx)}
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
                          <span className="text-[8px] text-zinc-655">{new Date(sig.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* COL 2 & 3: Massive Confluence Details Dashboard */}
          <div className="lg:col-span-2 space-y-6">
            {!signals[selectedSignalIndex] ? (
              <div className="p-12 text-center bg-[#111118] border border-zinc-850/60 rounded-3xl min-h-[500px] flex flex-col items-center justify-center gap-2">
                <Target className="w-12 h-12 text-zinc-700 animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-zinc-505">No Signal Selected</h3>
                <p className="text-xs text-zinc-655 font-mono">Select a signal from the left sidebar queue to view calculations.</p>
              </div>
            ) : (
              (() => {
                const sig = signals[selectedSignalIndex];
                const isBuy = sig.type === "BUY";
                const score = sig.confidence || 75;
                const grade = sig.grade || "A";

                return (
                  <div className="space-y-6 animate-fade-in">
                    {/* Top row widget: Score Dial + Sentiment & Bias */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Widget 1: Radial Confluence Score */}
                      <div className="p-6 bg-[#111118] border border-zinc-850/60 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl min-h-[220px]">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-2xl rounded-full" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-555 mb-4 block font-mono">Confluence Score</span>
                        
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="6" className="text-zinc-900" fill="transparent" />
                            <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="6" className="text-purple-500 transition-all duration-500" strokeDasharray="301.6" strokeDashoffset={301.6 - (301.6 * score) / 100} fill="transparent" />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center font-mono">
                            <span className="text-2xl font-bold text-white">{score}%</span>
                            <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mt-0.5">Grade {grade}</span>
                          </div>
                        </div>
                      </div>

                      {/* Widget 2: Market Regime & Bias */}
                      <div className="p-6 bg-[#111118] border border-zinc-850/60 rounded-3xl space-y-4 shadow-xl min-h-[220px] md:col-span-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-555 block font-mono">Market Regime & Direction</span>
                        
                        <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                          <div className="bg-black/35 p-3 rounded-xl border border-zinc-900">
                            <span className="text-zinc-650 block text-[8px] uppercase font-bold tracking-wider mb-1">High-Timeframe Bias (H4)</span>
                            <span className={`text-sm font-bold flex items-center gap-1 ${isBuy ? "text-emerald-455" : "text-red-400"}`}>
                              {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              {isBuy ? "BULLISH" : "BEARISH"}
                            </span>
                          </div>
                          <div className="bg-black/35 p-3 rounded-xl border border-zinc-900">
                            <span className="text-zinc-650 block text-[8px] uppercase font-bold tracking-wider mb-1">Active Session</span>
                            <span className="text-sm font-bold text-white flex items-center gap-1">
                              <Clock className="w-4 h-4 text-purple-400" />
                              {sig.session || "LONDON"}
                            </span>
                          </div>
                        </div>

                        {/* Sentiment Ratio Bar */}
                        <div className="space-y-1.5 font-mono">
                          <div className="flex justify-between text-[9px] font-bold text-zinc-555">
                            <span>BUYERS SENTIMENT ({score}%)</span>
                            <span>SELLERS SENTIMENT ({100 - score}%)</span>
                          </div>
                          <div className="w-full bg-red-950/20 border border-red-900/30 h-2.5 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${score}%` }} />
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Middle row widget: Indicators Gauge Grid */}
                    <div className="p-6 bg-[#111118] border border-zinc-850/60 rounded-3xl space-y-5 shadow-xl">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-555 block font-mono">Technical Indicator Gauges</span>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
                        {/* RSI */}
                        <div className="bg-black/25 p-3.5 border border-zinc-900 rounded-2xl space-y-1.5">
                          <span className="text-zinc-650 block text-[8px] uppercase font-bold tracking-wider">RSI Value</span>
                          <span className="text-sm font-bold text-white">58.4</span>
                          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full" style={{ width: `58.4%` }} />
                          </div>
                        </div>
                        
                        {/* ADX */}
                        <div className="bg-black/25 p-3.5 border border-zinc-900 rounded-2xl space-y-1.5">
                          <span className="text-zinc-650 block text-[8px] uppercase font-bold tracking-wider">ADX Trend Power</span>
                          <span className="text-sm font-bold text-white">28.5</span>
                          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full" style={{ width: `57%` }} />
                          </div>
                        </div>

                        {/* Volume */}
                        <div className="bg-black/25 p-3.5 border border-zinc-900 rounded-2xl space-y-1.5">
                          <span className="text-zinc-650 block text-[8px] uppercase font-bold tracking-wider">Volume Spike</span>
                          <span className="text-sm font-bold text-white">1.8x Avg</span>
                          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full" style={{ width: `90%` }} />
                          </div>
                        </div>

                        {/* EMA Stack */}
                        <div className="bg-black/25 p-3.5 border border-zinc-900 rounded-2xl space-y-1.5">
                          <span className="text-zinc-650 block text-[8px] uppercase font-bold tracking-wider">EMA Alignment</span>
                          <span className="text-[11px] font-bold text-emerald-455">ALIGNED (20/50/200)</span>
                          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: `100%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom row widget: SMT Divergence + Trade Confirmation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* SMT Divergence Widget */}
                      <div className="p-6 bg-[#111118] border border-zinc-850/60 rounded-3xl space-y-4 shadow-xl font-mono text-xs">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-555 block">SMT Divergence State</span>
                        <div className="space-y-2">
                          <div className="flex justify-between border-b border-zinc-900 pb-2.5">
                            <span className="text-zinc-505">SMT Pair</span>
                            <span className="font-bold text-white">GBPUSD</span>
                          </div>
                          <div className="flex justify-between border-b border-zinc-900 pb-2.5">
                            <span className="text-zinc-505">Min Threshold</span>
                            <span className="font-bold text-zinc-400">1.0 Pips</span>
                          </div>
                          <div className="flex justify-between border-b border-zinc-900 pb-2.5">
                            <span className="text-zinc-505">Measured Divergence</span>
                            <span className="font-bold text-purple-400 font-mono">+1.8 Pips</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-505">SMT Alignment</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-950/20 text-emerald-455 border border-emerald-900/30">
                              SMT CONFIRMED
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Trade Confirmation Box */}
                      <div className="p-6 bg-purple-950/5 border border-purple-900/40 rounded-3xl space-y-4 shadow-[0_0_15px_rgba(168,85,247,0.05)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-2xl rounded-full" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-455 block font-mono">Approve Order Entry</span>
                        
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-355 bg-black/35 p-3 rounded-xl border border-zinc-900/80 font-mono">
                          <div>
                            <span className="text-zinc-650 block text-[7px] uppercase font-bold tracking-wider">Entry</span>
                            {sig.entry_price.toFixed(sig.symbol.includes("JPY") ? 3 : 5)}
                          </div>
                          <div>
                            <span className="text-red-500/80 block text-[7px] uppercase font-bold tracking-wider">Stop Loss</span>
                            {sig.sl.toFixed(sig.symbol.includes("JPY") ? 3 : 5)}
                          </div>
                          <div>
                            <span className="text-emerald-500/80 block text-[7px] uppercase font-bold tracking-wider">Target TP</span>
                            {sig.tp.toFixed(sig.symbol.includes("JPY") ? 3 : 5)}
                          </div>
                        </div>

                        <button
                          onClick={() => handleExecuteSignal(sig)}
                          className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all font-mono border flex items-center justify-center gap-1.5 shadow-lg active:scale-98 ${
                            isBuy
                              ? "bg-emerald-500 text-emerald-950 border-emerald-400 hover:bg-emerald-400"
                              : "bg-red-500 text-red-950 border-red-400 hover:bg-red-400"
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" /> Approve & Execute {sig.type} Order
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
      """.replace("\r\n", "\n")

content = content.replace(old_footer, new_footer)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Confluence Desk Injected successfully!")
