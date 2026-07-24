import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Activity } from "lucide-react";
import { useCsvTrades } from "@/hooks/useCsvTrades";

interface EquityCurveChartProps {
  data?: Array<{ date: string; balance: number }>;
  loading?: boolean;
}

export function EquityCurveChart({ data: externalData, loading: externalLoading }: EquityCurveChartProps = {}) {
  const { trades, loading: tradesLoading } = useCsvTrades();
  
  const data = useMemo(() => {
    if (externalData) return externalData;
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    return sorted.slice(-30).map((t) => {
      balance += t.profit;
      return {
        date: new Date(t.date).toLocaleDateString(),
        balance: Math.round(balance * 100) / 100,
      };
    });
  }, [externalData, trades]);

  const loading = externalLoading ?? tradesLoading;

  const { maxBalance, minBalance, latestBalance, startBalance } = useMemo(() => {
    if (!data || data.length === 0) return { maxBalance: 0, minBalance: 0, latestBalance: 0, startBalance: 0 };
    const balances = data.map(d => d.balance);
    return {
      maxBalance: Math.max(...balances),
      minBalance: Math.min(...balances),
      latestBalance: balances[balances.length - 1],
      startBalance: balances[0]
    };
  }, [data]);

  const change = latestBalance - startBalance;
  const changePercent = startBalance !== 0 ? (change / startBalance) * 100 : 0;
  
  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0c0c0d] border border-white/10 rounded-lg p-3 shadow-xl backdrop-blur-md">
          <p className="text-[10px] text-gray-400 font-mono mb-1">{label}</p>
          <p className="text-sm font-bold text-white font-mono">
            ${payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading && data.length === 0) {
    return (
      <div className="rounded-xl border border-[--border] bg-[--bg-card] p-4 h-[350px] flex items-center justify-center animate-pulse">
        <Activity className="w-8 h-8 text-white/20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[--border] bg-[#050505] p-6 h-full flex flex-col shadow-2xl animate-fade-in relative overflow-hidden group">
      {/* Dynamic Background glow behind chart */}
      <div className={`absolute bottom-0 right-0 w-[300px] h-[300px] blur-[100px] rounded-full pointer-events-none transition-colors duration-1000 ${
        change >= 0 ? 'bg-[--bull]/5 group-hover:bg-[--bull]/10' : 'bg-[--bear]/5 group-hover:bg-[--bear]/10'
      }`} />

      {/* Header Stats */}
      <div className="flex items-start justify-between mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <TrendingUp className={`w-4 h-4 ${change >= 0 ? "text-[--bull]" : "text-[--bear]"}`} />
             <h2 className="text-xs font-bold uppercase tracking-widest text-gray-200">Equity Curve</h2>
          </div>
          <p className="text-[10px] text-[--text-tertiary] flex gap-3 font-mono">
             <span>Last {data.length} trades</span>
             <span className="text-white/20">|</span>
             <span>Max: <span className="text-white/60">${maxBalance.toFixed(0)}</span></span>
             <span className="text-white/20">|</span>
             <span>Min: <span className="text-white/60">${minBalance.toFixed(0)}</span></span>
          </p>
        </div>
        
        {data.length > 0 && (
          <div className={`flex flex-col items-end px-4 py-2 rounded-xl border ${
            change >= 0 
              ? "bg-[--bull]/10 border-[--bull]/20 shadow-[0_0_15px_rgba(0,220,130,0.1)]" 
              : "bg-[--bear]/10 border-[--bear]/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
          }`}>
            <span className={`text-[9px] uppercase font-black tracking-widest ${change >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
              Net Change
            </span>
            <span className={`text-xl font-bold font-mono tracking-tight mt-0.5 ${change >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
              {change >= 0 ? "+" : "-"}${Math.abs(change).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="flex-1 w-full h-[250px] relative z-10" style={{ minHeight: "250px" }}>
        {data.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center px-4 relative">
             {/* Premium Wireframe Chart Empty State */}
             <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none opacity-[0.03]">
               <svg viewBox="0 0 100 50" className="w-[80%] h-[60%] preserve-3d" preserveAspectRatio="none">
                 <path d="M0,50 Q20,40 40,30 T80,20 T100,5" fill="none" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                 <path d="M0,50 Q20,40 40,30 T80,20 T100,5 L100,50 L0,50 Z" fill="white" opacity="0.5" />
               </svg>
             </div>
             <Activity className="w-8 h-8 mb-4 text-gray-600" />
             <p className="text-xs uppercase tracking-widest font-bold text-gray-300">Awaiting Equity Data</p>
             <p className="text-[10px] mt-2 text-gray-500 max-w-[250px] leading-relaxed">
               Execute trades in the terminal or sync your MT5 account to visualize your equity growth over time.
             </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGradientBull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00dc82" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00dc82" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="equityGradientBear" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }}
                tickFormatter={(val) => {
                  try {
                    const d = new Date(val);
                    return `${d.getMonth()+1}/${d.getDate()}`;
                  } catch(e) { return val; }
                }}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }}
                tickFormatter={(val) => `$${val}`}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ stroke: change >= 0 ? 'rgba(0,220,130,0.3)' : 'rgba(239,68,68,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }} 
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke={change >= 0 ? "#00dc82" : "#ef4444"} 
                strokeWidth={3}
                fillOpacity={1} 
                fill={change >= 0 ? "url(#equityGradientBull)" : "url(#equityGradientBear)"} 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#fff', style: { filter: `drop-shadow(0 0 8px ${change >= 0 ? '#00dc82' : '#ef4444'})` } }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
