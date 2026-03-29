"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { 
  Play, Pause, FastForward, Rewind, SkipForward, SkipBack, 
  Settings, Target, Crosshair, TrendingUp, TrendingDown, 
  Activity, AlertTriangle, CheckCircle2, SlidersHorizontal, BarChart3
} from "lucide-react";

/* ── UI Stubs ── */
function CustomButton({ onClick, disabled, variant = 'primary', size = 'default', className = '', children }: any) {
  let style = {};
  if (variant === 'primary') style = { background: "var(--accent)", color: "#000" };
  if (variant === 'secondary') style = { background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-strong)" };
  if (variant === 'ghost') style = { background: "transparent", color: "var(--text-secondary)" };
  if (variant === 'danger') style = { background: "rgba(255,77,106,0.1)", color: "var(--loss)", border: "1px solid rgba(255,77,106,0.3)" };
  if (variant === 'success') style = { background: "rgba(0,212,161,0.1)", color: "var(--profit)", border: "1px solid rgba(0,212,161,0.3)" };

  const pads = size === 'sm' ? "px-3 py-1.5 text-[11px]" : size === 'icon' ? "w-8 h-8 flex items-center justify-center p-0" : "px-5 py-2.5 text-[13px]";
  
  return (
    <button onClick={onClick} disabled={disabled} style={style} className={`font-bold rounded-lg transition-all hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2 ${pads} ${className}`}>
      {children}
    </button>
  )
}

/* ── Market Data Generator ── */
function generateMarketData(points = 500) {
  let price = 2000.50;
  const data: { time: number; label: string; price: number }[] = [];
  for (let i = 0; i < points; i++) {
    const volatility = Math.random() * 2.5 - 1.2; 
    const trend = Math.sin(i / 20) * 0.5 + Math.cos(i/10) * 0.2;
    price += volatility + trend;
    data.push({
      time: i,
      label: `10:${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}`,
      price: Number(price.toFixed(2))
    });
  }
  return data;
}

