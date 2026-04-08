import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Activity } from "lucide-react";

interface EquityCurveChartProps {
  data: Array<{ date: string; balance: number }>;
  loading?: boolean;
}

export function EquityCurveChart({ data, loading }: EquityCurveChartProps) {
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
    <div className="rounded-xl border border-[--border] bg-[--bg-card] p-5 h-full flex flex-col shadow-lg animate-fade-in relative overflow-hidden group">
      {/* Background glow behind chart */}
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-[--bull]/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-[--bull]/10 transition-colors" />

      {/* Header Stats */}
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <TrendingUp className="w-4 h-4 text-[--bull]" />
             <h2 className="text-sm font-bold uppercase tracking-widest text-white">Equity Curve</h2>
          </div>
          <p className="text-[10px] text-[--text-tertiary] flex gap-3">
             <span>Last {data.length} trades</span>
             <span className="text-white/30">|</span>
             <span>Max: <span className="font-mono text-white/60">${maxBalance.toFixed(0)}</span></span>
             <span className="text-white/30">|</span>
             <span>Min: <span className="font-mono text-white/60">${minBalance.toFixed(0)}</span></span>
          </p>
        </div>
        
        {data.length > 0 && (
          <div className={`flex flex-col items-end px-3 py-1.5 rounded-lg border ${change >= 0 ? "bg-[--bull]/10 border-[--bull]/20" : "bg-[--bear]/10 border-[--bear]/20"}`}>
            <span className={`text-[10px] uppercase font-bold tracking-widest ${change >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
              Net Change
            </span>
            <span className={`text-md font-bold font-mono ${change >= 0 ? "text-[--bull]" : "text-[--bear]"}`}>
              {change >= 0 ? "+" : "-"}${Math.abs(change).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="flex-1 w-full h-[250px] relative z-10" style={{ minHeight: "250px" }}>
        {data.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
            <span className="text-[30px] mb-2 opacity-50">📉</span>
            <p className="text-xs uppercase tracking-widest font-bold">No equity data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00dc82" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00dc82" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }}
                tickFormatter={(val) => {
                  // Format 'MM/DD' from string 'MM/DD/YYYY'
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
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="#00dc82" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#equityGradient)" 
                activeDot={{ r: 5, strokeWidth: 0, fill: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
