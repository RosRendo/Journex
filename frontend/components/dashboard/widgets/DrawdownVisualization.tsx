import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TradeData } from "@/hooks/useCsvTrades";

interface Props {
  trades: TradeData[];
}

export function DrawdownVisualization({ trades }: Props) {
  const underwaterData = useMemo(() => {
    let peak = 0;
    let balance = 0;
    
    // Sort trades chronologically
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sorted.map(t => {
      balance += t.profit;
      peak = Math.max(peak, balance);
      // To prevent division by zero or weird results if peak is 0 or negative
      const drawdownValue = peak > 0 ? ((peak - balance) / peak) * 100 : (balance < 0 ? Math.abs(balance) : 0);
      
      return {
        date: new Date(t.date).toLocaleDateString(),
        drawdown: Math.max(0, drawdownValue),
        peak,
        balance
      };
    });
  }, [trades]);

  const maxDrawdown = useMemo(() => {
    if (!underwaterData.length) return 0;
    return Math.max(...underwaterData.map(d => d.drawdown));
  }, [underwaterData]);

  const currentDrawdown = useMemo(() => {
    if (!underwaterData.length) return 0;
    return underwaterData[underwaterData.length - 1].drawdown;
  }, [underwaterData]);

  if (!trades.length) {
    return (
      <div className="w-full bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg p-5 flex items-center justify-center min-h-[300px]">
        <p className="text-gray-500 text-sm">Not enough data for drawdown visualization</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0c0c0d]/90 border border-white/5 rounded-xl shadow-lg p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
           <h3 className="text-sm font-bold uppercase tracking-widest text-white">Drawdown Analysis</h3>
           <p className="text-[10px] text-gray-400 mt-1">Underwater Plot</p>
        </div>
        <div className="flex gap-4">
           <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Max DD</span>
              <span className="text-sm font-bold font-mono text-white">{maxDrawdown.toFixed(2)}%</span>
           </div>
           <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Current DD</span>
              <span className={`text-sm font-bold font-mono ${currentDrawdown > 5 ? 'text-red-400' : 'text-gray-300'}`}>{currentDrawdown.toFixed(2)}%</span>
           </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={underwaterData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis tickFormatter={(val) => `${val}%`} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} reversed={true} domain={[0, 'auto']} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0c0c0d', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#ef4444', fontWeight: 'bold' }}
              labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
              formatter={(val: number) => [`${val.toFixed(2)}%`, 'Drawdown']}
            />
            <Area 
              type="monotone" 
              dataKey="drawdown" 
              stroke="#ef4444" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorDrawdown)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
