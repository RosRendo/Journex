"use client";

import { useEffect, useState } from "react";
import { Copy, Target, Crosshair, TrendingUp, TrendingDown, Clock, Activity, AlertCircle } from "lucide-react";

interface Position {
    ticket: number;
    symbol: string;
    type: number; // 0 for Buy, 1 for Sell
    volume: number;
    price_open: number;
    sl: number;
    tp: number;
    price_current: number;
    profit: number;
    time: number;
    comment: string;
    swap: number;
}

export default function PositionsPage() {
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Fetch positions from MT5 Bridge
    const fetchPositions = async () => {
        try {
            setLoading(true);
            const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003";
            const res = await fetch(`${bridgeUrl}/api/positions`, { headers: { "ngrok-skip-browser-warning": "true" } });
            if (!res.ok) throw new Error("Bridge not reachable");
            const data = await res.json();
            
            if (data.success) {
                setPositions(data.positions || []);
                setError("");
            } else {
                setError(data.error || "Failed to fetch positions");
            }
        } catch (err: any) {
            setError(err.message || "Failed to connect to MT5 bridge");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPositions();
        
        // Auto refresh every 5 seconds for live pnl
        const interval = setInterval(fetchPositions, 5000);
        return () => clearInterval(interval);
    }, []);

    const totalProfit = positions.reduce((acc, p) => acc + p.profit + p.swap, 0);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Activity className="w-8 h-8 text-blue-500" />
                        Live Positions
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Monitor your active trades executed directly on your MT5 broker.
                    </p>
                </div>
                
                {/* Global PnL Badge */}
                <div className={`px-6 py-3 rounded-xl border ${totalProfit >= 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-red-500/10 border-red-500/30 text-red-500"} shadow-lg backdrop-blur-md flex items-center gap-3`}>
                    <div>
                        <p className="text-[10px] uppercase font-bold opacity-80">Floating P/L</p>
                        <p className="text-2xl font-black tabular-nums">
                            {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                        <h4 className="font-bold">Connection Error</h4>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-lg shadow-black/20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 text-xs uppercase text-muted-foreground border-b border-border/50">
                            <tr>
                                <th className="px-6 py-4 font-medium">Ticket / Time</th>
                                <th className="px-6 py-4 font-medium">Symbol / Type</th>
                                <th className="px-6 py-4 font-medium">Volume</th>
                                <th className="px-6 py-4 font-medium text-center">Open Price</th>
                                <th className="px-6 py-4 font-medium text-center">SL / TP</th>
                                <th className="px-6 py-4 font-medium text-center">Current</th>
                                <th className="px-6 py-4 font-medium text-right">Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {loading && positions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                        <Activity className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                                        Fetching live positions...
                                    </td>
                                </tr>
                            ) : positions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
                                        No active positions found on MT5.
                                    </td>
                                </tr>
                            ) : (
                                positions.map((pos) => {
                                    const isBuy = pos.type === 0;
                                    const isProfitable = pos.profit >= 0;
                                    
                                    return (
                                        <tr key={pos.ticket} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs text-muted-foreground mb-1">#{pos.ticket}</div>
                                                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(pos.time * 1000).toLocaleString(undefined, { 
                                                        month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' 
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-foreground mb-1 flex items-center gap-2">
                                                    {pos.symbol}
                                                    {pos.comment && <span className="px-1.5 py-0.5 rounded-sm bg-blue-500/10 text-blue-400 text-[9px] uppercase">{pos.comment}</span>}
                                                </div>
                                                <div className={`flex items-center gap-1 text-xs font-semibold ${isBuy ? 'text-blue-500' : 'text-red-500'}`}>
                                                    {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {isBuy ? "BUY" : "SELL"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-medium">{pos.volume.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-center font-mono">{pos.price_open.toFixed(5)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col gap-1 items-center">
                                                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 ${pos.sl > 0 ? 'bg-red-500/10 text-red-500' : 'text-muted-foreground'}`}>
                                                        <AlertCircle className="w-3 h-3"/> {pos.sl > 0 ? pos.sl.toFixed(5) : "No SL"}
                                                    </span>
                                                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 ${pos.tp > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'text-muted-foreground'}`}>
                                                        <Target className="w-3 h-3"/> {pos.tp > 0 ? pos.tp.toFixed(5) : "No TP"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="font-mono font-bold bg-slate-900/50 py-1 px-2 rounded-md inline-block border border-border/30">
                                                    {pos.price_current.toFixed(5)}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-mono font-bold text-lg ${isProfitable ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {isProfitable ? "+" : ""}{pos.profit.toFixed(2)}
                                                {pos.swap !== 0 && (
                                                    <div className="text-[10px] text-muted-foreground font-normal">
                                                        Swap: {pos.swap.toFixed(2)}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
        </div>
    );
}