export default function GoldTradingSimulator() {
  const [mounted, setMounted] = useState(false);
  const [data] = useState(() => generateMarketData(600));

  useEffect(() => {
    setMounted(true);
  }, []);
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 5x, 10x
  const [currentIndex, setCurrentIndex] = useState(50); // Start with 50 candles visible
  
  // Trading State (Risk Rules applied from Phase C conceptual framework)
  const [balance, setBalance] = useState(10000);
  const [positions, setPositions] = useState<any[]>([]);
  const [lotSize, setLotSize] = useState(1.0); // 1 lot = $10 per pip
  const [riskWarning, setRiskWarning] = useState<string|null>(null);

  const timerRef = useRef<any>(null);

  // Derive visible chart data
  const visibleData = data.slice(Math.max(0, currentIndex - 100), currentIndex);
  const currentPrice = visibleData[visibleData.length - 1]?.price || 2000;

  // Playback Engine
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= data.length - 1) {
             setIsPlaying(false);
             return prev;
          }
          return prev + 1;
        });
      }, 1000 / speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, speed, data.length]);

  // Execute Trade Hooked to Risk Rules
  const executeTrade = (type: 'BUY' | 'SELL') => {
    // Risk Check: No more than 2 open positions at once
    if (positions.length >= 2) {
      setRiskWarning("Risk Rule Block: Max 2 open positions allowed.");
      setTimeout(() => setRiskWarning(null), 3000);
      return;
    }
    
    // Risk Check: Margin available
    const marginReq = lotSize * 500; // Mock $500 margin per lot
    if (balance < marginReq) {
      setRiskWarning(`Risk Rule Block: Insufficient margin for ${lotSize} lots.`);
      setTimeout(() => setRiskWarning(null), 3000);
      return;
    }

    setPositions(prev => [...prev, {
      id: Date.now(),
      type,
      entry: currentPrice,
      lots: lotSize,
      index: currentIndex
    }]);
  };

  const closePosition = (id: number) => {
    const pos = positions.find(p => p.id === id);
    if (!pos) return;
    
    // Calculate P&L: Gold is 100 oz per lot. So $1 move = $100 per lot.
    const diff = pos.type === 'BUY' ? currentPrice - pos.entry : pos.entry - currentPrice;
    const pnl = diff * 100 * pos.lots;
    
    setBalance(prev => prev + pnl);
    setPositions(prev => prev.filter(p => p.id !== id));
  };

  // Close all positions if simulator reaches end
  useEffect(() => {
    if (currentIndex >= data.length - 1 && positions.length > 0) {
      positions.forEach(p => closePosition(p.id));
    }
  }, [currentIndex]);

  // Floating P&L calculation
  const floatingPnL = positions.reduce((acc, pos) => {
    const diff = pos.type === 'BUY' ? currentPrice - pos.entry : pos.entry - currentPrice;
    return acc + (diff * 100 * pos.lots);
  }, 0);

  const equity = balance + floatingPnL;

  if (!mounted) return <div className="flex flex-col h-[calc(100vh-80px)] bg-[--bg-base]" />;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-[--bg-base]">
      
      {/* ── TOP HEADER (Asset & P&L) ── */}
      <div className="flex-shrink-0 border-b p-4 flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] shadow-[0_0_15px_rgba(245,158,11,0.2)]" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
              XAU
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-bold leading-none tracking-tight" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
                  Gold Market Replay
                </h1>
                <div className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-[--bg-elevated] text-[--text-tertiary] border border-[--border]">Simulator Mode</div>
              </div>
              <div className="text-[12px] font-medium mt-1" style={{ color: "var(--text-tertiary)" }}>
                Historical tick playback with mapped risk execution.
              </div>
            </div>
          </div>

          <div className="h-10 border-l pl-6 flex items-center gap-4 hidden md:flex" style={{ borderColor: "var(--border)" }}>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-1">Balance</div>
              <div className="font-mono text-[16px] font-bold text-[--text-primary]">${balance.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-1">Floating</div>
              <div className={`font-mono text-[16px] font-bold ${floatingPnL >= 0 ? "text-[--profit]" : "text-[--loss]"}`}>
                {floatingPnL >= 0 ? "+" : ""}${floatingPnL.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-1">Equity</div>
              <div className="font-mono text-[16px] font-bold text-[#3b82f6]">${equity.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Trade Execution Controls */}
        <div className="flex items-center gap-3 backdrop-blur-sm bg-[--bg-base] p-1.5 rounded-xl border" style={{ borderColor: "var(--border-strong)" }}>
          <div className="flex items-center px-3 border-r" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] font-bold uppercase mr-2" style={{ color: "var(--text-tertiary)" }}>LOT</span>
            <button onClick={() => setLotSize((p) => Math.max(0.1, +(p - 0.1).toFixed(2)))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[--bg-card] text-[12px] font-bold text-[--text-secondary]">-</button>
            <input type="number" step="0.1" value={lotSize} onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.1)} className="w-12 bg-transparent text-center text-[13px] font-mono font-bold mx-1 outline-none text-[--text-primary] no-spinners" />
            <button onClick={() => setLotSize((p) => +(p + 0.1).toFixed(2))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[--bg-card] text-[12px] font-bold text-[--text-secondary]">+</button>
          </div>
          <CustomButton variant="danger" onClick={() => executeTrade('SELL')} className="px-5 shadow-lg shadow-red-500/10">SELL</CustomButton>
          <CustomButton variant="success" onClick={() => executeTrade('BUY')} className="px-5 shadow-lg shadow-teal-500/10">BUY</CustomButton>
        </div>
      </div>

      {riskWarning && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full border bg-red-500/10 border-red-500/30 text-red-500 text-[12px] font-bold flex items-center gap-2 shadow-2xl animate-in slide-in-from-top-4 fade-in">
          <AlertTriangle className="w-4 h-4" /> {riskWarning}
        </div>
      )}

      {/* ── MIDDLE: Chart & Active Positions ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Chart Viewport */}
        <div className="flex-1 relative bg-[#0a0a0f] border-r border-[--border]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visibleData} margin={{ top: 20, right: 60, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="goldVibes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-tertiary)" }} tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: "var(--text-tertiary)", fontFamily: "monospace" }} tickLine={false} axisLine={false} orientation="right" />
              <Tooltip 
                contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }}
                itemStyle={{ color: "var(--text-primary)", fontWeight: "bold" }}
                formatter={(val: number) => [val.toFixed(2), "Price"]}
              />
              <Area type="stepAfter" dataKey="price" stroke="#f59e0b" strokeWidth={2} fill="url(#goldVibes)" isAnimationActive={false} />

              {/* Render Position Lines */}
              {positions.map(pos => (
                <ReferenceLine 
                  key={pos.id} 
                  y={pos.entry} 
                  stroke={pos.type === 'BUY' ? "var(--bull)" : "var(--bear)"} 
                  strokeDasharray="4 4" 
                  label={{ position: 'left', value: `${pos.type} ${pos.lots}L @ ${pos.entry.toFixed(2)}`, fill: pos.type === 'BUY' ? "var(--bull)" : "var(--bear)", fontSize: 10, fontWeight: "bold" }}
                />
              ))}
              
              {/* Current Price Line */}
              <ReferenceLine y={currentPrice} stroke="rgba(255,255,255,0.2)" strokeDasharray="5 5" label={{ position: 'right', value: currentPrice.toFixed(2), fill: "#fff", fontSize: 11, fontWeight: "bold" }} />

            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right Sidebar: Active Positions */}
        <div className="w-72 flex-shrink-0 bg-[--bg-card] flex flex-col">
          <div className="p-4 border-b border-[--border] flex items-center gap-2">
            <Target className="w-4 h-4 text-[--text-tertiary]" />
            <h3 className="text-[13px] font-bold text-[--text-primary]">Active Simulator Trades</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {positions.length === 0 ? (
               <div className="text-center py-10 opacity-50">
                 <Crosshair className="w-10 h-10 mx-auto mb-2 text-[--text-tertiary]" />
                 <p className="text-[12px] text-[--text-secondary]">No active positions.</p>
                 <p className="text-[10px] text-[--text-tertiary] mt-1">Execute a trade to test risk management.</p>
               </div>
             ) : (
               positions.map(pos => {
                 const diff = pos.type === 'BUY' ? currentPrice - pos.entry : pos.entry - currentPrice;
                 const pnl = diff * 100 * pos.lots;
                 const isProfit = pnl >= 0;
                 return (
                   <div key={pos.id} className="p-3 rounded-xl border bg-[--bg-base]" style={{ borderColor: isProfit ? "rgba(0,212,161,0.2)" : "rgba(255,77,106,0.2)" }}>
                     <div className="flex justify-between items-start mb-2">
                       <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${pos.type === 'BUY' ? 'bg-[--bull] text-black' : 'bg-[--bear] text-white'}`}>
                         {pos.type} {pos.lots}
                       </span>
                       <button onClick={() => closePosition(pos.id)} className="text-[10px] text-[--text-secondary] hover:text-white transition-colors uppercase font-bold tracking-wider px-2 py-1 rounded bg-[--bg-elevated] border border-[--border]">Close</button>
                     </div>
                     <div className="flex justify-between items-end">
                       <div>
                         <div className="text-[10px] text-[--text-tertiary]">Entry</div>
                         <div className="text-[13px] font-mono font-bold text-[--text-primary]">{pos.entry.toFixed(2)}</div>
                       </div>
                       <div className="text-right">
                         <div className="text-[10px] text-[--text-tertiary]">P&L</div>
                         <div className={`text-[15px] font-mono font-bold ${isProfit ? "text-[--profit]" : "text-[--loss]"}`}>
                           {isProfit ? "+" : ""}${pnl.toFixed(2)}
                         </div>
                       </div>
                     </div>
                   </div>
                 )
               })
             )}
          </div>
        </div>

      </div>

      {/* ── BOTTOM HUD (Scrubber & Playback Controls) ── */}
      <div className="flex-shrink-0 h-24 border-t px-6 flex flex-col justify-center gap-3 relative z-10" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
         
         <div className="flex items-center gap-4">
           {/* Timeline Text */}
           <div className="text-[12px] font-mono font-bold text-[--text-secondary] w-24">
             {visibleData[visibleData.length - 1]?.label} / {data[data.length - 1]?.label}
           </div>

           {/* Progress Scrubber */}
           <div className="flex-1 relative h-2 bg-[--bg-base] rounded-full border border-[--border] cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  setCurrentIndex(Math.floor(pct * data.length));
                }}>
             <div className="absolute top-0 left-0 h-full bg-[--accent] rounded-full shadow-[0_0_10px_rgba(0,212,161,0.5)] transition-all ease-linear" style={{ width: `${(currentIndex / data.length) * 100}%` }} />
             {/* Readhead Thumb */}
             <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-[--accent] opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${(currentIndex / data.length) * 100}% - 8px)` }} />
           </div>

           <div className="text-[12px] font-bold text-[--text-tertiary] w-12 text-right">
             {Math.round((currentIndex / data.length) * 100)}%
           </div>
         </div>

         {/* Playback Controls Row */}
         <div className="flex items-center justify-between">
           
           <div className="flex items-center gap-2">
             <CustomButton variant="ghost" size="icon" onClick={() => setCurrentIndex(50)}><SkipBack className="w-4 h-4 text-[--text-tertiary]" /></CustomButton>
             
             <button 
               onClick={() => setIsPlaying(!isPlaying)}
               className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl"
               style={{ background: isPlaying ? "var(--bg-card)" : "var(--accent)", color: isPlaying ? "var(--text-primary)" : "#000", border: isPlaying ? "1px solid var(--border-strong)" : "none" }}
             >
               {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 pl-0.5" />}
             </button>
             
             <CustomButton variant="ghost" size="icon" onClick={() => setCurrentIndex(data.length - 1)}><SkipForward className="w-4 h-4 text-[--text-tertiary]" /></CustomButton>
           </div>

           {/* Speed Toggles */}
           <div className="flex items-center gap-1 bg-[--bg-base] p-1 rounded-xl border border-[--border]">
              {[1, 5, 20].map(s => (
                <button 
                  key={s} 
                  onClick={() => setSpeed(s)}
                  className={`px-3 py-1 text-[11px] font-bold font-mono rounded-lg transition-colors ${speed === s ? "bg-[--bg-elevated] text-[--text-primary] shadow-sm" : "text-[--text-tertiary] hover:text-[--text-secondary]"}`}
                >
                  {s}x
                </button>
              ))}
           </div>

         </div>

      </div>

    </div>
  );
}